import psycopg
from fastapi.testclient import TestClient
from psycopg.rows import dict_row

from app.config import get_settings
from tests.conftest import patient_payload


def _patient_rows_encrypted(email: str) -> list[dict]:
    settings = get_settings()
    with psycopg.connect(settings.database_url_admin, row_factory=dict_row, autocommit=True) as conn:
        row = conn.execute(
            "SELECT clinica_id FROM usuarios WHERE email = %s", (email,)
        ).fetchone()
    with psycopg.connect(
        f"{settings.database_url_admin.rsplit('/', 1)[0]}/tenant_{row['clinica_id']}",
        row_factory=dict_row,
        autocommit=True,
    ) as conn:
        return conn.execute("SELECT ci, represent_ci FROM pacientes").fetchall()


def test_crud_paciente_completo(clinic_client: TestClient) -> None:
    created = clinic_client.post("/api/pacientes", json=patient_payload())
    assert created.status_code == 200
    patient_id = created.json()
    assert isinstance(patient_id, int)

    full = clinic_client.get(f"/api/pacientes/{patient_id}/completo")
    assert full.status_code == 200
    body = full.json()
    assert body["patient"]["name"] == "Maria"
    assert body["patient"]["CI"] == "12345678"
    assert body["medicalHistory"]["allergy"] == "Penicilina"
    assert body["medicalHistory"]["hiv"] == "Negativo"
    assert body["oralExam"]["intraoralTD"] == "Caries 36"
    assert body["odontogram"]["notes"] == "Inicial"
    assert len(body["odontogramDetails"]) == 2
    assert body["remaining"] == 70.0

    encrypted = _patient_rows_encrypted(clinic_client.clinic_email)
    assert encrypted[0]["ci"] != "12345678"
    assert "12345678" not in encrypted[0]["ci"]

    updated = clinic_client.post(
        "/api/pacientes",
        json=patient_payload(id=patient_id, name="Maria L.", age=31),
    )
    assert updated.status_code == 200
    assert updated.json() == patient_id
    full2 = clinic_client.get(f"/api/pacientes/{patient_id}/completo").json()
    assert full2["patient"]["name"] == "Maria L."
    assert full2["patient"]["age"] == 31
    assert len(full2["odontogramDetails"]) == 2

    deleted = clinic_client.delete(f"/api/pacientes/{patient_id}")
    assert deleted.status_code == 200
    assert deleted.json() is True
    assert clinic_client.get(f"/api/pacientes/{patient_id}").status_code == 404


def test_edicion_no_duplica_abono_inicial(clinic_client: TestClient) -> None:
    patient_id = clinic_client.post("/api/pacientes", json=patient_payload()).json()
    clinic_client.post(
        "/api/pacientes",
        json=patient_payload(
            id=patient_id,
            payment={"treatmentCost": 100.0, "amount": 50.0, "description": "Otra"},
        ),
    )
    abonos = clinic_client.get(f"/api/pacientes/{patient_id}/abonos").json()
    assert len(abonos) == 1
    assert abonos[0]["amount"] == 30.0


def test_ci_exists(clinic_client: TestClient) -> None:
    clinic_client.post("/api/pacientes", json=patient_payload())
    assert clinic_client.get("/api/pacientes/ci-existe", params={"ci": "12345678"}).json() is True
    assert clinic_client.get("/api/pacientes/ci-existe", params={"ci": "999"}).json() is False

    patient_id = clinic_client.get("/api/pacientes").json()[0]["id"]
    assert (
        clinic_client.get(
            "/api/pacientes/ci-existe",
            params={"ci": "12345678", "excludePatientId": patient_id},
        ).json()
        is False
    )


def test_filtros(clinic_client: TestClient) -> None:
    clinic_client.post("/api/pacientes", json=patient_payload())
    clinic_client.post(
        "/api/pacientes",
        json=patient_payload(
            name="Pedro", lastName="Gomez", CI="87654321", entryDate="2026-03-01"
        ),
    )

    by_name = clinic_client.get(
        "/api/pacientes/filtro", params={"searchText": "pedro"}
    ).json()
    assert len(by_name) == 1
    assert by_name[0]["name"] == "Pedro"

    by_ci = clinic_client.get(
        "/api/pacientes/filtro", params={"searchText": "12345"}
    ).json()
    assert len(by_ci) == 1

    by_date = clinic_client.get(
        "/api/pacientes/filtro", params={"dateFrom": "2026-02-01"}
    ).json()
    assert len(by_date) == 1
    assert by_date[0]["name"] == "Pedro"

    none = clinic_client.get(
        "/api/pacientes/filtro", params={"dateTo": "2026-02-01"}
    ).json()
    assert len(none) == 1
    assert none[0]["name"] == "Maria"


def test_listados_saldo(clinic_client: TestClient) -> None:
    clinic_client.post("/api/pacientes", json=patient_payload())
    pendientes = clinic_client.get("/api/pacientes/pendientes").json()
    assert len(pendientes) == 1
    assert pendientes[0]["remaining"] == 70.0
    assert clinic_client.get("/api/pacientes/pagados").json() == []

    patient_id = pendientes[0]["id"]
    clinic_client.post(
        f"/api/pacientes/{patient_id}/abonos",
        json={"amount": 70.0, "date": "2026-02-01", "description": "Resto"},
    )
    assert clinic_client.get("/api/pacientes/pendientes").json() == []
    pagados = clinic_client.get("/api/pacientes/pagados").json()
    assert len(pagados) == 1
    assert pagados[0]["remaining"] == 0.0


def test_borrado_cascada(clinic_client: TestClient) -> None:
    patient_id = clinic_client.post("/api/pacientes", json=patient_payload()).json()
    clinic_client.post(
        f"/api/pacientes/{patient_id}/tratamientos",
        json={"diagnosis": "Endodoncia 36", "date": "2026-01-20"},
    )
    clinic_client.delete(f"/api/pacientes/{patient_id}")

    settings = get_settings()
    with psycopg.connect(settings.database_url_admin, row_factory=dict_row, autocommit=True) as conn:
        row = conn.execute(
            "SELECT clinica_id FROM usuarios WHERE email = %s", (clinic_client.clinic_email,)
        ).fetchone()
    url = f"{settings.database_url_admin.rsplit('/', 1)[0]}/tenant_{row['clinica_id']}"
    with psycopg.connect(url, row_factory=dict_row, autocommit=True) as conn:
        for table in (
            "antecedentes_personales",
            "examen_fisico",
            "odontogram_details",
            "odontograms",
            "tratamiento",
            "abonos",
        ):
            count = conn.execute(f"SELECT COUNT(*) AS n FROM {table}").fetchone()["n"]
            assert count == 0, table


def test_aislamiento_entre_clinicas(client: TestClient) -> None:
    from app.auth import create_clinic_with_admin

    create_clinic_with_admin("Clinica A", "a@x.com", "clave123")
    assert client.post(
        "/api/auth/login", json={"email": "a@x.com", "password": "clave123"}
    ).status_code == 200
    client.post("/api/pacientes", json=patient_payload())

    client.post("/api/auth/logout")
    create_clinic_with_admin("Clinica B", "b@x.com", "clave123")
    assert client.post(
        "/api/auth/login", json={"email": "b@x.com", "password": "clave123"}
    ).status_code == 200
    assert client.get("/api/pacientes").json() == []
    assert client.get("/api/pacientes/ci-existe", params={"ci": "12345678"}).json() is False
