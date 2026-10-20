from fastapi.testclient import TestClient

from tests.conftest import patient_payload


def _create_patient_with_abonos(client: TestClient) -> tuple[int, list[dict]]:
    patient_id = client.post("/api/pacientes", json=patient_payload()).json()
    first = client.post(
        f"/api/pacientes/{patient_id}/abonos",
        json={"amount": 20.0, "date": "2026-01-16", "description": "Abono 2"},
    )
    assert first.status_code == 200
    second = client.post(
        f"/api/pacientes/{patient_id}/abonos",
        json={"amount": 10.0, "date": "2026-01-17", "description": "Abono 3"},
    )
    assert second.status_code == 200
    abonos = client.get(f"/api/pacientes/{patient_id}/abonos").json()
    return patient_id, abonos


def test_add_abono_y_saldo(clinic_client: TestClient) -> None:
    patient_id, abonos = _create_patient_with_abonos(clinic_client)
    assert len(abonos) == 3
    assert abonos[0]["remaining"] == 40.0
    assert abonos[1]["remaining"] == 50.0
    assert abonos[2]["remaining"] == 70.0
    assert abonos[0]["treatmentCost"] == 100.0


def test_abono_excede_saldo(clinic_client: TestClient) -> None:
    patient_id = clinic_client.post("/api/pacientes", json=patient_payload()).json()
    response = clinic_client.post(
        f"/api/pacientes/{patient_id}/abonos",
        json={"amount": 80.0, "date": "2026-01-16", "description": "Mucho"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "abono_excede_saldo"


def test_update_abono_cascada(clinic_client: TestClient) -> None:
    patient_id, abonos = _create_patient_with_abonos(clinic_client)
    oldest = abonos[-1]
    response = clinic_client.put(
        f"/api/pacientes/{patient_id}/abonos/{oldest['id']}",
        json={"amount": 40.0, "date": "2026-01-16", "description": "Editado"},
    )
    assert response.status_code == 200
    assert response.json()["remaining"] == 60.0

    updated = clinic_client.get(f"/api/pacientes/{patient_id}/abonos").json()
    by_id = {a["id"]: a for a in updated}
    assert by_id[oldest["id"]]["remaining"] == 60.0
    assert by_id[oldest["id"]]["description"] == "Editado"
    assert abonos[1]["id"] in by_id
    assert by_id[abonos[1]["id"]]["remaining"] == 40.0
    assert by_id[abonos[0]["id"]]["remaining"] == 30.0


def test_update_abono_saldo_negativo(clinic_client: TestClient) -> None:
    patient_id, abonos = _create_patient_with_abonos(clinic_client)
    oldest = abonos[-1]
    response = clinic_client.put(
        f"/api/pacientes/{patient_id}/abonos/{oldest['id']}",
        json={"amount": 95.0, "date": "2026-01-16", "description": "Invalido"},
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "saldo_negativo"


def test_delete_abono_cascada(clinic_client: TestClient) -> None:
    patient_id, abonos = _create_patient_with_abonos(clinic_client)
    middle = abonos[1]
    response = clinic_client.delete(
        f"/api/pacientes/{patient_id}/abonos/{middle['id']}"
    )
    assert response.status_code == 200

    remaining = clinic_client.get(f"/api/pacientes/{patient_id}/abonos").json()
    assert len(remaining) == 2
    by_id = {a["id"]: a for a in remaining}
    assert by_id[abonos[0]["id"]]["remaining"] == 60.0
    assert by_id[abonos[-1]["id"]]["remaining"] == 70.0


def test_delete_abono_inexistente(clinic_client: TestClient) -> None:
    patient_id = clinic_client.post("/api/pacientes", json=patient_payload()).json()
    response = clinic_client.delete(f"/api/pacientes/{patient_id}/abonos/99999")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "abono_no_encontrado"
