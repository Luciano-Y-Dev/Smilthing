from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import date, timedelta

import psycopg
from psycopg.rows import dict_row

from app import crypto, db
from app.config import get_settings


def create_clinic(nombre: str) -> int:
    settings = get_settings()
    trial_expires = date.today() + timedelta(days=settings.trial_dias)
    with db.admin_connection() as conn:
        with conn.transaction():
            row = conn.execute(
                """
                INSERT INTO clinicas (nombre, estado, trial_expires)
                VALUES (%s, 'trial', %s)
                RETURNING id
                """,
                (nombre, trial_expires),
            ).fetchone()
        clinica_id = row["id"]
    try:
        db.create_tenant_database(clinica_id)
        with get_tenant_db(clinica_id) as conn:
            db.init_tenant_schema(conn)
    except Exception:
        with db.admin_connection() as conn:
            with conn.transaction():
                conn.execute("DELETE FROM clinicas WHERE id = %s", (clinica_id,))
        raise
    return clinica_id


@contextmanager
def get_tenant_db(clinica_id: int) -> Iterator[psycopg.Connection]:
    with psycopg.connect(db.tenant_db_url(clinica_id), row_factory=dict_row) as conn:
        yield conn


def get_clinica(clinica_id: int) -> dict | None:
    with db.admin_connection() as conn:
        return conn.execute(
            """
            SELECT id, nombre, estado, trial_expires, created_at, logo_url, color_primary
            FROM clinicas WHERE id = %s
            """,
            (clinica_id,),
        ).fetchone()


def get_clinica_fernet_key(clinica_id: int) -> str:
    settings = get_settings()
    return crypto.derive_clinic_key(settings.fernet_master_key, clinica_id)


def count_patients(clinica_id: int) -> int:
    with get_tenant_db(clinica_id) as conn:
        row = conn.execute("SELECT COUNT(*) AS n FROM pacientes").fetchone()
    return row["n"]


def count_patients_many(clinica_ids: list[int]) -> dict[int, int]:
    if not clinica_ids:
        return {}

    def _one(cid: int) -> tuple[int, int]:
        try:
            return cid, count_patients(cid)
        except Exception:
            return cid, 0

    with ThreadPoolExecutor(max_workers=min(16, len(clinica_ids))) as pool:
        return dict(pool.map(_one, clinica_ids))
