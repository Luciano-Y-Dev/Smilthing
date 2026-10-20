from datetime import date, timedelta

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile

from app import auth, db, superauth, tenancy
from app.config import get_media_dir
from app.models import (
    AdminClinicaCreate,
    AdminClinicaUpdate,
    AdminPago,
    AdminPagoInput,
    ClinicaAdminRow,
    EstadisticasAdmin,
    LoginInput,
    LogoInfo,
    SuperInfo,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

LOGO_MAX_BYTES = 2 * 1024 * 1024


def _detect_image_ext(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


@router.post("/login", response_model=SuperInfo)
def login(
    input: LoginInput, request: Request, response: Response
) -> SuperInfo:
    return superauth.super_login(input.email, input.password, request, response)


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    return superauth.super_logout(response)


@router.get("/me", response_model=SuperInfo)
def me(request: Request) -> SuperInfo:
    return superauth.super_me(request)


@router.get(
    "/clinicas",
    response_model=list[ClinicaAdminRow],
    dependencies=[superauth.SuperAdminDep],
)
def list_clinicas() -> list[ClinicaAdminRow]:
    with db.admin_connection() as conn:
        rows = conn.execute(
            """
            SELECT c.id, c.nombre, c.estado, c.trial_expires, c.created_at,
                   c.logo_url, c.color_primary,
                   (SELECT u.email FROM usuarios u WHERE u.clinica_id = c.id ORDER BY u.id LIMIT 1) AS email_admin,
                   (SELECT COALESCE(SUM(p.monto), 0) FROM pagos_clinicas p WHERE p.clinica_id = c.id) AS total_pagado,
                   (SELECT MAX(p.fecha) FROM pagos_clinicas p WHERE p.clinica_id = c.id) AS ultimo_pago
            FROM clinicas c ORDER BY c.id
            """
        ).fetchall()
    counts = tenancy.count_patients_many([r["id"] for r in rows])
    result = []
    for r in rows:
        result.append(
            ClinicaAdminRow(
                id=r["id"],
                nombre=r["nombre"],
                estado=r["estado"],
                trial_expires=r["trial_expires"].isoformat() if r["trial_expires"] else None,
                created_at=r["created_at"].isoformat(),
                email_admin=r["email_admin"],
                pacientes=counts.get(r["id"], 0),
                total_pagado=float(r["total_pagado"]),
                ultimo_pago=r["ultimo_pago"].isoformat() if r["ultimo_pago"] else None,
                logo_url=r["logo_url"],
                color_primary=r["color_primary"],
            )
        )
    return result


@router.post(
    "/clinicas",
    response_model=ClinicaAdminRow,
    dependencies=[superauth.SuperAdminDep],
)
def create_clinica(input: AdminClinicaCreate) -> ClinicaAdminRow:
    ctx = auth.create_clinic_with_admin(
        input.nombre.strip(), input.email.strip(), input.password
    )
    if input.dias_trial is not None:
        new_expiry = date.today() + timedelta(days=input.dias_trial)
        with db.admin_connection() as conn:
            conn.execute(
                "UPDATE clinicas SET trial_expires = %s WHERE id = %s",
                (new_expiry, ctx.clinica_id),
            )
        trial_expires = new_expiry
    else:
        trial_expires = (
            date.fromisoformat(ctx.clinica.trial_expires)
            if ctx.clinica.trial_expires
            else None
        )
    if input.color_primary is not None:
        with db.admin_connection() as conn:
            conn.execute(
                "UPDATE clinicas SET color_primary = %s WHERE id = %s",
                (input.color_primary, ctx.clinica_id),
            )
    return ClinicaAdminRow(
        id=ctx.clinica_id,
        nombre=ctx.clinica.nombre,
        estado=ctx.clinica.estado,
        trial_expires=trial_expires.isoformat() if trial_expires else None,
        created_at="",
        email_admin=ctx.email,
        pacientes=0,
        total_pagado=0.0,
        ultimo_pago=None,
        logo_url=None,
        color_primary=input.color_primary,
    )


@router.patch(
    "/clinicas/{clinica_id}",
    dependencies=[superauth.SuperAdminDep],
)
def update_clinica(clinica_id: int, input: AdminClinicaUpdate) -> dict[str, bool]:
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT estado, trial_expires FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "clinica_no_encontrada", "message": "La clínica no existe."},
            )
        if input.nombre is not None:
            conn.execute(
                "UPDATE clinicas SET nombre = %s WHERE id = %s",
                (input.nombre.strip(), clinica_id),
            )
        if input.email is not None or input.password is not None:
            user = conn.execute(
                "SELECT id FROM usuarios WHERE clinica_id = %s ORDER BY id LIMIT 1",
                (clinica_id,),
            ).fetchone()
            if user is not None:
                if input.email is not None:
                    new_email = input.email.strip().lower()
                    taken = conn.execute(
                        "SELECT id FROM usuarios WHERE email = %s AND id != %s",
                        (new_email, user["id"]),
                    ).fetchone()
                    if taken is not None:
                        raise HTTPException(
                            status_code=409,
                            detail={
                                "code": "email_ya_en_uso",
                                "message": "Ya existe otra cuenta con ese correo.",
                            },
                        )
                    conn.execute(
                        "UPDATE usuarios SET email = %s WHERE id = %s",
                        (new_email, user["id"]),
                    )
                if input.password is not None:
                    conn.execute(
                        "UPDATE usuarios SET password_hash = %s, must_change_password = TRUE, session_version = session_version + 1 WHERE id = %s",
                        (auth.hash_password(input.password), user["id"]),
                    )
        if input.estado == "suspendido":
            conn.execute(
                "UPDATE clinicas SET estado = 'suspendido' WHERE id = %s", (clinica_id,)
            )
        elif input.estado == "activo":
            conn.execute(
                "UPDATE clinicas SET estado = 'activo' WHERE id = %s", (clinica_id,)
            )
        elif input.estado == "gratis":
            conn.execute(
                "UPDATE clinicas SET estado = 'gratis', trial_expires = NULL WHERE id = %s",
                (clinica_id,),
            )
        elif input.estado == "trial":
            dias = input.dias_trial or 30
            base = row["trial_expires"] or date.today()
            if base < date.today():
                base = date.today()
            new_expiry = base + timedelta(days=dias)
            conn.execute(
                "UPDATE clinicas SET estado = 'trial', trial_expires = %s WHERE id = %s",
                (new_expiry, clinica_id),
            )
        elif input.dias_trial is not None:
            base = row["trial_expires"] or date.today()
            if base < date.today():
                base = date.today()
            new_expiry = base + timedelta(days=input.dias_trial)
            conn.execute(
                "UPDATE clinicas SET trial_expires = %s WHERE id = %s",
                (new_expiry, clinica_id),
            )
        if input.color_primary is not None:
            conn.execute(
                "UPDATE clinicas SET color_primary = %s WHERE id = %s",
                (input.color_primary, clinica_id),
            )
    return {"ok": True}


