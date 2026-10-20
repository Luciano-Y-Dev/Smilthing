from datetime import date

from fastapi import HTTPException

from app import crypto
from app.deps import TenantScope
from app.gate import check_patient_limit
from app.models import (
    MedicalHistory,
    Odontogram,
    OdontogramDetail,
    OralExam,
    Patient,
    PatientFull,
    PatientWithBalance,
    Payment,
    SavePatientInput,
    Treatment,
)


def _patient_from_row(row: dict, fernet_key: str) -> Patient:
    return Patient(
        id=row["id"],
        name=crypto.decrypt_field(row["name"], fernet_key) or "",
        lastName=crypto.decrypt_field(row["last_name"], fernet_key) or "",
        age=row["age"],
        CI=crypto.decrypt_field(row["ci"], fernet_key) or "",
        entryDate=row["entry_date"],
        phoneNumber=crypto.decrypt_field(row["phone_number"], fernet_key),
        home=crypto.decrypt_field(row["home"], fernet_key),
        representName=crypto.decrypt_field(row["represent_name"], fernet_key),
        representCI=crypto.decrypt_field(row["represent_ci"], fernet_key),
        consultReason=crypto.decrypt_field(row["consult_reason"], fernet_key),
        presentIssues=crypto.decrypt_field(row["present_issues"], fernet_key),
    )


def _patient_with_balance_from_row(row: dict, fernet_key: str) -> PatientWithBalance:
    patient = _patient_from_row(row, fernet_key)
    return PatientWithBalance(**patient.model_dump(), remaining=float(row["remaining"] or 0))


def _medical_history_from_row(row: dict, fernet_key: str) -> MedicalHistory:
    def d(key: str) -> str | None:
        return crypto.decrypt_field(row[key], fernet_key)

    return MedicalHistory(
        id=row["id"],
        patientID=row["patient_id"],
        earNoseThroat=d("ear_nose_throat"),
        respiratory=d("respiratory"),
        allergy=d("allergy"),
        cardiovascular=d("cardiovascular"),
        gastrointestinal=d("gastrointestinal"),
        endocrine=d("endocrine"),
        renal=d("renal"),
        hepatic=d("hepatic"),
        neurologic=d("neurologic"),
        neoplastic=d("neoplastic"),
        blood=d("blood"),
        viral=d("viral"),
        gynecologic=d("gynecologic"),
        covid=d("covid"),
        hiv=d("hiv"),
        surgeries=d("surgeries"),
        medications=d("medications"),
        hepatitisVaccine=d("hepatitis_vaccine"),
        covidVaccine=d("covid_vaccine"),
        familyHistory=d("family_history"),
    )


def _oral_exam_from_row(row: dict, fernet_key: str) -> OralExam:
    def d(key: str) -> str | None:
        return crypto.decrypt_field(row[key], fernet_key)

    return OralExam(
        id=row["id"],
        patientID=row["patient_id"],
        extraoral=d("extraoral"),
        intraoralTB=d("intraoral_tb"),
        intraoralTD=d("intraoral_td"),
        periodontal=d("periodontal"),
        PA=d("pa"),
    )


def _odontogram_from_row(row: dict, fernet_key: str) -> Odontogram:
    return Odontogram(
        id=row["id"],
        patientID=row["patient_id"],
        notes=crypto.decrypt_field(row["notes"], fernet_key),
    )


def _detail_from_row(row: dict, fernet_key: str) -> OdontogramDetail:
    return OdontogramDetail(
        id=row["id"],
        odontogramID=row["odontogram_id"],
        tooth=row["tooth"],
        face=crypto.decrypt_field(row["face"], fernet_key),
        affected=crypto.decrypt_field(row["affected"], fernet_key) or "",
        description=crypto.decrypt_field(row["description"], fernet_key),
    )


def _treatment_from_row(row: dict, fernet_key: str) -> Treatment:
    return Treatment(
        id=row["id"],
        patientID=row["patient_id"],
        diagnosis=crypto.decrypt_field(row["diagnosis"], fernet_key),
        treatmentPlan=crypto.decrypt_field(row["treatment_plan"], fernet_key),
        date=row["date"],
    )


def _payment_from_row(row: dict, fernet_key: str) -> Payment:
    return Payment(
        id=row["id"],
        patientID=row["patient_id"],
        date=row["date"],
        description=crypto.decrypt_field(row["description"], fernet_key),
        treatmentCost=float(row["treatment_cost"]),
        amount=float(row["amount"]),
        remaining=float(row["remaining"]),
    )


