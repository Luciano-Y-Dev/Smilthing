import uuid

from fastapi.testclient import TestClient

from app.auth import create_clinic_with_admin


def _create_clinic(email: str) -> None:
    create_clinic_with_admin("Clinica Base", email, "clave123")


def test_registro_publico_eliminado(client: TestClient) -> None:
    response = client.post(
        "/api/auth/registro",
        json={"nombreClinica": "Dental Sur", "email": "admin@sur.com", "password": "clave123"},
    )
    assert response.status_code == 404


def test_login_y_logout(client: TestClient) -> None:
    email = f"login-{uuid.uuid4().hex[:8]}@x.com"
    _create_clinic(email)
    client.post("/api/auth/logout")

    bad = client.post("/api/auth/login", json={"email": email, "password": "mala"})
    assert bad.status_code == 401
    assert bad.json()["detail"]["code"] == "credenciales_invalidas"

    ok = client.post("/api/auth/login", json={"email": email, "password": "clave123"})
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200

    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


def test_login_por_nombre_clinica(client: TestClient) -> None:
    email = f"nombre-{uuid.uuid4().hex[:8]}@x.com"
    nombre = f"Clip {uuid.uuid4().hex[:6]}"
    create_clinic_with_admin(nombre, email, "clave123")
    client.post("/api/auth/logout")

    ok = client.post("/api/auth/login", json={"email": nombre, "password": "clave123"})
    assert ok.status_code == 200
    assert ok.json()["clinica"]["nombre"] == nombre
    assert client.get("/api/auth/me").status_code == 200

    client.post("/api/auth/logout")


def test_rutas_protegidas_sin_sesion(client: TestClient) -> None:
    assert client.get("/api/pacientes").status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_login_rate_limit(client: TestClient) -> None:
    email = f"rate-{uuid.uuid4().hex[:8]}@x.com"
    _create_clinic(email)
    client.post("/api/auth/logout")
    for _ in range(5):
        client.post("/api/auth/login", json={"email": email, "password": "mala"})
    blocked = client.post("/api/auth/login", json={"email": email, "password": "mala"})
    assert blocked.status_code == 429
