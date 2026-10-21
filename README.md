# Smilthing

SaaS para clínicas dentales: multi-clínica, datos cifrados — FastAPI - React - PostgreSQL

*English below: [English](#english)*

![Demo de Smilthing](docs/smilthing-demo.mp4)

## Qué hace

- **Pacientes**: ficha completa con antecedentes, examen clínico y odontograma interactivo.
- **Tratamientos y abonos**: cada cuota queda registrada y el saldo a favor del paciente se recalcula solo, también cuando editás o borrás un abono.
- **Citas**: agenda del día a día de la clínica.
- **PDF**: exportar la ficha de un paciente o un listado entero.
- **Panel admin multi-clínica**: para manejar varias clínicas desde un solo lugar: crear clínicas, suspenderlas, ver estadísticas y pagos.

Y la parte que no se ve: los datos sensibles viajan cifrados en la base (Fernet), las sesiones usan cookie firmada, el login tiene rate-limit y cada clínica solo ve lo suyo. El arranque del backend se niega a levantar con secretos débiles.

## De dónde viene

Smilthing es la migración a web de una app de escritorio que construí antes: corría en local, con PyQt y SQLite, todo en una sola máquina. La migré para hacerla más escalable y funcional, y también para mejorar el diseño, ya que PyQt tenía limitaciones gráficas. Aproveché el salto para añadir funciones que solo tienen sentido en una web. Y no descarto, a futuro, una versión de escritorio con Electron.

## Quickstart con datos de prueba

No necesita backend ni base de datos:

```bash
cd Frontend
pnpm install
cp .env.example .env
pnpm dev
```

En el puerto 5173 con `VITE_USE_MOCK=true` la app corre entera con datos dummys. En Windows el `cp` es `copy`.

## Stack

| Capa     | Tecnología                                  |
| -------- | ------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4  |
| Backend  | FastAPI, Python 3.12+, PostgreSQL (psycopg) |
| Sesiones | Cookie firmada, contraseñas con bcrypt      |
| Tests    | pytest                                      |

## Tests

```bash
cd Backend-API
uv run pytest
```

40 tests cubriendo auth, gate de trial, aislamiento entre clínicas, cascada de abonos, export PDF y branding.

## Estructura

```
Smilthing/
├── Frontend/      # la app (React - Vite)
├── Backend-API/   # la API (FastAPI - PostgreSQL)
└── docs/          
```

## Estado

En desarrollo activo. La interfaz está en español y cubre el flujo diario de una clínica: ficha, tratamiento, cobro, cita.

---

## English

**Dental clinic SaaS: multi-clinic, encrypted data — FastAPI - React - PostgreSQL**

- **Patients**: full record with medical history, clinical exam, and an interactive odontogram.
- **Treatments and payments**: every payment is logged and the patient's balance recalculates on its own, also when you edit or delete a payment.
- **Appointments**: the clinic's day-to-day agenda.
- **PDF**: export a single patient record or a full listing.
- **Multi-clinic admin panel**: run several clinics from one place: create them, suspend them, view stats and payments.

The part you don't see: sensitive data is encrypted at rest (Fernet), sessions use signed cookies, login is rate-limited, and each clinic only sees its own data. The backend refuses to start with weak secrets.

### Where it comes from

Smilthing is the web migration of a desktop app I built earlier: it ran locally, on PyQt and SQLite, everything on a single machine. I migrated it to make it more scalable and functional, and to improve the design, since PyQt had graphical limits. The jump also let me add features that only make sense on the web. And I don't rule out a desktop version with Electron down the road.

### Quickstart with dummy data

No backend or database needed:

```bash
cd Frontend
pnpm install
cp .env.example .env
pnpm dev
```

On port 5173, with `VITE_USE_MOCK=true` the app runs entirely on dummy data. On Windows `cp` is `copy`.

### Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4  |
| Backend  | FastAPI, Python 3.12+, PostgreSQL (psycopg) |
| Sessions | Signed cookie, bcrypt passwords             |
| Tests    | pytest                                      |

### Tests

```bash
cd Backend-API
uv run pytest
```

40 tests covering auth, trial gate, clinic isolation, payment cascades, PDF export, and branding.

### Structure

```
Smilthing/
├── Frontend/      # the app (React - Vite)
├── Backend-API/   # the API (FastAPI - PostgreSQL)
└── docs/
```

### Status

Actively developed. The interface is in Spanish and covers a clinic's daily workflow: records, treatments, payments, appointments.
