from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from app import pdf
from app.deps import TenantScopeDep, get_tenant_scope
from app.services import patient_service

router = APIRouter(
    prefix="/api",
    tags=["export"],
    dependencies=[Depends(get_tenant_scope)],
)


@router.get("/pacientes/{patient_id}/pdf")
def patient_pdf(scope: TenantScopeDep, patient_id: int) -> Response:
    if patient_service.get_patient(scope, patient_id) is None:
        raise HTTPException(status_code=404, detail={"code": "paciente_no_encontrado"})
    content = pdf.generate_patients_pdf(scope, [patient_id])
    return Response(
        content=content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="paciente_{patient_id}.pdf"'
        },
    )


@router.get("/export/pdf")
def export_pdf(
    scope: TenantScopeDep,
    ids: Annotated[str, Query(description="IDs separados por coma")],
) -> Response:
    try:
        patient_ids = [int(part) for part in ids.split(",") if part.strip()]
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={"code": "ids_invalidos", "message": "Indique solo IDs numéricos."},
        )
    if not patient_ids:
        raise HTTPException(
            status_code=400, detail={"code": "ids_requeridos", "message": "Indique al menos un paciente."}
        )
    content = pdf.generate_patients_pdf(scope, patient_ids)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="pacientes.pdf"'},
    )
