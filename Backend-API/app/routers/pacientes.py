from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps import TenantScopeDep, get_tenant_scope
from app.models import (
    Patient,
    PatientFull,
    PatientWithBalance,
    SavePatientInput,
)
from app.services import patient_service

router = APIRouter(
    prefix="/api/pacientes",
    tags=["pacientes"],
    dependencies=[Depends(get_tenant_scope)],
)


@router.get("", response_model=list[PatientWithBalance])
def list_patients(scope: TenantScopeDep) -> list[PatientWithBalance]:
    return patient_service.list_patients(scope)


@router.get("/pendientes", response_model=list[PatientWithBalance])
def list_pending(scope: TenantScopeDep) -> list[PatientWithBalance]:
    return patient_service.list_pending(scope)


@router.get("/pagados", response_model=list[PatientWithBalance])
def list_paid(scope: TenantScopeDep) -> list[PatientWithBalance]:
    return patient_service.list_paid(scope)


@router.get("/filtro", response_model=list[PatientWithBalance])
def filter_patients(
    scope: TenantScopeDep,
    searchText: Annotated[str, Query()] = "",
    dateFrom: Annotated[date | None, Query()] = None,
    dateTo: Annotated[date | None, Query()] = None,
) -> list[PatientWithBalance]:
    return patient_service.filter_patients(scope, searchText, dateFrom, dateTo)


@router.get("/ci-existe")
def ci_exists(
    scope: TenantScopeDep,
    ci: Annotated[str, Query()],
    excludePatientId: Annotated[int | None, Query()] = None,
) -> bool:
    return patient_service.ci_exists(scope, ci, excludePatientId)


PACIENTE_NO_ENCONTRADO = {
    "code": "paciente_no_encontrado",
    "message": "El paciente no existe.",
}


@router.get("/{patient_id}", response_model=Patient)
def get_patient(scope: TenantScopeDep, patient_id: int) -> Patient:
    patient = patient_service.get_patient(scope, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail=PACIENTE_NO_ENCONTRADO)
    return patient


@router.get("/{patient_id}/completo", response_model=PatientFull)
def get_patient_full(scope: TenantScopeDep, patient_id: int) -> PatientFull:
    full = patient_service.get_patient_full(scope, patient_id)
    if full is None:
        raise HTTPException(status_code=404, detail=PACIENTE_NO_ENCONTRADO)
    return full


@router.post("")
def save_patient(scope: TenantScopeDep, data: SavePatientInput) -> int:
    return patient_service.save_patient(scope, data)


@router.delete("/{patient_id}")
def delete_patient(scope: TenantScopeDep, patient_id: int) -> bool:
    if not patient_service.delete_patient(scope, patient_id):
        raise HTTPException(status_code=404, detail=PACIENTE_NO_ENCONTRADO)
    return True