_MH_FIELDS: dict[str, str] = {
    "earNoseThroat": "ear_nose_throat",
    "respiratory": "respiratory",
    "allergy": "allergy",
    "cardiovascular": "cardiovascular",
    "gastrointestinal": "gastrointestinal",
    "endocrine": "endocrine",
    "renal": "renal",
    "hepatic": "hepatic",
    "neurologic": "neurologic",
    "neoplastic": "neoplastic",
    "blood": "blood",
    "viral": "viral",
    "gynecologic": "gynecologic",
    "covid": "covid",
    "hiv": "hiv",
    "surgeries": "surgeries",
    "medications": "medications",
    "hepatitisVaccine": "hepatitis_vaccine",
    "covidVaccine": "covid_vaccine",
    "familyHistory": "family_history",
}

_OE_FIELDS: dict[str, str] = {
    "extraoral": "extraoral",
    "intraoralTB": "intraoral_tb",
    "intraoralTD": "intraoral_td",
    "periodontal": "periodontal",
    "PA": "pa",
}

_BALANCE_SQL = """
SELECT p.*, COALESCE(a.remaining, 0) AS remaining
FROM pacientes p
LEFT JOIN LATERAL (
    SELECT remaining FROM abonos WHERE patient_id = p.id ORDER BY id DESC LIMIT 1
) a ON true
"""


def list_patients(scope: TenantScope) -> list[PatientWithBalance]:
    rows = scope.conn.execute(
        f"{_BALANCE_SQL} ORDER BY p.entry_date DESC, p.id DESC"
    ).fetchall()
    return [_patient_with_balance_from_row(r, scope.fernet_key) for r in rows]


def list_pending(scope: TenantScope) -> list[PatientWithBalance]:
    rows = scope.conn.execute(
        f"{_BALANCE_SQL} WHERE COALESCE(a.remaining, 0) > 0 ORDER BY p.entry_date DESC, p.id DESC"
    ).fetchall()
    return [_patient_with_balance_from_row(r, scope.fernet_key) for r in rows]


def list_paid(scope: TenantScope) -> list[PatientWithBalance]:
    rows = scope.conn.execute(
        f"{_BALANCE_SQL} WHERE COALESCE(a.remaining, 0) = 0 ORDER BY p.entry_date DESC, p.id DESC"
    ).fetchall()
    return [_patient_with_balance_from_row(r, scope.fernet_key) for r in rows]


def get_patient(scope: TenantScope, patient_id: int) -> Patient | None:
    row = scope.conn.execute(
        "SELECT * FROM pacientes WHERE id = %s", (patient_id,)
    ).fetchone()
    return _patient_from_row(row, scope.fernet_key) if row else None


def get_remaining(scope: TenantScope, patient_id: int) -> float:
    row = scope.conn.execute(
        "SELECT remaining FROM abonos WHERE patient_id = %s ORDER BY id DESC LIMIT 1",
        (patient_id,),
    ).fetchone()
    return float(row["remaining"]) if row else 0.0


def get_patient_full(scope: TenantScope, patient_id: int) -> PatientFull | None:
    patient = get_patient(scope, patient_id)
    if patient is None:
        return None
    ant_row = scope.conn.execute(
        "SELECT * FROM antecedentes_personales WHERE patient_id = %s", (patient_id,)
    ).fetchone()
    exam_row = scope.conn.execute(
        "SELECT * FROM examen_fisico WHERE patient_id = %s", (patient_id,)
    ).fetchone()
    odo_row = scope.conn.execute(
        "SELECT * FROM odontograms WHERE patient_id = %s ORDER BY id DESC LIMIT 1",
        (patient_id,),
    ).fetchone()
    details: list[OdontogramDetail] = []
    if odo_row is not None:
        detail_rows = scope.conn.execute(
            "SELECT * FROM odontogram_details WHERE odontogram_id = %s ORDER BY id",
            (odo_row["id"],),
        ).fetchall()
        details = [_detail_from_row(r, scope.fernet_key) for r in detail_rows]
    treatment_rows = scope.conn.execute(
        "SELECT * FROM tratamiento WHERE patient_id = %s ORDER BY date DESC NULLS LAST, id DESC",
        (patient_id,),
    ).fetchall()
    return PatientFull(
        patient=patient,
        medicalHistory=_medical_history_from_row(ant_row, scope.fernet_key)
        if ant_row
        else None,
        oralExam=_oral_exam_from_row(exam_row, scope.fernet_key) if exam_row else None,
        odontogram=_odontogram_from_row(odo_row, scope.fernet_key) if odo_row else None,
        odontogramDetails=details,
        treatments=[_treatment_from_row(r, scope.fernet_key) for r in treatment_rows],
        remaining=get_remaining(scope, patient_id),
    )


