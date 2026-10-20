from fastapi import APIRouter, Depends, HTTPException

from app.deps import TenantScopeDep, get_tenant_scope
from app.models import SaveTreatmentInput, Treatment
from app.services import tratamiento_service

router = APIRouter(
    prefix="/api/pacientes",
    tags=["tratamientos"],
    dependencies=[Depends(get_tenant_scope)],
)


def _ensure_patient(scope: TenantScopeDep, patient_id: int) -> None:
    from app.services import patient_service

    if patient_service.get_patient(scope, patient_id) is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "paciente_no_encontrado",
                "message": "El paciente no existe.",
            },
        )


@router.get("/{patient_id}/tratamientos", response_model=list[Treatment])
def list_tratamientos(scope: TenantScopeDep, patient_id: int) -> list[Treatment]:
    _ensure_patient(scope, patient_id)
    return tratamiento_service.list_tratamientos(scope, patient_id)


@router.post("/{patient_id}/tratamientos", response_model=Treatment)
def add_tratamiento(
    scope: TenantScopeDep, patient_id: int, data: SaveTreatmentInput
) -> Treatment:
    _ensure_patient(scope, patient_id)
    return tratamiento_service.add_tratamiento(scope, patient_id, data)


@router.put("/{patient_id}/tratamientos/{tratamiento_id}", response_model=Treatment)
def update_tratamiento(
    scope: TenantScopeDep,
    patient_id: int,
    tratamiento_id: int,
    data: SaveTreatmentInput,
) -> Treatment:
    _ensure_patient(scope, patient_id)
    return tratamiento_service.update_tratamiento(
        scope, patient_id, tratamiento_id, data
    )


@router.delete("/{patient_id}/tratamientos/{tratamiento_id}")
def delete_tratamiento(
    scope: TenantScopeDep, patient_id: int, tratamiento_id: int
) -> bool:
    _ensure_patient(scope, patient_id)
    if not tratamiento_service.delete_tratamiento(scope, patient_id, tratamiento_id):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "tratamiento_no_encontrado",
                "message": "El tratamiento no existe.",
            },
        )
    return True
