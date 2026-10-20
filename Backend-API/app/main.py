from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from cryptography.fernet import Fernet
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import db
from app.config import get_settings
from app.routers import abonos, admin, auth, backup, branding, citas, export, pacientes, tratamientos

ERROR_MESSAGES = {
    400: "Solicitud inválida.",
    401: "No autenticado.",
    403: "Acceso denegado.",
    404: "Recurso no encontrado.",
    405: "Método no permitido.",
    429: "Demasiadas solicitudes.",
}


PLACEHOLDER_SECRETS = {"dev-secret-change-me", "change-me-to-a-long-random-string"}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if (
        settings.session_secret in PLACEHOLDER_SECRETS
        or len(settings.session_secret) < 32
    ):
        raise RuntimeError(
            "SESSION_SECRET inseguro: define un valor aleatorio largo en .env."
        )
    try:
        Fernet(settings.fernet_master_key.encode("utf-8"))
    except (ValueError, TypeError):
        raise RuntimeError(
            "FERNET_MASTER_KEY inválida: genera una con "
            "cryptography.fernet.Fernet.generate_key() y ponla en .env."
        )
    db.init_global_schema()
    yield


app = FastAPI(title="Clínica Odontológica", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(branding.router)
app.include_router(pacientes.router)
app.include_router(tratamientos.router)
app.include_router(abonos.router)
app.include_router(citas.router)
app.include_router(export.router)
app.include_router(backup.router)


def _frontend_dir() -> Path:
    settings = get_settings()
    if settings.frontend_dir:
        return Path(settings.frontend_dir)
    return Path(__file__).resolve().parent.parent.parent / "Frontend" / "dist"


if _frontend_dir().exists():
    app.frontend("/", directory=str(_frontend_dir()))


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        payload = detail
    else:
        payload = {
            "code": "error",
            "message": ERROR_MESSAGES.get(exc.status_code, "Error."),
            "detail": detail,
        }
    return JSONResponse(status_code=exc.status_code, content={"detail": payload})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        {
            "loc": [str(part) for part in e.get("loc", [])],
            "msg": e.get("msg", ""),
            "type": e.get("type", ""),
        }
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "code": "validacion_fallida",
                "message": "Datos inválidos.",
                "errors": errors,
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "detail": {
                "code": "error_interno",
                "message": "Error interno del servidor.",
            }
        },
    )
