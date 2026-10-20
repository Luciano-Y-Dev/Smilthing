import json
import os
import secrets
import subprocess
import tempfile
import zipfile
from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import psycopg
from fastapi import HTTPException
from psycopg.rows import dict_row

from app import db, tenancy
from app.config import get_settings
from app.deps import TenantScope

DUMP_SUFFIX = ".dump"
META_FILENAME = "meta.json"
MAX_BACKUP_BYTES = 50 * 1024 * 1024

_RESTORE_ROLE_PREFIX = "restore_tenant_"

_EXPECTED_TENANT_TABLES = {
    "pacientes",
    "antecedentes_personales",
    "examen_fisico",
    "odontograms",
    "odontogram_details",
    "tratamiento",
    "abonos",
    "citas",
}


def _tool(name: str) -> str:
    settings = get_settings()
    if settings.postgres_bin_dir:
        return str(Path(settings.postgres_bin_dir) / name)
    return name


def _run(args: list[str], env: dict | None = None) -> None:
    process_env = os.environ.copy()
    if env:
        process_env.update(env)
    result = subprocess.run(
        args, capture_output=True, env=process_env, shell=False
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        raise RuntimeError(f"{args[0]} falló: {stderr.strip()}")


def _pg_dump(database_url: str, output_path: str) -> None:
    _run(
        [
            _tool("pg_dump"),
            "--no-owner",
            "--no-privileges",
            "-Fc",
            "-f",
            output_path,
            database_url,
        ]
    )


def create_backup_zip(scope: TenantScope) -> bytes:
    db_name = db.tenant_db_name(scope.ctx.clinica_id)
    meta = {
        "clinica_id": scope.ctx.clinica_id,
        "nombre": scope.ctx.clinica.nombre,
    }
    with tempfile.TemporaryDirectory() as tmp:
        dump_path = os.path.join(tmp, f"{db_name}{DUMP_SUFFIX}")
        _pg_dump(db.tenant_db_url(scope.ctx.clinica_id), dump_path)
        buffer = BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(dump_path, arcname=f"{db_name}{DUMP_SUFFIX}")
            zf.writestr(META_FILENAME, json.dumps(meta, ensure_ascii=False))
        return buffer.getvalue()


def _parse_zip(content: bytes, clinica_id: int) -> dict:
    db_name = db.tenant_db_name(clinica_id)
    try:
        with zipfile.ZipFile(BytesIO(content), "r") as zf:
            names = zf.namelist()
            if META_FILENAME not in names:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "backup_invalido", "message": "Falta meta.json en el respaldo."},
                )
            dump_name = f"{db_name}{DUMP_SUFFIX}"
            if dump_name not in names:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "backup_invalido",
                        "message": f"Falta el archivo {dump_name} en el respaldo.",
                    },
                )
            meta = json.loads(zf.read(META_FILENAME).decode("utf-8"))
            if meta.get("clinica_id") != clinica_id:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "backup_otra_clinica",
                        "message": "El respaldo pertenece a otra clínica.",
                    },
                )
    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=400,
            detail={"code": "backup_invalido", "message": "El archivo no es un ZIP válido."},
        )
    return meta


def _restore_scratch_name(clinica_id: int) -> str:
    return f"{db.tenant_db_name(clinica_id)}_restore"


def _ensure_restore_role(role: str, password: str) -> None:
    with psycopg.connect(
        get_settings().database_url_admin, row_factory=dict_row, autocommit=True
    ) as conn:
        row = conn.execute(
            "SELECT 1 FROM pg_roles WHERE rolname = %s", (role,)
        ).fetchone()
        if row is None:
            conn.execute(f'CREATE ROLE "{role}" LOGIN PASSWORD %s', (password,))
        else:
            conn.execute(f'ALTER ROLE "{role}" WITH LOGIN PASSWORD %s', (password,))


def _role_db_url(role: str, db_name: str, password: str | None = None) -> str:
    parts = urlsplit(get_settings().database_url_admin)
    auth = role if password is None else f"{role}:{password}"
    netloc = f"{auth}@{parts.hostname or 'localhost'}"
    if parts.port:
        netloc += f":{parts.port}"
    return urlunsplit((parts.scheme, netloc, db_name, parts.query, ""))