def delete_patient(scope: TenantScope, patient_id: int) -> bool:
    with scope.conn.transaction():
        result = scope.conn.execute("DELETE FROM pacientes WHERE id = %s", (patient_id,))
    return result.rowcount > 0


def ci_exists(
    scope: TenantScope, ci: str, exclude_patient_id: int | None = None
) -> bool:
    target = ci.strip()
    rows = scope.conn.execute("SELECT id, ci FROM pacientes").fetchall()
    for row in rows:
        if exclude_patient_id is not None and row["id"] == exclude_patient_id:
            continue
        plain = crypto.decrypt_field(row["ci"], scope.fernet_key)
        if plain is not None and plain.strip() == target:
            return True
    return False


def filter_patients(
    scope: TenantScope,
    search_text: str = "",
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[PatientWithBalance]:
    patients = list_patients(scope)
    text = search_text.strip().lower()
    result: list[PatientWithBalance] = []
    for p in patients:
        if text:
            haystack = f"{p.name} {p.lastName} {p.CI}".lower()
            if text not in haystack:
                continue
        if date_from or date_to:
            try:
                entry = date.fromisoformat(p.entryDate)
            except ValueError:
                continue
            if date_from and entry < date_from:
                continue
            if date_to and entry > date_to:
                continue
        result.append(p)
    return result


def _has_abonos(scope: TenantScope, patient_id: int) -> bool:
    row = scope.conn.execute(
        "SELECT 1 FROM abonos WHERE patient_id = %s LIMIT 1", (patient_id,)
    ).fetchone()
    return row is not None


def save_patient(scope: TenantScope, data: SavePatientInput) -> int:
    is_new = data.id is None
    check_patient_limit(scope.ctx, creating_new=is_new)
    patient_id = data.id
    if patient_id is not None:
        existing = get_patient(scope, patient_id)
        if existing is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "paciente_no_encontrado",
                    "message": "El paciente no existe.",
                },
            )

    def enc(v: str | None) -> str | None:
        return crypto.encrypt_field(v, scope.fernet_key)

    ci = enc(data.CI)
    represent_ci = enc(data.representCI)
    name_enc = enc(data.name)
    last_name_enc = enc(data.lastName)
    phone_enc = enc(data.phoneNumber)
    home_enc = enc(data.home)
    represent_name_enc = enc(data.representName)
    consult_reason_enc = enc(data.consultReason)
    present_issues_enc = enc(data.presentIssues)

    create_payment = False
    if data.payment is not None and (is_new or not _has_abonos(scope, patient_id or 0)):
        create_payment = True

    entry_date = data.entryDate.isoformat()
    with scope.conn.transaction():
        if is_new:
            row = scope.conn.execute(
                """
                INSERT INTO pacientes (
                    name, last_name, age, ci, entry_date, phone_number, home,
                    represent_name, represent_ci, consult_reason, present_issues
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    name_enc,
                    last_name_enc,
                    data.age,
                    ci,
                    entry_date,
                    phone_enc,
                    home_enc,
                    represent_name_enc,
                    represent_ci,
                    consult_reason_enc,
                    present_issues_enc,
                ),
            ).fetchone()
            patient_id = row["id"]
        else:
            scope.conn.execute(
                """
                UPDATE pacientes SET
                    name = %s, last_name = %s, age = %s, ci = %s, entry_date = %s,
                    phone_number = %s, home = %s, represent_name = %s,
                    represent_ci = %s, consult_reason = %s, present_issues = %s
                WHERE id = %s
                """,
                (
                    name_enc,
                    last_name_enc,
                    data.age,
                    ci,
                    entry_date,
                    phone_enc,
                    home_enc,
                    represent_name_enc,
                    represent_ci,
                    consult_reason_enc,
                    present_issues_enc,
                    patient_id,
                ),
            )

        if data.medicalHistory is not None:
            m = data.medicalHistory
            values = {
                "earNoseThroat": enc(m.earNoseThroat),
                "respiratory": enc(m.respiratory),
                "allergy": enc(m.allergy),
                "cardiovascular": enc(m.cardiovascular),
                "gastrointestinal": enc(m.gastrointestinal),
                "endocrine": enc(m.endocrine),
                "renal": enc(m.renal),
                "hepatic": enc(m.hepatic),
                "neurologic": enc(m.neurologic),
                "neoplastic": enc(m.neoplastic),
                "blood": enc(m.blood),
                "viral": enc(m.viral),
                "gynecologic": enc(m.gynecologic),
                "covid": enc(m.covid),
                "hiv": enc(m.hiv),
                "surgeries": enc(m.surgeries),
                "medications": enc(m.medications),
                "hepatitisVaccine": enc(m.hepatitisVaccine),
                "covidVaccine": enc(m.covidVaccine),
                "familyHistory": enc(m.familyHistory),
            }
            sent = [f for f in _MH_FIELDS if f in m.model_fields_set]
            exists = scope.conn.execute(
                "SELECT 1 FROM antecedentes_personales WHERE patient_id = %s",
                (patient_id,),
            ).fetchone()
            if exists is None:
                cols = ["patient_id", *_MH_FIELDS.values()]
                scope.conn.execute(
                    f"INSERT INTO antecedentes_personales ({', '.join(cols)}) "
                    f"VALUES ({', '.join(['%s'] * len(cols))})",
                    [patient_id, *[values[f] for f in _MH_FIELDS]],
                )
            elif sent:
                sets = ", ".join(f"{_MH_FIELDS[f]} = %s" for f in sent)
                scope.conn.execute(
                    f"UPDATE antecedentes_personales SET {sets} WHERE patient_id = %s",
                    [values[f] for f in sent] + [patient_id],
                )

        if data.oralExam is not None:
            e = data.oralExam
            values = {
                "extraoral": enc(e.extraoral),
                "intraoralTB": enc(e.intraoralTB),
                "intraoralTD": enc(e.intraoralTD),
                "periodontal": enc(e.periodontal),
                "PA": enc(e.PA),
            }
            sent = [f for f in _OE_FIELDS if f in e.model_fields_set]
            exists = scope.conn.execute(
                "SELECT 1 FROM examen_fisico WHERE patient_id = %s", (patient_id,)
            ).fetchone()
            if exists is None:
                cols = ["patient_id", *_OE_FIELDS.values()]
                scope.conn.execute(
                    f"INSERT INTO examen_fisico ({', '.join(cols)}) "
                    f"VALUES ({', '.join(['%s'] * len(cols))})",
                    [patient_id, *[values[f] for f in _OE_FIELDS]],
                )
            elif sent:
                sets = ", ".join(f"{_OE_FIELDS[f]} = %s" for f in sent)
                scope.conn.execute(
                    f"UPDATE examen_fisico SET {sets} WHERE patient_id = %s",
                    [values[f] for f in sent] + [patient_id],
                )

        if data.odontogram is not None:
            notes_enc = enc(data.odontogram.notes)
            odo_row = scope.conn.execute(
                "SELECT id FROM odontograms WHERE patient_id = %s ORDER BY id DESC LIMIT 1",
                (patient_id,),
            ).fetchone()
            if odo_row is not None:
                odontogram_id = odo_row["id"]
                scope.conn.execute(
                    "UPDATE odontograms SET notes = %s WHERE id = %s",
                    (notes_enc, odontogram_id),
                )
            else:
                new_row = scope.conn.execute(
                    "INSERT INTO odontograms (patient_id, notes) VALUES (%s, %s) RETURNING id",
                    (patient_id, notes_enc),
                ).fetchone()
                odontogram_id = new_row["id"]
            scope.conn.execute(
                "DELETE FROM odontogram_details WHERE odontogram_id = %s", (odontogram_id,)
            )
            for aff in data.odontogram.affections:
                scope.conn.execute(
                    """
                    INSERT INTO odontogram_details (odontogram_id, tooth, face, affected, description)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        odontogram_id,
                        aff.tooth,
                        enc(aff.face),
                        enc(aff.affected),
                        enc(aff.description),
                    ),
                )

        if create_payment and data.payment is not None:
            remaining = data.payment.treatmentCost - data.payment.amount
            if remaining < 0:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "code": "abono_excede_costo",
                        "message": "El monto abonado excede el costo del tratamiento.",
                    },
                )
            scope.conn.execute(
                """
                INSERT INTO abonos (patient_id, date, description, treatment_cost, amount, remaining)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    patient_id,
                    date.today().isoformat(),
                    enc(data.payment.description),
                    data.payment.treatmentCost,
                    data.payment.amount,
                    remaining,
                ),
            )

    return patient_id
