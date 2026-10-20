"""Semilla de citas de demostración en la clínica del video (Dental Studio).

Crea una agenda realista (esta semana y la siguiente) con distintos estados
(pendiente, completada, no presentó, cancelada) para mostrar el módulo de
citas en el video. Las fechas se calculan relativas a hoy, así que el
calendario siempre se ve actualizado.

Idempotente: borra las citas existentes de la clínica y las vuelve a crear.

Uso (desde server/):
    .venv\\Scripts\\python.exe scripts\\seed_citas.py
"""

from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db, tenancy  # noqa: E402
from app.auth import AuthContext  # noqa: E402
from app.deps import TenantScope  # noqa: E402
from app.models import ClinicaInfo, SaveCitaInput  # noqa: E402
from app.services import cita_service  # noqa: E402

# (patient_id, day_offset, hora, duracion_min, notas, estado)
# day_offset: 0 = hoy, -1 = ayer, 1 = mañana, ...
# estado: None = pendiente
CITAS: list[tuple[int, int, str, int, str, str | None]] = [
    # ---- Ayer ----
    (4, -1, "10:00", 45, "Raspado y alisado radicular - cuadrante superior.", "completada"),
    (6, -1, "11:30", 30, "Sellantes y restauración temporal 74-84.", "completada"),
    (8, -1, "14:00", 30, "Exodoncia 38 con alveolotomía.", "cancelada"),
    # ---- Hace 2 días ----
    (9, -2, "09:30", 30, "Valoración periodontal inicial.", "completada"),
    (10, -2, "16:00", 45, "Consulta de control post-restauración.", "no_presento"),
    # ---- Hoy ----
    (1, 0, "09:00", 30, "Control post-operatorio de endodoncia 36.", "completada"),
    (3, 0, "10:30", 45, "Primera consulta de ortodoncia.", "completada"),
    (5, 0, "12:00", 30, "Restauración estética 11 - composite.", "no_presento"),
    (2, 0, "15:00", 60, "Profilaxis y control de placa.", None),
    (7, 0, "16:30", 30, "Revisión de sensibilidad al frío.", None),
    # ---- Mañana ----
    (11, 1, "09:00", 60, "Instalación de aparato ortodóncico.", None),
    (1, 1, "11:00", 30, "Control de conductos 36.", None),
    # ---- En 2 días ----
    (5, 2, "10:00", 30, "Retiro de estuche y pulido - restauración 11.", None),
    (3, 2, "15:30", 45, "Primer ajuste de aparato ortodóncico.", None),
    # ---- En 3 días ----
    (2, 3, "09:00", 30, "Control post-limpieza dental.", None),
]


def _find_dental_studio() -> int | None:
    with db.admin_connection() as conn:
        row = conn.execute(
            """
            SELECT c.id FROM usuarios u
            JOIN clinicas c ON c.id = u.clinica_id
            WHERE u.email = 'admin@dentalstudio.com' LIMIT 1
            """
        ).fetchone()
    return row["id"] if row else None


def main() -> None:
    print("== Seed de citas: clínica Dental Studio ==")
    clinica_id = _find_dental_studio()
    if clinica_id is None:
        print("  [error] No se encontró Dental Studio (admin@dentalstudio.com).")
        sys.exit(1)

    ctx = AuthContext(
        user_id=0,
        clinica_id=clinica_id,
        email="admin@dentalstudio.com",
        rol="admin",
        clinica=ClinicaInfo(id=clinica_id, nombre="Dental Studio", estado="gratis"),
    )
    with tenancy.get_tenant_db(clinica_id) as conn:
        scope = TenantScope(
            ctx=ctx,
            conn=conn,
            fernet_key=tenancy.get_clinica_fernet_key(clinica_id),
        )
        # Limpiar citas previas para que el seed sea repetible
        scope.conn.execute("DELETE FROM citas")
        scope.conn.commit()

        hoy = date.today()
        creadas = 0
        for patient_id, offset, hora, dur, notas, estado in CITAS:
            fecha = hoy + timedelta(days=offset)
            cita = cita_service.create_cita(
                scope,
                SaveCitaInput(
                    patientID=patient_id,
                    fecha=fecha,
                    hora=hora,
                    duracionMin=dur,
                    notas=notas,
                ),
            )
            if estado:
                cita_service.set_estado(scope, cita.id, estado)
            creadas += 1

        total = scope.conn.execute("SELECT count(*) AS n FROM citas").fetchone()["n"]
        print(f"  [ok]   {creadas} citas creadas en Dental Studio (id {clinica_id}).")
        print(f"         Rango: {hoy - timedelta(days=2)} a {hoy + timedelta(days=3)}.")
        print(f"         Total en agenda: {total}.")
    print("Listo. Abre la app de Dental Studio > Citas para ver la agenda.")


if __name__ == "__main__":
    main()