def _validate_restored_schema(clinica_id: int) -> None:
    scratch = _restore_scratch_name(clinica_id)
    with psycopg.connect(
        db.tenant_db_url_from_name(scratch), row_factory=dict_row
    ) as conn:
        tables = {
            r["tablename"]
            for r in conn.execute(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            ).fetchall()
        }
        missing = _EXPECTED_TENANT_TABLES - tables
        extra = tables - _EXPECTED_TENANT_TABLES - {"schema_version"}
        counts = conn.execute(
            """
            SELECT
                (SELECT count(*) FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public') AS funciones,
                (SELECT count(*) FROM pg_trigger t
                 JOIN pg_class c ON c.oid = t.tgrelid
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                 WHERE n.nspname = 'public' AND NOT t.tgisinternal) AS triggers,
                (SELECT count(*) FROM pg_views WHERE schemaname = 'public') AS vistas,
                (SELECT count(*) FROM pg_extension WHERE extname <> 'plpgsql') AS extensiones
            """
        ).fetchone()
    if (
        missing
        or extra
        or counts["funciones"]
        or counts["triggers"]
        or counts["vistas"]
        or counts["extensiones"]
    ):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "backup_contenido_rechazado",
                "message": "El respaldo contiene objetos no permitidos.",
            },
        )


def restore_backup(scope: TenantScope, content: bytes) -> dict[str, bool]:
    meta = _parse_zip(content, scope.ctx.clinica_id)
    clinica_id = scope.ctx.clinica_id
    db_name = db.tenant_db_name(clinica_id)
    scratch = _restore_scratch_name(clinica_id)
    role = f"{_RESTORE_ROLE_PREFIX}{clinica_id}"
    password = secrets.token_urlsafe(32)
    with zipfile.ZipFile(BytesIO(content), "r") as zf:
        dump_bytes = zf.read(f"{db_name}{DUMP_SUFFIX}")
    with tempfile.TemporaryDirectory() as tmp:
        safety_path = os.path.join(tmp, "safety.dump")
        try:
            _pg_dump(db.tenant_db_url(clinica_id), safety_path)
        except Exception:
            pass
        dump_path = os.path.join(tmp, f"{db_name}{DUMP_SUFFIX}")
        with open(dump_path, "wb") as f:
            f.write(dump_bytes)
        try:
            _ensure_restore_role(role, password)
            with psycopg.connect(
                get_settings().database_url_admin,
                row_factory=dict_row,
                autocommit=True,
            ) as conn:
                conn.execute(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
                    (scratch,),
                )
                conn.execute(f'DROP DATABASE IF EXISTS "{scratch}"')
                conn.execute(f'CREATE DATABASE "{scratch}" OWNER "{role}"')
            try:
                _run(
                    [
                        _tool("pg_restore"),
                        "--no-owner",
                        "--no-privileges",
                        "-d",
                        _role_db_url(role, scratch),
                        dump_path,
                    ],
                    env={"PGPASSWORD": password},
                )
            except RuntimeError:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "backup_invalido",
                        "message": "No se pudo restaurar el contenido del respaldo.",
                    },
                )
            _validate_restored_schema(clinica_id)
            with psycopg.connect(
                get_settings().database_url_admin,
                row_factory=dict_row,
                autocommit=True,
            ) as conn:
                conn.execute(
                    """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = %s AND pid <> pg_backend_pid()
                    """,
                    (db_name,),
                )
                conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
                conn.execute(f'ALTER DATABASE "{scratch}" RENAME TO "{db_name}"')
        except Exception:
            with psycopg.connect(
                get_settings().database_url_admin,
                row_factory=dict_row,
                autocommit=True,
            ) as conn:
                conn.execute(
                    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
                    (scratch,),
                )
                conn.execute(f'DROP DATABASE IF EXISTS "{scratch}"')
            raise
    return {"ok": True}
