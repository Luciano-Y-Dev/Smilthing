from io import BytesIO

from fpdf import FPDF

from app.config import get_settings
from app.deps import TenantScope
from app.services import abono_service, patient_service, tratamiento_service

ANTECEDENT_LABELS = [
    ("Oido, nariz, garganta", "earNoseThroat"),
    ("Respiratorio", "respiratory"),
    ("Alergias", "allergy"),
    ("Cardiovascular", "cardiovascular"),
    ("Gastrointestinal", "gastrointestinal"),
    ("Endocrino", "endocrine"),
    ("Renal", "renal"),
    ("Hepatico", "hepatic"),
    ("Neurologico", "neurologic"),
    ("Neoplastico", "neoplastic"),
    ("Sanguineo", "blood"),
    ("Viral", "viral"),
    ("Ginecologico", "gynecologic"),
    ("Covid", "covid"),
    ("VIH", "hiv"),
    ("Cirugias", "surgeries"),
    ("Medicamentos", "medications"),
    ("Vacuna hepatitis", "hepatitisVaccine"),
    ("Vacuna covid", "covidVaccine"),
    ("Historial familiar", "familyHistory"),
]


def _safe(val) -> str:
    if val is None:
        return ""
    return str(val)


class ClinicPDF(FPDF):
    def __init__(self, clinic_name: str, logo_path: str = ""):
        super().__init__()
        self.clinic_name = clinic_name
        self.logo_path = logo_path

    def header(self):
        if self.logo_path:
            try:
                self.image(self.logo_path, x=10, y=8, h=12)
                self.set_x(28)
            except Exception:
                self.set_x(self.l_margin)
        else:
            self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, self.clinic_name, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.cell(0, 10, f"Pagina {self.page_no()}/{{nb}}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_fill_color(201, 146, 155)
        self.set_text_color(255, 255, 255)
        self.cell(0, 7, f"  {title}", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def field_row(self, label, value):
        v = _safe(value)
        if not v:
            return
        self.set_font("Helvetica", "B", 9)
        self.cell(50, 5, f"{label}:", new_x="END")
        self.set_font("Helvetica", "", 9)
        self.multi_cell(0, 5, v, new_x="LMARGIN", new_y="NEXT")

    def antecedentes_row(self, label, value):
        v = _safe(value)
        if not v:
            return
        display = v[5:] if v.startswith("Si - ") else v
        self.set_font("Helvetica", "B", 9)
        self.cell(50, 5, f"{label}:", new_x="END")
        self.set_font("Helvetica", "", 9)
        self.cell(0, 5, display, new_x="LMARGIN", new_y="NEXT")


def generate_patients_pdf(scope: TenantScope, patient_ids: list[int]) -> bytes:
    settings = get_settings()
    pdf = ClinicPDF(scope.ctx.clinica.nombre, settings.pdf_logo_path)
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    for pid in patient_ids:
        full = patient_service.get_patient_full(scope, pid)
        if full is None:
            continue
        paciente = full.patient
        abonos = abono_service.list_abonos(scope, pid)

        pdf.add_page()

        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, f"{paciente.name} {paciente.lastName}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        pdf.section_title("Datos Personales")
        pdf.field_row("Nombre", paciente.name)
        pdf.field_row("Apellido", paciente.lastName)
        pdf.field_row("Edad", f"{paciente.age} anios")
        pdf.field_row("CI", paciente.CI)
        pdf.field_row("Fecha de ingreso", paciente.entryDate)
        pdf.field_row("Telefono", paciente.phoneNumber)
        pdf.field_row("Direccion", paciente.home)
        pdf.field_row("Representante", paciente.representName)
        pdf.field_row("CI Representante", paciente.representCI)
        pdf.field_row("Motivo de consulta", paciente.consultReason)
        pdf.field_row("Sintomatologia", paciente.presentIssues)
        pdf.ln(2)

        ant = full.medicalHistory
        if ant:
            pdf.section_title("Antecedentes Personales")
            for label, fname in ANTECEDENT_LABELS:
                pdf.antecedentes_row(label, getattr(ant, fname))
            pdf.ln(2)

        exam = full.oralExam
        if exam:
            pdf.section_title("Examen Fisico")
            pdf.field_row("Extraoral", exam.extraoral)
            pdf.field_row("Intraoral TB", exam.intraoralTB)
            pdf.field_row("Intraoral TD", exam.intraoralTD)
            pdf.field_row("Periodontal", exam.periodontal)
            pdf.field_row("PA", exam.PA)
            pdf.ln(2)

        if full.odontogram:
            pdf.section_title("Odontograma")
            if full.odontogram.notes:
                pdf.field_row("Notas", full.odontogram.notes)
            if full.odontogramDetails:
                pdf.set_font("Helvetica", "B", 9)
                col_w = [20, 25, 35, 90]
                headers = ["Diente", "Cara", "Afectacion", "Descripcion"]
                for i, h in enumerate(headers):
                    pdf.cell(col_w[i], 5, h, border=1, new_x="END")
                pdf.ln()
                pdf.set_font("Helvetica", "", 9)
                for d in full.odontogramDetails:
                    vals = [_safe(d.tooth), _safe(d.face), _safe(d.affected), _safe(d.description)]
                    for i, v in enumerate(vals):
                        pdf.cell(col_w[i], 5, v, border=1, new_x="END")
                    pdf.ln()
            pdf.ln(2)

        if full.treatments:
            pdf.section_title("Tratamientos")
            for t in full.treatments:
                pdf.set_font("Helvetica", "B", 9)
                pdf.cell(30, 5, _safe(t.date) or "Sin fecha", new_x="END")
                pdf.set_font("Helvetica", "", 9)
                pdf.multi_cell(0, 5, _safe(t.diagnosis), new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1)
            pdf.ln(2)

        if abonos:
            pdf.section_title("Abonos")
            pdf.set_font("Helvetica", "B", 9)
            col_w = [30, 50, 30, 30, 30]
            headers = ["Fecha", "Descripcion", "Costo", "Abono", "Resta"]
            for i, h in enumerate(headers):
                pdf.cell(col_w[i], 5, h, border=1, new_x="END")
            pdf.ln()
            pdf.set_font("Helvetica", "", 9)
            for a in abonos:
                vals = [
                    _safe(a.date),
                    _safe(a.description),
                    f"${_safe(a.treatmentCost)}",
                    f"${_safe(a.amount)}",
                    f"${_safe(a.remaining)}",
                ]
                for i, v in enumerate(vals):
                    pdf.cell(col_w[i], 5, v, border=1, new_x="END")
                pdf.ln()
            pdf.ln(2)

            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 6, f"Saldo pendiente: ${full.remaining:.2f}", new_x="LMARGIN", new_y="NEXT")

    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()
