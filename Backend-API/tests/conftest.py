import os
import uuid
from collections.abc import Iterator
from urllib.parse import urlsplit, urlunsplit

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings


def _replace_db(url: str, dbname: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, f"/{dbname}", parts.query, ""))


@pytest.fixture(scope="session", autouse=True)
def test_database() -> Iterator[str]:
    settings = get_settings()
    admin_url = settings.database_url_admin
    with psycopg.connect(_replace_db(admin_url, "postgres"), autocommit=True) as conn:
        conn.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'clinica_test'"
        )
        conn.execute("DROP DATABASE IF EXISTS clinica_test")
        conn.execute("CREATE DATABASE clinica_test ENCODING 'UTF8'")
    test_url = _replace_db(admin_url, "clinica_test")
    os.environ["DATABASE_URL_ADMIN"] = test_url
    get_settings.cache_clear()
    yield test_url
    os.environ.pop("DATABASE_URL_ADMIN", None)
    get_settings.cache_clear()


@pytest.fixture
def client() -> Iterator[TestClient]:
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def clinic_client(client: TestClient) -> TestClient:
    from app.auth import create_clinic_with_admin

    email = f"doctora-{uuid.uuid4().hex[:8]}@test.com"
    create_clinic_with_admin("Clinica Test", email, "secret123")
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": "secret123"},
    )
    assert response.status_code == 200, response.text
    client.clinic_email = email
    return client


@pytest.fixture
def super_client(client: TestClient) -> TestClient:
    from app import superauth

    email = f"super-{uuid.uuid4().hex[:8]}@test.com"
    superauth.create_superuser(email, "secret123")
    response = client.post(
        "/api/admin/login",
        json={"email": email, "password": "secret123"},
    )
    assert response.status_code == 200, response.text
    client.super_email = email
    return client


def patient_payload(**overrides) -> dict:
    payload = {
        "name": "Maria",
        "lastName": "Perez",
        "age": 30,
        "CI": "12345678",
        "entryDate": "2026-01-15",
        "phoneNumber": "04141234567",
        "home": "Calle Falsa 123",
        "representName": None,
        "representCI": None,
        "consultReason": "Dolor molar",
        "presentIssues": "Sensibilidad",
        "medicalHistory": {
            "allergy": "Penicilina",
            "cardiovascular": "No",
            "hiv": "Negativo",
        },
        "oralExam": {
            "extraoral": "Normal",
            "intraoralTB": "Limpio",
            "intraoralTD": "Caries 36",
            "periodontal": "Bueno",
            "PA": "Adecuada",
        },
        "odontogram": {
            "notes": "Inicial",
            "affections": [
                {"tooth": 36, "face": "O", "affected": "Yes", "description": "Caries oclusal"},
                {"tooth": 46, "face": "O", "affected": "Resina", "description": "Resina oclusal"},
            ],
        },
        "payment": {
            "treatmentCost": 100.0,
            "amount": 30.0,
            "description": "Cuota inicial",
        },
    }
    payload.update(overrides)
    return payload
