import uuid

from fastapi.testclient import TestClient

from app.auth import create_clinic_with_admin
from app import superauth


def _unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}@test.com"


def test_admin_requiere_sesion(client: TestClient) -> None:
    assert client.get("/api/admin/clinicas").status_code == 401
    assert client.get("/api/admin/estadisticas").status_code == 401
    assert client.get("/api/admin/me").status_code == 401


def test_admin_login_y_me(super_client: TestClient) -> None:
    me = super_client.get("/api/admin/me")
    assert me.status_code == 200
    assert me.json()["email"] == super_client.super_email


def test_admin_login_credenciales_invalidas(client: TestClient) -> None:
    email = _unique("solo")
    superauth.create_superuser(email, "clave123")
    client.post("/api/admin/logout")
    bad = client.post("/api/admin/login", json={"email": email, "password": "mala"})
    assert bad.status_code == 401
    ok = client.post("/api/admin/login", json={"email": email, "password": "clave123"})
    assert ok.status_code == 200


def test_admin_crea_clinica_y_login_de_clinica(super_client: TestClient) -> None:
    email = _unique("nueva")
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "Clinica Nueva", "email": email, "password": "clave123", "dias_trial": 15},
    )
    assert r.status_code == 200, r.text
    row = r.json()
    assert row["nombre"] == "Clinica Nueva"
    assert row["email_admin"] == email
    assert row["estado"] == "trial"

    clinic = TestClient(super_client.app)
    login = clinic.post("/api/auth/login", json={"email": email, "password": "clave123"})
    assert login.status_code == 200
    assert login.json()["dias_restantes"] == 15


def test_admin_suspende_y_clinica_gets_403(super_client: TestClient) -> None:
    email = _unique("suspend")
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "A Suspender", "email": email, "password": "clave123"},
    )
    clinica_id = r.json()["id"]

    clinic = TestClient(super_client.app)
    assert clinic.post(
        "/api/auth/login", json={"email": email, "password": "clave123"}
    ).status_code == 200

    patch = super_client.patch(
        f"/api/admin/clinicas/{clinica_id}", json={"estado": "suspendido"}
    )
    assert patch.status_code == 200

    blocked = clinic.get("/api/pacientes")
    assert blocked.status_code == 403
    assert blocked.json()["detail"]["code"] == "cuenta_suspendida"

    super_client.patch(f"/api/admin/clinicas/{clinica_id}", json={"estado": "activo"})
    assert clinic.get("/api/pacientes").status_code == 200


def test_admin_pagos(super_client: TestClient) -> None:
    email = _unique("pago")
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "Clinica Pago", "email": email, "password": "clave123"},
    )
    clinica_id = r.json()["id"]

    r = super_client.post(
        f"/api/admin/clinicas/{clinica_id}/pagos",
        json={"monto": 50, "fecha": "2026-10-11", "referencia": "REF-1", "notas": "mensualidad"},
    )
    assert r.status_code == 200, r.text
    pago = r.json()
    assert pago["monto"] == 50
    assert pago["referencia"] == "REF-1"

    lista = super_client.get(f"/api/admin/clinicas/{clinica_id}/pagos")
    assert lista.status_code == 200
    assert len(lista.json()) == 1

    delete = super_client.delete(f"/api/admin/pagos/{pago['id']}")
    assert delete.status_code == 200
    assert super_client.get(f"/api/admin/clinicas/{clinica_id}/pagos").json() == []


def test_admin_estadisticas(super_client: TestClient) -> None:
    r = super_client.get("/api/admin/estadisticas")
    assert r.status_code == 200
    body = r.json()
    assert body["clinicas_total"] >= 1
    assert set(body) == {
        "clinicas_total",
        "activas",
        "trial",
        "suspendidas",
        "pacientes_total",
        "ingresos_mes",
        "trials_por_vencer",
    }


def test_admin_elimina_clinica(super_client: TestClient) -> None:
    email = _unique("borrar")
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "A Borrar", "email": email, "password": "clave123"},
    )
    clinica_id = r.json()["id"]

    delete = super_client.delete(f"/api/admin/clinicas/{clinica_id}")
    assert delete.status_code == 200

    lista = super_client.get("/api/admin/clinicas").json()
    assert all(c["id"] != clinica_id for c in lista)

    clinic = TestClient(super_client.app)
    login = clinic.post("/api/auth/login", json={"email": email, "password": "clave123"})
    assert login.status_code == 401


def test_clinica_no_ve_admin(super_client: TestClient) -> None:
    email = _unique("noadmin")
    create_clinic_with_admin("Clinica Comun", email, "clave123")
    clinic = TestClient(super_client.app)
    assert clinic.post(
        "/api/auth/login", json={"email": email, "password": "clave123"}
    ).status_code == 200
    assert clinic.get("/api/admin/clinicas").status_code == 401


