from typing import NamedTuple

from fastapi import HTTPException

from app import crypto
from app.deps import TenantScope
from app.models import Payment, SavePaymentInput
from app.services.patient_service import _payment_from_row


class AbonoRow(NamedTuple):
    id: int
    date: str | None
    description: str | None
    treatment_cost: float
    amount: float
    remaining: float


def _get_abonos_asc(scope: TenantScope, patient_id: int) -> list[AbonoRow]:
    rows = scope.conn.execute(
        "SELECT * FROM abonos WHERE patient_id = %s ORDER BY id DESC", (patient_id,)
    ).fetchall()
    rows.reverse()
    return [
        AbonoRow(
            id=r["id"],
            date=r["date"],
            description=r["description"],
            treatment_cost=float(r["treatment_cost"]),
            amount=float(r["amount"]),
            remaining=float(r["remaining"]),
        )
        for r in rows
    ]


def _recalculate_chain(rows: list[AbonoRow]) -> dict[int, float]:
    prev_remaining = None
    result: dict[int, float] = {}
    for a in rows:
        base = a.treatment_cost if prev_remaining is None else prev_remaining
        new_remaining = base - a.amount
        if new_remaining < 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "saldo_negativo",
                    "message": (
                        "El cambio genera un saldo negativo en los abonos; "
                        "revisa los montos."
                    ),
                },
            )
        result[a.id] = new_remaining
        prev_remaining = new_remaining
    return result


def list_abonos(scope: TenantScope, patient_id: int) -> list[Payment]:
    rows = scope.conn.execute(
        "SELECT * FROM abonos WHERE patient_id = %s ORDER BY id DESC", (patient_id,)
    ).fetchall()
    return [_payment_from_row(r, scope.fernet_key) for r in rows]


def add_abono(
    scope: TenantScope, patient_id: int, data: SavePaymentInput
) -> Payment:
    abonos = _get_abonos_asc(scope, patient_id)
    last = abonos[-1] if abonos else None
    if last is None:
        treatment_cost = (
            data.treatmentCost if data.treatmentCost is not None else data.amount
        )
        new_remaining = treatment_cost - data.amount
    else:
        treatment_cost = last.treatment_cost
        last_remaining = last.remaining if last.remaining is not None else 0.0
        new_remaining = last_remaining - data.amount
    if new_remaining < 0:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "abono_excede_saldo",
                "message": "El abono excede el saldo pendiente.",
            },
        )
    with scope.conn.transaction():
        row = scope.conn.execute(
            """
            INSERT INTO abonos (patient_id, date, description, treatment_cost, amount, remaining)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (patient_id, data.date.isoformat(), crypto.encrypt_field(data.description, scope.fernet_key), treatment_cost, data.amount, new_remaining),
        ).fetchone()
    return _payment_from_row(row, scope.fernet_key)


def update_abono(
    scope: TenantScope, patient_id: int, abono_id: int, data: SavePaymentInput
) -> Payment:
    rows = _get_abonos_asc(scope, patient_id)
    target = next((a for a in rows if a.id == abono_id), None)
    if target is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "abono_no_encontrado", "message": "El abono no existe."},
        )
    new_rows = [
        AbonoRow(
            id=a.id,
            date=a.date,
            description=a.description,
            treatment_cost=a.treatment_cost,
            amount=data.amount,
            remaining=a.remaining,
        )
        if a.id == abono_id
        else a
        for a in rows
    ]
    remaining_map = _recalculate_chain(new_rows)
    description_enc = crypto.encrypt_field(data.description, scope.fernet_key)
    date_enc = data.date.isoformat()
    with scope.conn.transaction():
        updated_row = None
        for a in new_rows:
            row_date = date_enc if a.id == abono_id else a.date
            row_description = description_enc if a.id == abono_id else a.description
            result = scope.conn.execute(
                """
                UPDATE abonos
                SET date = %s, description = %s, treatment_cost = %s, amount = %s, remaining = %s
                WHERE id = %s AND patient_id = %s
                RETURNING *
                """,
                (
                    row_date,
                    row_description,
                    a.treatment_cost,
                    a.amount,
                    remaining_map[a.id],
                    a.id,
                    patient_id,
                ),
            ).fetchone()
            if a.id == abono_id:
                updated_row = result
    return _payment_from_row(updated_row, scope.fernet_key)


def delete_abono(scope: TenantScope, patient_id: int, abono_id: int) -> float:
    rows = _get_abonos_asc(scope, patient_id)
    if not any(a.id == abono_id for a in rows):
        raise HTTPException(
            status_code=404,
            detail={"code": "abono_no_encontrado", "message": "El abono no existe."},
        )
    remaining_rows = [a for a in rows if a.id != abono_id]
    remaining_map = _recalculate_chain(remaining_rows)
    with scope.conn.transaction():
        scope.conn.execute(
            "DELETE FROM abonos WHERE id = %s AND patient_id = %s", (abono_id, patient_id)
        )
        for a in remaining_rows:
            scope.conn.execute(
                "UPDATE abonos SET remaining = %s WHERE id = %s",
                (remaining_map[a.id], a.id),
            )
    return remaining_rows[-1].remaining if remaining_rows else 0.0
