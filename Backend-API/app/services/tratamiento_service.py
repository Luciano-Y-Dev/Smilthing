from fastapi import HTTPException

from app import crypto
from app.deps import TenantScope
from app.models import SaveTreatmentInput, Treatment
from app.services.patient_service import _treatment_from_row


def _validate_text(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "texto_obligatorio",
                "message": "El texto del tratamiento es obligatorio.",
            },
        )
    return stripped


def list_tratamientos(scope: TenantScope, patient_id: int) -> list[Treatment]:
    rows = scope.conn.execute(
        "SELECT * FROM tratamiento WHERE patient_id = %s ORDER BY date DESC NULLS LAST, id DESC",
        (patient_id,),
    ).fetchall()
    return [_treatment_from_row(r, scope.fernet_key) for r in rows]


def add_tratamiento(
    scope: TenantScope, patient_id: int, data: SaveTreatmentInput
) -> Treatment:
    text = crypto.encrypt_field(_validate_text(data.diagnosis), scope.fernet_key)
    with scope.conn.transaction():
        row = scope.conn.execute(
            """
            INSERT INTO tratamiento (patient_id, diagnosis, treatment_plan, date)
            VALUES (%s, %s, '', %s)
            RETURNING *
            """,
            (patient_id, text, data.date.isoformat()),
        ).fetchone()
    return _treatment_from_row(row, scope.fernet_key)


def update_tratamiento(
    scope: TenantScope, patient_id: int, tratamiento_id: int, data: SaveTreatmentInput
) -> Treatment:
    text = crypto.encrypt_field(_validate_text(data.diagnosis), scope.fernet_key)
    with scope.conn.transaction():
        row = scope.conn.execute(
            """
            UPDATE tratamiento
            SET diagnosis = %s, treatment_plan = '', date = %s
            WHERE id = %s AND patient_id = %s
            RETURNING *
            """,
            (text, data.date.isoformat(), tratamiento_id, patient_id),
        ).fetchone()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "tratamiento_no_encontrado",
                "message": "El tratamiento no existe.",
            },
        )
    return _treatment_from_row(row, scope.fernet_key)


def delete_tratamiento(
    scope: TenantScope, patient_id: int, tratamiento_id: int
) -> bool:
    with scope.conn.transaction():
        result = scope.conn.execute(
            "DELETE FROM tratamiento WHERE id = %s AND patient_id = %s",
            (tratamiento_id, patient_id),
        )
    return result.rowcount > 0
