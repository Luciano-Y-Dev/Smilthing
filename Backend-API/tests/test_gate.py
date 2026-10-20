from datetime import date, timedelta

import psycopg
from fastapi.testclient import TestClient

from app.config import get_settings


def _set_clinica_estado(email: str, estado: str, trial_expires: date | None) -> None:
    settings = get_settings()
    with psycopg.connect(settings.database_url_admin, autocommit=True) as conn:
        conn.execute(
            """
            UPDATE clinicas
            SET estado = %s, trial_expires = %s
            WHERE id = (SELECT clinica_id FROM usuarios WHERE email = %s)
            """,
            (estado, trial_expires, email),
        )


def test_trial_vencido_bloquea_pero_me_funciona(clinic_client: TestClient) -> None:
    _set_clinica_estado(
        clinic_client.clinic_email, "trial", date.today() - timedelta(days=1)
    )
    response = clinic_client.get("/api/pacientes")
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "trial_vencido"

    me = clinic_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["clinica"]["estado"] == "trial"
    assert me.json()["dias_restantes"] == 0


def test_cuenta_suspendida_bloquea(clinic_client: TestClient) -> None:
    _set_clinica_estado(clinic_client.clinic_email, "suspendido", None)
    response = clinic_client.get("/api/pacientes")
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "cuenta_suspendida"

    me = clinic_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["clinica"]["estado"] == "suspendido"


def test_trial_vigente_permite_acceso(clinic_client: TestClient) -> None:
    _set_clinica_estado(
        clinic_client.clinic_email, "trial", date.today() + timedelta(days=10)
    )
    response = clinic_client.get("/api/pacientes")
    assert response.status_code == 200
    assert response.json() == []