def test_admin_crea_clinica_con_color_y_me_devuelve_marca(super_client: TestClient) -> None:
    email = _unique("marca")
    r = super_client.post(
        "/api/admin/clinicas",
        json={
            "nombre": "Clinica Marca",
            "email": email,
            "password": "clave123",
            "color_primary": "#123456",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["color_primary"] == "#123456"
    assert r.json()["logo_url"] is None

    clinic = TestClient(super_client.app)
    login = clinic.post("/api/auth/login", json={"email": email, "password": "clave123"})
    assert login.status_code == 200
    clinica = login.json()["clinica"]
    assert clinica["color_primary"] == "#123456"
    assert clinica["logo_url"] is None


def test_admin_patch_color_primario(super_client: TestClient) -> None:
    email = _unique("color")
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "Clinica Color", "email": email, "password": "clave123"},
    )
    clinica_id = r.json()["id"]
    assert r.json()["color_primary"] is None

    patch = super_client.patch(
        f"/api/admin/clinicas/{clinica_id}", json={"color_primary": "#ABCDEF"}
    )
    assert patch.status_code == 200

    clinic = TestClient(super_client.app)
    assert clinic.post(
        "/api/auth/login", json={"email": email, "password": "clave123"}
    ).status_code == 200
    me = clinic.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["clinica"]["color_primary"] == "#ABCDEF"


def test_admin_color_invalido(super_client: TestClient) -> None:
    create = super_client.post(
        "/api/admin/clinicas",
        json={
            "nombre": "Color Invalido",
            "email": _unique("malcolor"),
            "password": "clave123",
            "color_primary": "rosa",
        },
    )
    assert create.status_code == 422

    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "Para Parchear", "email": _unique("parche"), "password": "clave123"},
    )
    clinica_id = r.json()["id"]
    patch = super_client.patch(
        f"/api/admin/clinicas/{clinica_id}", json={"color_primary": "#12345g"}
    )
    assert patch.status_code == 422


def test_admin_logo_upload_get_delete(super_client: TestClient) -> None:
    email = _unique("logo")
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "Clinica Logo", "email": email, "password": "clave123"},
    )
    clinica_id = r.json()["id"]

    clinic = TestClient(super_client.app)
    assert clinic.get(f"/api/clinicas/{clinica_id}/logo").status_code == 404

    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
    upload = super_client.post(
        f"/api/admin/clinicas/{clinica_id}/logo",
        files={"file": ("logo.png", png, "image/png")},
    )
    assert upload.status_code == 200, upload.text
    assert upload.json()["url"] == f"/api/clinicas/{clinica_id}/logo"

    lista = super_client.get("/api/admin/clinicas").json()
    row = next(c for c in lista if c["id"] == clinica_id)
    assert row["logo_url"] == f"/api/clinicas/{clinica_id}/logo"

    assert clinic.post(
        "/api/auth/login", json={"email": email, "password": "clave123"}
    ).status_code == 200
    me = clinic.get("/api/auth/me").json()
    assert me["clinica"]["logo_url"] == f"/api/clinicas/{clinica_id}/logo"

    logo = clinic.get(f"/api/clinicas/{clinica_id}/logo")
    assert logo.status_code == 200
    assert logo.headers["content-type"] == "image/png"
    assert logo.headers["cache-control"] == "public, max-age=86400"
    assert logo.content == png

    delete = super_client.delete(f"/api/admin/clinicas/{clinica_id}/logo")
    assert delete.status_code == 200
    assert clinic.get(f"/api/clinicas/{clinica_id}/logo").status_code == 404
    me = clinic.get("/api/auth/me").json()
    assert me["clinica"]["logo_url"] is None


def test_admin_logo_tipo_invalido(super_client: TestClient) -> None:
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "Clinica SVG", "email": _unique("svg"), "password": "clave123"},
    )
    clinica_id = r.json()["id"]
    upload = super_client.post(
        f"/api/admin/clinicas/{clinica_id}/logo",
        files={"file": ("logo.svg", b"<svg xmlns='http://www.w3.org/2000/svg'></svg>", "image/svg+xml")},
    )
    assert upload.status_code == 400
    assert upload.json()["detail"]["code"] == "tipo_no_soportado"


def test_admin_logo_demasiado_grande(super_client: TestClient) -> None:
    r = super_client.post(
        "/api/admin/clinicas",
        json={"nombre": "Clinica Grande", "email": _unique("grande"), "password": "clave123"},
    )
    clinica_id = r.json()["id"]
    big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (2 * 1024 * 1024)
    upload = super_client.post(
        f"/api/admin/clinicas/{clinica_id}/logo",
        files={"file": ("big.png", big, "image/png")},
    )
    assert upload.status_code == 400
    assert upload.json()["detail"]["code"] == "archivo_grande"
