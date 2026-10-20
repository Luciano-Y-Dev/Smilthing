from collections.abc import Iterator
from contextlib import contextmanager
from urllib.parse import urlsplit, urlunsplit

import psycopg
from psycopg.rows import dict_row

from app.config import get_media_dir, get_settings

GLOBAL_DDL = """
CREATE TABLE IF NOT EXISTS clinicas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'trial' CHECK (estado IN ('trial', 'activo', 'suspendido', 'gratis')),
    trial_expires DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL DEFAULT 'admin',
    session_version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS superusuarios (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagos_clinicas (
    id SERIAL PRIMARY KEY,
    clinica_id INTEGER NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    monto REAL NOT NULL CHECK (monto >= 0),
    fecha DATE NOT NULL,
    periodo_desde DATE,
    periodo_hasta DATE,
    referencia TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

GLOBAL_BRAND_DDL = """
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS color_primary TEXT;
"""

GLOBAL_ESTADO_DDL = """
ALTER TABLE clinicas DROP CONSTRAINT IF EXISTS clinicas_estado_check;
ALTER TABLE clinicas ADD CONSTRAINT clinicas_estado_check
    CHECK (estado IN ('trial', 'activo', 'suspendido', 'gratis'));
"""

GLOBAL_SESSION_DDL = """
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
"""

GLOBAL_FERNET_DDL = """
ALTER TABLE clinicas DROP COLUMN IF EXISTS fernet_key;
"""

GLOBAL_PASSWORD_DDL = """
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
"""

TENANT_DDL = """
CREATE TABLE IF NOT EXISTS pacientes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    ci TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    phone_number TEXT,
    home TEXT,
    represent_name TEXT,
    represent_ci TEXT,
    consult_reason TEXT,
    present_issues TEXT
);

CREATE TABLE IF NOT EXISTS antecedentes_personales (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL UNIQUE REFERENCES pacientes(id) ON DELETE CASCADE,
    ear_nose_throat TEXT,
    respiratory TEXT,
    allergy TEXT,
    cardiovascular TEXT,
    gastrointestinal TEXT,
    endocrine TEXT,
    renal TEXT,
    hepatic TEXT,
    neurologic TEXT,
    neoplastic TEXT,
    blood TEXT,
    viral TEXT,
    gynecologic TEXT,
    covid TEXT,
    hiv TEXT,
    surgeries TEXT,
    medications TEXT,
    hepatitis_vaccine TEXT,
    covid_vaccine TEXT,
    family_history TEXT
);

CREATE TABLE IF NOT EXISTS examen_fisico (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL UNIQUE REFERENCES pacientes(id) ON DELETE CASCADE,
    extraoral TEXT,
    intraoral_tb TEXT,
    intraoral_td TEXT,
    periodontal TEXT,
    pa TEXT
);

CREATE TABLE IF NOT EXISTS odontograms (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS odontogram_details (
    id SERIAL PRIMARY KEY,
    odontogram_id INTEGER NOT NULL REFERENCES odontograms(id) ON DELETE CASCADE,
    tooth INTEGER,
    face TEXT,
    affected TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS tratamiento (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    diagnosis TEXT,
    treatment_plan TEXT NOT NULL DEFAULT '',
    date TEXT
);

CREATE TABLE IF NOT EXISTS abonos (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    date TEXT,
    description TEXT,
    treatment_cost REAL NOT NULL DEFAULT 0,
    amount REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
    remaining REAL NOT NULL DEFAULT 0 CHECK (remaining >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pacientes_entry_date ON pacientes (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON odontograms (patient_id);
CREATE INDEX IF NOT EXISTS idx_tratamiento_patient ON tratamiento (patient_id, date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_abonos_patient ON abonos (patient_id, id DESC);
"""

SCHEMA_VERSION_TABLE = """
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
);
"""

CITAS_DDL = """
CREATE TABLE IF NOT EXISTS citas (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    duracion_min INTEGER NOT NULL DEFAULT 30 CHECK (duracion_min > 0),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completada', 'cancelada', 'no_presento')),
    notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas (fecha, hora);
"""

LATEST_SCHEMA_VERSION = 2

MIGRATIONS = {
    1: TENANT_DDL,
    2: CITAS_DDL,
}


@contextmanager
def admin_connection() -> Iterator[psycopg.Connection]:
    settings = get_settings()
    with psycopg.connect(settings.database_url_admin, row_factory=dict_row) as conn:
        yield conn


def tenant_db_name(clinica_id: int) -> str:
    return f"tenant_{clinica_id}"


def tenant_db_url(clinica_id: int) -> str:
    settings = get_settings()
    parts = urlsplit(settings.database_url_admin)
    return urlunsplit(
        (parts.scheme, parts.netloc, tenant_db_name(clinica_id), parts.query, "")
    )


def init_global_schema() -> None:
    with admin_connection() as conn:
        conn.execute(GLOBAL_DDL)
        conn.execute(GLOBAL_BRAND_DDL)
        conn.execute(GLOBAL_ESTADO_DDL)
        conn.execute(GLOBAL_SESSION_DDL)
        conn.execute(GLOBAL_FERNET_DDL)
        conn.execute(GLOBAL_PASSWORD_DDL)
    (get_media_dir() / "logos").mkdir(parents=True, exist_ok=True)


def create_tenant_database(clinica_id: int) -> None:
    db_name = tenant_db_name(clinica_id)
    settings = get_settings()
    with psycopg.connect(
        settings.database_url_admin, row_factory=dict_row, autocommit=True
    ) as conn:
        conn.execute(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
            (db_name,),
        )
        conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        conn.execute(f'CREATE DATABASE "{db_name}"')


def list_tenant_databases() -> list[str]:
    with admin_connection() as conn:
        rows = conn.execute(
            "SELECT datname FROM pg_database WHERE datname LIKE 'tenant\\_%' ORDER BY datname"
        ).fetchall()
    return [row["datname"] for row in rows]


def get_schema_version(conn: psycopg.Connection) -> int:
    conn.execute(SCHEMA_VERSION_TABLE)
    row = conn.execute("SELECT version FROM schema_version LIMIT 1").fetchone()
    return row["version"] if row else 0


def set_schema_version(conn: psycopg.Connection, version: int) -> None:
    conn.execute("DELETE FROM schema_version")
    conn.execute("INSERT INTO schema_version (version) VALUES (%s)", (version,))


def run_tenant_migrations(conn: psycopg.Connection) -> int:
    current = get_schema_version(conn)
    applied = 0
    for version in range(current + 1, LATEST_SCHEMA_VERSION + 1):
        with conn.transaction():
            conn.execute(MIGRATIONS[version])
            set_schema_version(conn, version)
        applied += 1
    return applied


def init_tenant_schema(conn: psycopg.Connection) -> None:
    run_tenant_migrations(conn)


def migrate_all_tenants() -> dict[str, int]:
    results: dict[str, int] = {}
    with admin_connection() as admin:
        rows = admin.execute(
            "SELECT datname FROM pg_database WHERE datname LIKE 'tenant\\_%' ORDER BY datname"
        ).fetchall()
    for row in rows:
        db_name = row["datname"]
        with psycopg.connect(tenant_db_url_from_name(db_name), row_factory=dict_row) as conn:
            results[db_name] = run_tenant_migrations(conn)
    return results


def tenant_db_url_from_name(db_name: str) -> str:
    settings = get_settings()
    parts = urlsplit(settings.database_url_admin)
    return urlunsplit((parts.scheme, parts.netloc, db_name, parts.query, ""))