@router.delete(
    "/clinicas/{clinica_id}",
    dependencies=[superauth.SuperAdminDep],
)
def delete_clinica(clinica_id: int) -> dict[str, bool]:
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT id FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "clinica_no_encontrada", "message": "La clínica no existe."},
        )
    with psycopg.connect(
        db.tenant_db_url_from_name("postgres"), autocommit=True
    ) as admin:
        admin.execute(f'DROP DATABASE IF EXISTS "{db.tenant_db_name(clinica_id)}"')
    with db.admin_connection() as conn:
        conn.execute("DELETE FROM clinicas WHERE id = %s", (clinica_id,))
    return {"ok": True}


@router.post(
    "/clinicas/{clinica_id}/logo",
    response_model=LogoInfo,
    dependencies=[superauth.SuperAdminDep],
)
def upload_logo(clinica_id: int, file: UploadFile) -> LogoInfo:
    with db.admin_connection() as conn:
        exists = conn.execute(
            "SELECT id FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "clinica_no_encontrada", "message": "La clínica no existe."},
            )
    data = file.file.read(LOGO_MAX_BYTES + 1)
    if len(data) > LOGO_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail={"code": "archivo_grande", "message": "El archivo supera los 2 MB."},
        )
    ext = _detect_image_ext(data)
    if ext is None:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "tipo_no_soportado",
                "message": "Formato no soportado. Use PNG, JPG o WebP.",
            },
        )
    logos_dir = get_media_dir() / "logos"
    logos_dir.mkdir(parents=True, exist_ok=True)
    for old in logos_dir.glob(f"{clinica_id}.*"):
        old.unlink()
    (logos_dir / f"{clinica_id}.{ext}").write_bytes(data)
    url = f"/api/clinicas/{clinica_id}/logo"
    with db.admin_connection() as conn:
        conn.execute(
            "UPDATE clinicas SET logo_url = %s WHERE id = %s", (url, clinica_id)
        )
    return LogoInfo(url=url)


