import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from fastapi import Depends, HTTPException, Request, Response
from itsdangerous import BadSignature, URLSafeTimedSerializer

from app import db
from app.auth import (
    LOGIN_MAX_ATTEMPTS,
    LOGIN_WINDOW_SECONDS,
    hash_password,
    verify_password,
)
from app.config import get_settings
from app.models import SuperInfo

SUPER_SALT = "clinica-superadmin"
SUPER_COOKIE_NAME = "clinica_superadmin"

_super_attempts: dict[str, list[float]] = defaultdict(list)

SUPER_NO_AUTH = {
    "code": "super_no_autenticado",
    "message": "Debe iniciar sesión como administrador.",
}


@dataclass
class SuperContext:
    super_id: int
    email: str


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(get_settings().session_secret, salt=SUPER_SALT)


def _set_cookie(response: Response, super_id: int) -> None:
    settings = get_settings()
    token = _serializer().dumps({"sid": super_id})
    response.set_cookie(
        SUPER_COOKIE_NAME,
        token,
        max_age=settings.session_max_age,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


def _clear_cookie(response: Response) -> None:
    response.delete_cookie(SUPER_COOKIE_NAME, path="/")


def _read_cookie(request: Request) -> int | None:
    token = request.cookies.get(SUPER_COOKIE_NAME)
    if not token:
        return None
    try:
        data = _serializer().loads(token, max_age=get_settings().session_max_age)
    except BadSignature:
        return None
    return data["sid"]


def _track_failed(key: str) -> None:
    now = time.monotonic()
    attempts = _super_attempts[key]
    attempts.append(now)
    _super_attempts[key] = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]


def _is_blocked(key: str) -> bool:
    now = time.monotonic()
    attempts = [t for t in _super_attempts[key] if now - t < LOGIN_WINDOW_SECONDS]
    return len(attempts) >= LOGIN_MAX_ATTEMPTS


def create_superuser(email: str, password: str) -> SuperContext:
    email = email.strip().lower()
    with db.admin_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM superusuarios WHERE email = %s", (email,)
        ).fetchone()
        if existing is not None:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "super_ya_existe",
                    "message": "Ya existe un superusuario con ese correo.",
                },
            )
        row = conn.execute(
            """
            INSERT INTO superusuarios (email, password_hash)
            VALUES (%s, %s)
            RETURNING id
            """,
            (email, hash_password(password)),
        ).fetchone()
    return SuperContext(super_id=row["id"], email=email)


def super_login(email: str, password: str, request: Request, response: Response) -> SuperInfo:
    email = email.strip().lower()
    client_key = request.client.host if request.client else "unknown"
    key = f"{client_key}:{email}"
    if _is_blocked(key):
        raise HTTPException(
            status_code=429,
            detail={
                "code": "demasiados_intentos",
                "message": "Demasiados intentos. Espere unos minutos y vuelva a intentar.",
            },
        )
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash FROM superusuarios WHERE email = %s",
            (email,),
        ).fetchone()
    if row is None or not verify_password(password, row["password_hash"]):
        _track_failed(key)
        raise HTTPException(
            status_code=401,
            detail={
                "code": "credenciales_invalidas",
                "message": "Correo o contraseña incorrectos.",
            },
        )
    _super_attempts.pop(key, None)
    _set_cookie(response, row["id"])
    return SuperInfo(id=row["id"], email=row["email"])


def super_logout(response: Response) -> dict[str, bool]:
    _clear_cookie(response)
    return {"ok": True}


def require_superadmin(request: Request) -> SuperContext:
    super_id = _read_cookie(request)
    if super_id is None:
        raise HTTPException(status_code=401, detail=SUPER_NO_AUTH)
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT id, email FROM superusuarios WHERE id = %s", (super_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail=SUPER_NO_AUTH)
    return SuperContext(super_id=row["id"], email=row["email"])


SuperAdminDep = Depends(require_superadmin)


def super_me(request: Request) -> SuperInfo:
    ctx = require_superadmin(request)
    return SuperInfo(id=ctx.super_id, email=ctx.email)


def trial_days_left(trial_expires: date | None) -> int | None:
    if trial_expires is None:
        return None
    return max((trial_expires - date.today()).days, 0)
