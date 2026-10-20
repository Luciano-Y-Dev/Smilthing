from datetime import date, time
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class Patient(BaseModel):
    id: int
    name: str
    lastName: str
    age: int
    CI: str
    entryDate: str
    phoneNumber: str | None = None
    home: str | None = None
    representName: str | None = None
    representCI: str | None = None
    consultReason: str | None = None
    presentIssues: str | None = None


class PatientWithBalance(Patient):
    remaining: float


class MedicalHistory(BaseModel):
    id: int
    patientID: int
    earNoseThroat: str | None = None
    respiratory: str | None = None
    allergy: str | None = None
    cardiovascular: str | None = None
    gastrointestinal: str | None = None
    endocrine: str | None = None
    renal: str | None = None
    hepatic: str | None = None
    neurologic: str | None = None
    neoplastic: str | None = None
    blood: str | None = None
    viral: str | None = None
    gynecologic: str | None = None
    covid: str | None = None
    hiv: str | None = None
    surgeries: str | None = None
    medications: str | None = None
    hepatitisVaccine: str | None = None
    covidVaccine: str | None = None
    familyHistory: str | None = None


class OralExam(BaseModel):
    id: int
    patientID: int
    extraoral: str | None = None
    intraoralTB: str | None = None
    intraoralTD: str | None = None
    periodontal: str | None = None
    PA: str | None = None


class Odontogram(BaseModel):
    id: int
    patientID: int
    notes: str | None = None


class OdontogramDetail(BaseModel):
    id: int
    odontogramID: int
    tooth: int | None = None
    face: str | None = None
    affected: str
    description: str | None = None


class Treatment(BaseModel):
    id: int
    patientID: int
    diagnosis: str | None = None
    treatmentPlan: str | None = None
    date: str | None = None


class Payment(BaseModel):
    id: int
    patientID: int
    date: str | None = None
    description: str | None = None
    treatmentCost: float
    amount: float
    remaining: float


class Cita(BaseModel):
    id: int
    patientID: int
    patientName: str
    fecha: str
    hora: str
    duracionMin: int
    estado: Literal["pendiente", "completada", "cancelada", "no_presento"]
    notas: str | None = None


class OdontogramAffection(BaseModel):
    tooth: int
    face: str
    affected: str
    description: str | None = None


class MedicalHistoryInput(BaseModel):
    earNoseThroat: str | None = None
    respiratory: str | None = None
    allergy: str | None = None
    cardiovascular: str | None = None
    gastrointestinal: str | None = None
    endocrine: str | None = None
    renal: str | None = None
    hepatic: str | None = None
    neurologic: str | None = None
    neoplastic: str | None = None
    blood: str | None = None
    viral: str | None = None
    gynecologic: str | None = None
    covid: str | None = None
    hiv: str | None = None
    surgeries: str | None = None
    medications: str | None = None
    hepatitisVaccine: str | None = None
    covidVaccine: str | None = None
    familyHistory: str | None = None


class OralExamInput(BaseModel):
    extraoral: str | None = None
    intraoralTB: str | None = None
    intraoralTD: str | None = None
    periodontal: str | None = None
    PA: str | None = None


class OdontogramInput(BaseModel):
    notes: str = ""
    affections: list[OdontogramAffection] = Field(default_factory=list)


class PaymentInput(BaseModel):
    treatmentCost: float = Field(ge=0)
    amount: float = Field(ge=0)
    description: str = ""


class SavePatientInput(BaseModel):
    id: int | None = None
    name: str = Field(min_length=1)
    lastName: str = Field(min_length=1)
    age: int = Field(ge=0, le=130)
    CI: str = Field(min_length=1)
    entryDate: date
    phoneNumber: str | None = None
    home: str | None = None
    representName: str | None = None
    representCI: str | None = None
    consultReason: str | None = None
    presentIssues: str | None = None
    medicalHistory: MedicalHistoryInput | None = None
    oralExam: OralExamInput | None = None
    odontogram: OdontogramInput | None = None
    payment: PaymentInput | None = None


class SavePaymentInput(BaseModel):
    amount: float = Field(ge=0)
    date: date
    description: str = ""
    treatmentCost: float | None = Field(default=None, ge=0)


class SaveTreatmentInput(BaseModel):
    diagnosis: str = Field(min_length=1)
    date: date


class SaveCitaInput(BaseModel):
    patientID: int
    fecha: date
    hora: time
    duracionMin: int = Field(default=30, ge=5, le=480)
    notas: str = ""


class CitaEstadoInput(BaseModel):
    estado: Literal["pendiente", "completada", "cancelada", "no_presento"]


class PatientFull(BaseModel):
    patient: Patient
    medicalHistory: MedicalHistory | None = None
    oralExam: OralExam | None = None
    odontogram: Odontogram | None = None
    odontogramDetails: list[OdontogramDetail] = Field(default_factory=list)
    treatments: list[Treatment] = Field(default_factory=list)
    remaining: float


class LoginInput(BaseModel):
    email: str = Field(min_length=1)
    password: str = Field(min_length=1)


class CuentaPasswordInput(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


class UsuarioInfo(BaseModel):
    id: int
    email: str
    rol: str
    must_change_password: bool = False


class ClinicaInfo(BaseModel):
    id: int
    nombre: str
    estado: str
    trial_expires: str | None = None
    logo_url: str | None = None
    color_primary: str | None = None


class MeResponse(BaseModel):
    clinica: ClinicaInfo
    usuario: UsuarioInfo
    dias_restantes: int | None = None


class SuperInfo(BaseModel):
    id: int
    email: str


def _strip_nonempty(v: str) -> str:
    stripped = v.strip()
    if not stripped:
        raise ValueError("no puede estar vacío")
    return stripped


def _strip_optional_nonempty(v: str | None) -> str | None:
    if v is None:
        return None
    return _strip_nonempty(v)


class AdminClinicaCreate(BaseModel):
    nombre: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    dias_trial: int | None = Field(default=None, ge=1, le=365)
    color_primary: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")

    _nombre_strip = field_validator("nombre")(_strip_nonempty)


class AdminClinicaUpdate(BaseModel):
    estado: str | None = Field(default=None, pattern="^(trial|activo|suspendido|gratis)$")
    dias_trial: int | None = Field(default=None, ge=1, le=365)
    color_primary: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    nombre: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=6)

    _nombre_strip = field_validator("nombre")(_strip_optional_nonempty)


class ClinicaAdminRow(BaseModel):
    id: int
    nombre: str
    estado: str
    trial_expires: str | None
    created_at: str
    email_admin: str | None
    pacientes: int
    total_pagado: float
    ultimo_pago: str | None
    logo_url: str | None
    color_primary: str | None


class LogoInfo(BaseModel):
    url: str


class AdminPagoInput(BaseModel):
    monto: float = Field(gt=0)
    fecha: date
    periodo_desde: date | None = None
    periodo_hasta: date | None = None
    referencia: str | None = None
    notas: str | None = None


class AdminPago(BaseModel):
    id: int
    clinica_id: int
    monto: float
    fecha: str
    periodo_desde: str | None
    periodo_hasta: str | None
    referencia: str | None
    notas: str | None


class EstadisticasAdmin(BaseModel):
    clinicas_total: int
    activas: int
    trial: int
    suspendidas: int
    pacientes_total: int
    ingresos_mes: float
    trials_por_vencer: int
