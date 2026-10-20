from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.deps import TenantScopeDep, get_tenant_scope
from app.models import Cita, CitaEstadoInput, SaveCitaInput
from app.services import cita_service

router = APIRouter(
    prefix="/api/citas",
    tags=["citas"],
    dependencies=[Depends(get_tenant_scope)],
)


@router.get("", response_model=list[Cita])
def list_citas(
    desde: date, hasta: date, scope: TenantScopeDep
) -> list[Cita]:
    if hasta < desde:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "rango_invalido",
                "message": "La fecha final no puede ser anterior a la inicial.",
            },
        )
    return cita_service.list_citas(scope, desde, hasta)


@router.post("", response_model=Cita)
def create_cita(data: SaveCitaInput, scope: TenantScopeDep) -> Cita:
    return cita_service.create_cita(scope, data)


@router.patch("/{cita_id}", response_model=Cita)
def update_cita(
    cita_id: int, data: SaveCitaInput, scope: TenantScopeDep
) -> Cita:
    return cita_service.update_cita(scope, cita_id, data)


@router.patch("/{cita_id}/estado", response_model=Cita)
def set_estado(
    cita_id: int, data: CitaEstadoInput, scope: TenantScopeDep
) -> Cita:
    return cita_service.set_estado(scope, cita_id, data.estado)


@router.delete("/{cita_id}")
def delete_cita(cita_id: int, scope: TenantScopeDep) -> dict[str, bool]:
    return {"ok": cita_service.delete_cita(scope, cita_id)}
