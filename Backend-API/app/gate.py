from datetime import date

from fastapi import HTTPException

from app.auth import AuthContext
from app.config import get_settings
from app import tenancy


def check_gate(ctx: AuthContext) -> None:
    clinica = ctx.clinica
    if clinica.estado == "suspendido":
        raise HTTPException(
            status_code=403,
            detail={
                "code": "cuenta_suspendida",
                "message": "La cuenta está suspendida. Contacte para renovar.",
            },
        )
    if clinica.estado == "trial" and clinica.trial_expires:
        if date.fromisoformat(clinica.trial_expires) < date.today():
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "trial_vencido",
                    "message": "El período de prueba finalizó. Contacte para renovar.",
                },
            )


def check_patient_limit(ctx: AuthContext, creating_new: bool) -> None:
    if not creating_new or ctx.clinica.estado != "trial":
        return
    settings = get_settings()
    count = tenancy.count_patients(ctx.clinica_id)
    if count >= settings.trial_pacientes:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "limite_pacientes_trial",
                "message": (
                    f"Alcanzó el límite de {settings.trial_pacientes} pacientes "
                    "durante el período de prueba."
                ),
            },
        )
