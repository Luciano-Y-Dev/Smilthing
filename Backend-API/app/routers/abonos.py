from fastapi import APIRouter, Depends, HTTPException

from app.deps import TenantScopeDep, get_tenant_scope
from app.models import Payment, SavePaymentInput
from app.services import abono_service, patient_service

router = APIRouter(
    prefix="/api/pacientes",
    tags=["abonos"],
    dependencies=[Depends(get_tenant_scope)],
)


def _ensure_patient(scope: TenantScopeDep, patient_id: int) -> None:
    if patient_service.get_patient(scope, patient_id) is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "paciente_no_encontrado",
                "message": "El paciente no existe.",
            },
        )


@router.get("/{patient_id}/abonos", response_model=list[Payment])
def list_abonos(scope: TenantScopeDep, patient_id: int) -> list[Payment]:
    _ensure_patient(scope, patient_id)
    return abono_service.list_abonos(scope, patient_id)


@router.post("/{patient_id}/abonos", response_model=Payment)
def add_abono(
    scope: TenantScopeDep, patient_id: int, data: SavePaymentInput
) -> Payment:
    _ensure_patient(scope, patient_id)
    return abono_service.add_abono(scope, patient_id, data)


@router.put("/{patient_id}/abonos/{abono_id}", response_model=Payment)
def update_abono(
    scope: TenantScopeDep,
    patient_id: int,
    abono_id: int,
    data: SavePaymentInput,
) -> Payment:
    _ensure_patient(scope, patient_id)
    return abono_service.update_abono(scope, patient_id, abono_id, data)


@router.delete("/{patient_id}/abonos/{abono_id}")
def delete_abono(scope: TenantScopeDep, patient_id: int, abono_id: int) -> float:
    _ensure_patient(scope, patient_id)
    return abono_service.delete_abono(scope, patient_id, abono_id)
