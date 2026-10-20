"""Semilla de pacientes dummy en la clínica Admin (admin@admin.com).

Solo rellena la clínica Admin ya existente con pacientes de demostración
(antecedentes, examen, odontograma, tratamientos y abonos). No crea clínicas.

Idempotente: si la clínica Admin ya tiene pacientes, no hace nada.

Uso (desde server/):
    .venv\\Scripts\\python.exe scripts\\seed_demo.py
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import db, tenancy  # noqa: E402
from app.auth import AuthContext  # noqa: E402
from app.deps import TenantScope  # noqa: E402
from app.models import (  # noqa: E402
    ClinicaInfo,
    MedicalHistoryInput,
    OdontogramAffection,
    OdontogramInput,
    OralExamInput,
    SavePatientInput,
    SavePaymentInput,
    SaveTreatmentInput,
)
from app.services import abono_service, patient_service, tratamiento_service  # noqa: E402


def _mh_default() -> MedicalHistoryInput:
    return MedicalHistoryInput(
        earNoseThroat="No",
        respiratory="No",
        allergy="No",
        cardiovascular="No",
        gastrointestinal="No",
        endocrine="No",
        renal="No",
        hepatic="No",
        neurologic="No",
        neoplastic="No",
        blood="No",
        viral="No",
        gynecologic="No",
        covid="No",
        hiv="No",
        surgeries="No",
        medications="No",
        hepatitisVaccine="No",
        covidVaccine="No",
        familyHistory="No",
    )


def _oe_default() -> OralExamInput:
    return OralExamInput(
        extraoral="Simetría facial conservada.",
        intraoralTB="Sin lesiones en tejidos blandos.",
        intraoralTD="Sin lesiones en tejidos blandos.",
        periodontal="Encías sin inflamación aparente.",
        PA="oclusión clase I",
    )


ADMIN_PATIENTS: list[dict] = [
    {
        "input": SavePatientInput(
            name="María Gabriela",
            lastName="Rivas Salas",
            age=29,
            CI="20123456",
            entryDate=date(2026, 3, 10),
            phoneNumber="04143651287",
            home="Valencia",
            consultReason="Dolor en molar inferior derecha al masticar",
            presentIssues="Dolor intermitente hace tres semanas.",
            medicalHistory=MedicalHistoryInput(
                **{**_mh_default().model_dump(), "allergy": "Alergia a penicilina", "blood": "O+"}
            ),
            oralExam=_oe_default(),
            odontogram=OdontogramInput(
                notes="Caries oclusal 36. Se indica endodoncia.",
                affections=[
                    OdontogramAffection(tooth=36, face="O", affected="Yes", description="Caries oclusal profunda"),
                    OdontogramAffection(tooth=37, face="O", affected="Resina", description="Empaste previo"),
                ],
            ),
        ),
        "tratamientos": [
            ("Caries oclusal 36 - endodoncia indicada", date(2026, 3, 10)),
            ("Obturación de conductos 36", date(2026, 4, 15)),
        ],
        "abonos": [
            (date(2026, 3, 10), 100.0, "Abono inicial", 280.0),
            (date(2026, 4, 15), 80.0, "Segundo abono", None),
        ],
    },
    {
        "input": SavePatientInput(
            name="Luis Enrique",
            lastName="Mendoza Páez",
            age=41,
            CI="18456789",
            entryDate=date(2026, 1, 20),
            phoneNumber="04128974563",
            home="Maracaibo",
            consultReason="Limpieza dental de control",
            presentIssues="No presenta molestias actuales.",
            medicalHistory=MedicalHistoryInput(
                **{
                    **_mh_default().model_dump(),
                    "cardiovascular": "Hipertensión controlada",
                    "medications": "Enalapril 10mg",
                    "blood": "A+",
                }
            ),
            oralExam=_oe_default(),
            odontogram=OdontogramInput(
                notes="Perfilaxis realizada. 18 ausente previamente.",
                affections=[
                    OdontogramAffection(tooth=18, face="O", affected="Ausente", description="Extraída hace años"),
                    OdontogramAffection(tooth=46, face="O", affected="Endodoncia", description="Tratamiento de conductos previo"),
                ],
            ),
        ),
        "tratamientos": [("Profilaxis y odontología preventiva", date(2026, 1, 20))],
        "abonos": [(date(2026, 1, 20), 80.0, "Pago único", 80.0)],
    },
    {
        "input": SavePatientInput(
            name="Andreína Josefina",
            lastName="Quintero Bohórquez",
            age=17,
            CI="30258147",
            entryDate=date(2026, 6, 5),
            phoneNumber="04245562198",
            home="Guacara",
            representName="Carina Bohórquez de Quintero",
            representCI="17854236",
            consultReason="Ortodoncia - primera consulta",
            presentIssues="No presenta molestias actuales.",
            medicalHistory=_mh_default(),
            oralExam=_oe_default(),
            odontogram=OdontogramInput(
                notes="Plan de ortodoncia indicado. Dos empastes previos.",
                affections=[
                    OdontogramAffection(tooth=16, face="O", affected="Resina", description="Empaste oclusal"),
                    OdontogramAffection(tooth=26, face="O", affected="Resina", description="Empaste oclusal"),
                ],
            ),
        ),
        "tratamientos": [("Evaluación ortodóncica - plan de instalación", date(2026, 6, 5))],
        "abonos": [
            (date(2026, 6, 5), 150.0, "Enganche de ortodoncia", 600.0),
            (date(2026, 7, 5), 150.0, "Cuota mensual", None),
            (date(2026, 8, 5), 150.0, "Cuota mensual", None),
            (date(2026, 9, 5), 150.0, "Cuota mensual", None),
        ],
    },
    {
        "input": SavePatientInput(
            name="José Ramón",
            lastName="Castillo Romero",
            age=56,
            CI="10236547",
            entryDate=date(2026, 2, 14),
            phoneNumber="04141122334",
            home="Valencia",
            consultReason="Sangrado de encías al cepillarse",
            presentIssues="Sangrado gingival intermitente desde enero.",
            medicalHistory=MedicalHistoryInput(
                **{
                    **_mh_default().model_dump(),
                    "endocrine": "Diabetes tipo 2",
                    "medications": "Metformina 850mg",
                    "blood": "B+",
                }
            ),
            oralExam=OralExamInput(
                **{
                    **_oe_default().model_dump(),
                    "periodontal": "Encías con inflamación leve generalizada.",
                    "PA": "oclusión clase II parcial",
                }
            ),
            odontogram=OdontogramInput(
                notes="28 con corona. 38 ausente. Raspado indicado.",
                affections=[
                    OdontogramAffection(tooth=28, face="O", affected="Corona", description="Corona de porcelana"),
                    OdontogramAffection(tooth=38, face="O", affected="Ausente", description="Extraída"),
                ],
            ),
        ),
        "tratamientos": [
            ("Raspado y alisado radicular - cuadrante superior", date(2026, 2, 14)),
            ("Control periodontal", date(2026, 5, 20)),
        ],
        "abonos": [
            (date(2026, 2, 14), 120.0, "Abono inicial", 240.0),
            (date(2026, 5, 20), 60.0, "Segundo abono", None),
        ],
    },
    {
        "input": SavePatientInput(
            name="Yamilet Andreina",
            lastName="Delgado Sequeira",
            age=34,
            CI="25639871",
            entryDate=date(2026, 9, 2),
            phoneNumber="04167743125",
            home="San Diego",
            consultReason="Fractura de diente anterior por golpe",
            presentIssues="Sensibilidad estética y al frío.",
            medicalHistory=_mh_default(),
            oralExam=_oe_default(),
            odontogram=OdontogramInput(
                notes="Fractura coronaria 11. Restauración estética indicada.",
                affections=[
                    OdontogramAffection(tooth=11, face="V", affected="Yes", description="Fractura incisal"),
                ],
            ),
        ),
        "tratamientos": [("Restauración estética 11 - composite", date(2026, 9, 2))],
        "abonos": [(date(2026, 9, 2), 90.0, "Abono inicial", 180.0)],
    },
    {
        "input": SavePatientInput(
            name="Roberto Carlos",
            lastName="Salazar Ortega",
            age=8,
            CI="31547896",
            entryDate=date(2026, 8, 18),
            phoneNumber="04248832156",
            home="Valencia",
            representName="Mariela Ortega de Salazar",
            representCI="19245678",
            consultReason="Control de caries en dientes temporales",
            presentIssues="Dolor leve al masticar.",
            medicalHistory=_mh_default(),
            oralExam=OralExamInput(
                **{**_oe_default().model_dump(), "PA": "oclusión temporal normal"}
            ),
            odontogram=OdontogramInput(
                notes="Caries en molares temporales inferiores.",
                affections=[
                    OdontogramAffection(tooth=74, face="O", affected="Yes", description="Caries oclusal temporal"),
                    OdontogramAffection(tooth=84, face="O", affected="Yes", description="Caries oclusal temporal"),
                ],
            ),
        ),
        "tratamientos": [("Sellantes y restauración temporal 74-84", date(2026, 8, 18))],
        "abonos": [(date(2026, 8, 18), 60.0, "Pago único", 60.0)],
    },
    {
        "input": SavePatientInput(
            name="Stephanie Nahomi",
            lastName="Vargas Uzcátegui",
            age=22,
            CI="29874563",
            entryDate=date(2026, 7, 11),
            phoneNumber="04125567789",
            home="Barquisimeto",
            consultReason="Sensibilidad al frío en diente superior",
            presentIssues="Sensibilidad al frío hace un mes.",
            medicalHistory=_mh_default(),
            oralExam=_oe_default(),
            odontogram=OdontogramInput(
                notes="Caries distal 22. Empaste previo 21.",
                affections=[
                    OdontogramAffection(tooth=21, face="D", affected="Resina", description="Empaste distal"),
                    OdontogramAffection(tooth=22, face="D", affected="Yes", description="Caries distal"),
                ],
            ),
        ),
        "tratamientos": [("Restauración 22 - resina", date(2026, 7, 11))],
        "abonos": [(date(2026, 7, 11), 70.0, "Abono inicial", 140.0)],
    },
    {
        "input": SavePatientInput(
            name="Francisco Javier",
            lastName="Páez Rivas",
            age=47,
            CI="15678234",
            entryDate=date(2026, 4, 22),
            phoneNumber="04149900112",
            home="Valencia",
            consultReason="Extracción de muela del juicio inferior",
            presentIssues="Molestia en zona inferior izquierda.",
            medicalHistory=_mh_default(),
            oralExam=_oe_default(),
            odontogram=OdontogramInput(
                notes="38 erupcionada parcialmente. Exodoncia indicada.",
                affections=[
                    OdontogramAffection(tooth=38, face="O", affected="Ausente", description="Extraída"),
                ],
            ),
        ),
        "tratamientos": [("Exodoncia 38 con alveolotomía", date(2026, 4, 22))],
        "abonos": [(date(2026, 4, 22), 100.0, "Pago único", 100.0)],
    },
]


def _find_admin_clinic() -> int | None:
    with db.admin_connection() as conn:
        row = conn.execute(
            """
            SELECT c.id FROM usuarios u
            JOIN clinicas c ON c.id = u.clinica_id
            WHERE u.email = 'admin@admin.com' LIMIT 1
            """
        ).fetchone()
    return row["id"] if row else None


def _seed_admin_clinic_patients(clinica_id: int) -> None:
    ctx = AuthContext(
        user_id=0,
        clinica_id=clinica_id,
        email="admin@admin.com",
        rol="admin",
        clinica=ClinicaInfo(id=clinica_id, nombre="Admin", estado="gratis"),
    )
    with tenancy.get_tenant_db(clinica_id) as conn:
        scope = TenantScope(
            ctx=ctx,
            conn=conn,
            fernet_key=tenancy.get_clinica_fernet_key(clinica_id),
        )
        for spec in ADMIN_PATIENTS:
            patient_id = patient_service.save_patient(scope, spec["input"])
            for diagnosis, t_date in spec["tratamientos"]:
                tratamiento_service.add_tratamiento(
                    scope,
                    patient_id,
                    SaveTreatmentInput(diagnosis=diagnosis, date=t_date),
                )
            for i, (a_date, amount, description, cost) in enumerate(spec["abonos"]):
                abono_service.add_abono(
                    scope,
                    patient_id,
                    SavePaymentInput(
                        amount=amount,
                        date=a_date,
                        description=description,
                        treatmentCost=cost if i == 0 else None,
                    ),
                )


def main() -> None:
    print("== Seed demo: clínica Admin ==")
    admin_cid = _find_admin_clinic()
    if admin_cid is None:
        print("  [error] No se encontró la clínica 'Admin' (admin@admin.com).")
        sys.exit(1)
    existing_patients = tenancy.count_patients(admin_cid)
    if existing_patients > 0:
        print(f"  [skip] La clínica Admin ya tiene {existing_patients} pacientes.")
    else:
        _seed_admin_clinic_patients(admin_cid)
        print(
            f"  [ok]   {len(ADMIN_PATIENTS)} pacientes de demo creados "
            f"(clínica Admin, id {admin_cid})."
        )
    print("Listo. Abre la app de la clínica Admin para ver los pacientes.")


if __name__ == "__main__":
    main()
