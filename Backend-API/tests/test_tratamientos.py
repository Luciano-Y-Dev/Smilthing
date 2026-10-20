from fastapi.testclient import TestClient

from tests.conftest import patient_payload


def test_tratamientos_crud(clinic_client: TestClient) -> None:
    patient_id = clinic_client.post("/api/pacientes", json=patient_payload()).json()

    created = clinic_client.post(
        f"/api/pacientes/{patient_id}/tratamientos",
        json={"diagnosis": "Endodoncia 36", "date": "2026-01-20"},
    )
    assert created.status_code == 200
    tratamiento = created.json()
    assert tratamiento["diagnosis"] == "Endodoncia 36"
    assert tratamiento["treatmentPlan"] == ""

    created2 = clinic_client.post(
        f"/api/pacientes/{patient_id}/tratamientos",
        json={"diagnosis": "Corona 36", "date": "2026-02-01"},
    )
    assert created2.status_code == 200

    listed = clinic_client.get(f"/api/pacientes/{patient_id}/tratamientos").json()
    assert len(listed) == 2
    assert listed[0]["diagnosis"] == "Corona 36"

    updated = clinic_client.put(
        f"/api/pacientes/{patient_id}/tratamientos/{tratamiento['id']}",
        json={"diagnosis": "Endodoncia 36 terminada", "date": "2026-01-25"},
    )
    assert updated.status_code == 200
    assert updated.json()["diagnosis"] == "Endodoncia 36 terminada"

    deleted = clinic_client.delete(
        f"/api/pacientes/{patient_id}/tratamientos/{tratamiento['id']}"
    )
    assert deleted.status_code == 200
    listed2 = clinic_client.get(f"/api/pacientes/{patient_id}/tratamientos").json()
    assert len(listed2) == 1


def test_tratamiento_texto_vacio(clinic_client: TestClient) -> None:
    patient_id = clinic_client.post("/api/pacientes", json=patient_payload()).json()
    response = clinic_client.post(
        f"/api/pacientes/{patient_id}/tratamientos",
        json={"diagnosis": "  ", "date": "2026-01-20"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "texto_obligatorio"


def test_tratamiento_paciente_inexistente(clinic_client: TestClient) -> None:
    response = clinic_client.get("/api/pacientes/99999/tratamientos")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "paciente_no_encontrado"