@router.delete(
    "/clinicas/{clinica_id}/logo",
    dependencies=[superauth.SuperAdminDep],
)
def delete_logo(clinica_id: int) -> dict[str, bool]:
    with db.admin_connection() as conn:
        exists = conn.execute(
            "SELECT id FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "clinica_no_encontrada", "message": "La clínica no existe."},
            )
    logos_dir = get_media_dir() / "logos"
    if logos_dir.exists():
        for old in logos_dir.glob(f"{clinica_id}.*"):
            old.unlink()
    with db.admin_connection() as conn:
        conn.execute(
            "UPDATE clinicas SET logo_url = NULL WHERE id = %s", (clinica_id,)
        )
    return {"ok": True}


@router.get(
    "/clinicas/{clinica_id}/pagos",
    response_model=list[AdminPago],
    dependencies=[superauth.SuperAdminDep],
)
def list_pagos(clinica_id: int) -> list[AdminPago]:
    with db.admin_connection() as conn:
        exists = conn.execute(
            "SELECT id FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "clinica_no_encontrada", "message": "La clínica no existe."},
            )
        rows = conn.execute(
            "SELECT * FROM pagos_clinicas WHERE clinica_id = %s ORDER BY fecha DESC, id DESC",
            (clinica_id,),
        ).fetchall()
    return [_pago_from_row(r) for r in rows]


@router.post(
    "/clinicas/{clinica_id}/pagos",
    response_model=AdminPago,
    dependencies=[superauth.SuperAdminDep],
)
def create_pago(clinica_id: int, input: AdminPagoInput) -> AdminPago:
    with db.admin_connection() as conn:
        exists = conn.execute(
            "SELECT id FROM clinicas WHERE id = %s", (clinica_id,)
        ).fetchone()
        if exists is None:
            raise HTTPException(
                status_code=404,
                detail={"code": "clinica_no_encontrada", "message": "La clínica no existe."},
            )
        row = conn.execute(
            """
            INSERT INTO pagos_clinicas (clinica_id, monto, fecha, periodo_desde, periodo_hasta, referencia, notas)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                clinica_id,
                input.monto,
                input.fecha,
                input.periodo_desde,
                input.periodo_hasta,
                input.referencia,
                input.notas,
            ),
        ).fetchone()
    return _pago_from_row(row)


@router.delete(
    "/pagos/{pago_id}",
    dependencies=[superauth.SuperAdminDep],
)
def delete_pago(pago_id: int) -> dict[str, bool]:
    with db.admin_connection() as conn:
        result = conn.execute(
            "DELETE FROM pagos_clinicas WHERE id = %s", (pago_id,)
        )
    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail={"code": "pago_no_encontrado", "message": "El pago no existe."},
        )
    return {"ok": True}


@router.get(
    "/estadisticas",
    response_model=EstadisticasAdmin,
    dependencies=[superauth.SuperAdminDep],
)
def estadisticas() -> EstadisticasAdmin:
    with db.admin_connection() as conn:
        counts = conn.execute(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE estado IN ('activo', 'gratis')) AS activas,
                COUNT(*) FILTER (WHERE estado = 'trial') AS trial,
                COUNT(*) FILTER (WHERE estado = 'suspendido') AS suspendidas,
                COUNT(*) FILTER (
                    WHERE estado = 'trial'
                      AND trial_expires IS NOT NULL
                      AND trial_expires <= CURRENT_DATE + INTERVAL '7 days'
                ) AS trials_por_vencer
            FROM clinicas
            """
        ).fetchone()
        ingresos = conn.execute(
            """
            SELECT COALESCE(SUM(monto), 0) AS total
            FROM pagos_clinicas
            WHERE fecha >= date_trunc('month', CURRENT_DATE)::date
            """
        ).fetchone()
        ids = [r["id"] for r in conn.execute("SELECT id FROM clinicas").fetchall()]
    counts_by_id = tenancy.count_patients_many(ids)
    pacientes_total = sum(counts_by_id.values())
    return EstadisticasAdmin(
        clinicas_total=counts["total"],
        activas=counts["activas"],
        trial=counts["trial"],
        suspendidas=counts["suspendidas"],
        pacientes_total=pacientes_total,
        ingresos_mes=float(ingresos["total"]),
        trials_por_vencer=counts["trials_por_vencer"],
    )


def _pago_from_row(r: dict) -> AdminPago:
    return AdminPago(
        id=r["id"],
        clinica_id=r["clinica_id"],
        monto=float(r["monto"]),
        fecha=r["fecha"].isoformat(),
        periodo_desde=r["periodo_desde"].isoformat() if r["periodo_desde"] else None,
        periodo_hasta=r["periodo_hasta"].isoformat() if r["periodo_hasta"] else None,
        referencia=r["referencia"],
        notas=r["notas"],
    )
