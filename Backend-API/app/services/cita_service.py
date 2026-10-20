from datetime import date

from fastapi import HTTPException

from app import crypto
from app.deps import TenantScope
from app.models import Cita, SaveCitaInput


def _cita_from_row(row, fernet_key: str) -> Cita:
    name = crypto.decrypt_field(row["patient_name"], fernet_key) or ""
    last_name = crypto.decrypt_field(row["patient_last_name"], fernet_key) or ""
    return Cita(
        id=row["id"],
        patientID=row["patient_id"],
        patientName=f"{name} {last_name}".strip(),
        fecha=row["fecha"].isoformat(),
        hora=row["hora"].strftime("%H:%M"),
        duracionMin=row["duracion_min"],
        estado=row["estado"],
        notas=crypto.decrypt_field(row["notas"], fernet_key),
    )


_SELECT_CITA = """
    SELECT c.*, p.name AS patient_name, p.last_name AS patient_last_name
    FROM citas c
    JOIN pacientes p ON p.id = c.patient_id
"""


def _get_cita(scope: TenantScope, cita_id: int) -> Cita:
    row = scope.conn.execute(
        f"{_SELECT_CITA} WHERE c.id = %s", (cita_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "cita_no_encontrada",
                "message": "La cita no existe.",
            },
        )
    return _cita_from_row(row, scope.fernet_key)


def _ensure_patient(scope: TenantScope, patient_id: int) -> None:
    row = scope.conn.execute(
        "SELECT id FROM pacientes WHERE id = %s", (patient_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "paciente_no_encontrado",
                "message": "El paciente no existe.",
            },
        )


def _check_conflict(
    scope: TenantScope,
    fecha: date,
    hora,
    duracion_min: int,
    exclude_id: int | None = None,
) -> None:
    row = scope.conn.execute(
        """
        SELECT id FROM citas
        WHERE fecha = %s
          AND estado <> 'cancelada'
          AND id <> COALESCE(%s, -1)
          AND hora < (%s::time + make_interval(mins => %s))
          AND (hora + make_interval(mins => duracion_min)) > %s::time
        LIMIT 1
        """,
        (fecha, exclude_id, hora.isoformat(), duracion_min, hora.isoformat()),
    ).fetchone()
    if row is not None:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "horario_ocupado",
                "message": "Ya hay una cita que se solapa en ese horario.",
            },
        )


def list_citas(scope: TenantScope, desde: date, hasta: date) -> list[Cita]:
    rows = scope.conn.execute(
        f"{_SELECT_CITA} WHERE c.fecha BETWEEN %s AND %s ORDER BY c.fecha, c.hora",
        (desde, hasta),
    ).fetchall()
    return [_cita_from_row(r, scope.fernet_key) for r in rows]


def create_cita(scope: TenantScope, data: SaveCitaInput) -> Cita:
    _ensure_patient(scope, data.patientID)
    _check_conflict(scope, data.fecha, data.hora, data.duracionMin)
    with scope.conn.transaction():
        row = scope.conn.execute(
            """
            INSERT INTO citas (patient_id, fecha, hora, duracion_min, estado, notas)
            VALUES (%s, %s, %s, %s, 'pendiente', %s)
            RETURNING id
            """,
            (
                data.patientID,
                data.fecha,
                data.hora,
                data.duracionMin,
                crypto.encrypt_field(data.notas, scope.fernet_key),
            ),
        ).fetchone()
        cita_id = row["id"]
    return _get_cita(scope, cita_id)


def update_cita(scope: TenantScope, cita_id: int, data: SaveCitaInput) -> Cita:
    _get_cita(scope, cita_id)
    _ensure_patient(scope, data.patientID)
    _check_conflict(scope, data.fecha, data.hora, data.duracionMin, exclude_id=cita_id)
    with scope.conn.transaction():
        scope.conn.execute(
            """
            UPDATE citas
            SET patient_id = %s, fecha = %s, hora = %s, duracion_min = %s, notas = %s
            WHERE id = %s
            """,
            (
                data.patientID,
                data.fecha,
                data.hora,
                data.duracionMin,
                crypto.encrypt_field(data.notas, scope.fernet_key),
                cita_id,
            ),
        )
    return _get_cita(scope, cita_id)


def set_estado(scope: TenantScope, cita_id: int, estado: str) -> Cita:
    with scope.conn.transaction():
        result = scope.conn.execute(
            "UPDATE citas SET estado = %s WHERE id = %s RETURNING id",
            (estado, cita_id),
        )
        if result.fetchone() is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "cita_no_encontrada",
                    "message": "La cita no existe.",
                },
            )
    return _get_cita(scope, cita_id)


def delete_cita(scope: TenantScope, cita_id: int) -> bool:
    with scope.conn.transaction():
        result = scope.conn.execute("DELETE FROM citas WHERE id = %s", (cita_id,))
        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "cita_no_encontrada",
                    "message": "La cita no existe.",
                },
            )
    return True
