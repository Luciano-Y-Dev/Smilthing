import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

import bcrypt
from fastapi import Depends, HTTPException, Request, Response
from itsdangerous import BadSignature, URLSafeTimedSerializer

from app import db, tenancy
from app.config import Settings, get_settings
from app.models import ClinicaInfo, LoginInput, MeResponse, UsuarioInfo

SESSION_SALT = "clinica-session"

LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 900
IP_LOGIN_MAX_ATTEMPTS = 20

_login_attempts: dict[str, list[float]] = defaultdict(list)


@dataclass
class AuthContext:
    user_id: int
    clinica_id: int
    email: str
    rol: str
    clinica: ClinicaInfo
    session_version: int = 0
    must_change_password: bool = False


def _serializer(settings: Settings) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.session_secret, salt=SESSION_SALT)


def create_session_token(
    user_id: int, clinica_id: int, session_version: int
) -> str:
    return _serializer(get_settings()).dumps(
        {"uid": user_id, "cid": clinica_id, "v": session_version}
    )


def read_session_token(token: str) -> tuple[int, int, int] | None:
    settings = get_settings()
    try:
        data = _serializer(settings).loads(token, max_age=settings.session_max_age)
    except BadSignature:
        return None
    return data["uid"], data["cid"], data.get("v", 0)


def set_session_cookie(
    response: Response, user_id: int, clinica_id: int, session_version: int
) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.cookie_name,
        create_session_token(user_id, clinica_id, session_version),
        max_age=settings.session_max_age,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(settings.cookie_name, path="/")


def get_session_from_request(request: Request) -> tuple[int, int, int] | None:
    settings = get_settings()
    token = request.cookies.get(settings.cookie_name)
    if not token:
        return None
    return read_session_token(token)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


_DUMMY_HASH = hash_password("timing-equalizer-dummy")


def _track_failed_login(key: str) -> None:
    now = time.monotonic()
    attempts = _login_attempts[key]
    attempts.append(now)
    _login_attempts[key] = [t for t in attempts if now - t < LOGIN_WINDOW_SECONDS]


def _is_login_blocked(key: str, limit: int = LOGIN_MAX_ATTEMPTS) -> bool:
    now = time.monotonic()
    attempts = [t for t in _login_attempts[key] if now - t < LOGIN_WINDOW_SECONDS]
    return len(attempts) >= limit


def _clear_login_attempts(key: str) -> None:
    _login_attempts.pop(key, None)


NO_AUTENTICADO = {
    "code": "no_autenticado",
    "message": "Debe iniciar sesión para continuar.",
}


def _load_clinica(clinica_id: int) -> ClinicaInfo:
    row = tenancy.get_clinica(clinica_id)
    if row is None:
        raise HTTPException(status_code=401, detail=NO_AUTENTICADO)
    return ClinicaInfo(
        id=row["id"],
        nombre=row["nombre"],
        estado=row["estado"],
        trial_expires=row["trial_expires"].isoformat() if row["trial_expires"] else None,
        logo_url=row["logo_url"],
        color_primary=row["color_primary"],
    )


def _dias_restantes(clinica: ClinicaInfo) -> int | None:
    if clinica.estado != "trial" or not clinica.trial_expires:
        return None
    delta = date.fromisoformat(clinica.trial_expires) - date.today()
    return max(delta.days, 0)


def _auth_context(
    user_id: int,
    clinica_id: int,
    email: str,
    rol: str,
    session_version: int = 0,
    must_change_password: bool = False,
) -> AuthContext:
    return AuthContext(
        user_id=user_id,
        clinica_id=clinica_id,
        email=email,
        rol=rol,
        clinica=_load_clinica(clinica_id),
        session_version=session_version,
        must_change_password=must_change_password,
    )


def create_clinic_with_admin(
    nombre_clinica: str, email: str, password: str
) -> AuthContext:
    with db.admin_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM usuarios WHERE email = %s", (email.lower(),)
        ).fetchone()
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "email_ya_en_uso",
                "message": "El correo electrónico ya está registrado.",
            },
        )
    clinica_id = tenancy.create_clinic(nombre_clinica)
    password_hash = hash_password(password)
    try:
        with db.admin_connection() as conn:
            row = conn.execute(
                """
                INSERT INTO usuarios (clinica_id, email, password_hash, rol, must_change_password)
                VALUES (%s, %s, %s, 'admin', TRUE)
                RETURNING id
                """,
                (clinica_id, email.lower(), password_hash),
            ).fetchone()
    except Exception:
        _cleanup_failed_clinic(clinica_id)
        raise
    return _auth_context(row["id"], clinica_id, email.lower(), "admin")


def _cleanup_failed_clinic(clinica_id: int) -> None:
    import psycopg

    from app.config import get_settings as _gs

    try:
        settings = _gs()
        with psycopg.connect(
            db.tenant_db_url_from_name("postgres"), autocommit=True
        ) as conn:
            conn.execute(f'DROP DATABASE IF EXISTS "{db.tenant_db_name(clinica_id)}"')
        with db.admin_connection() as conn:
            conn.execute("DELETE FROM clinicas WHERE id = %s", (clinica_id,))
    except Exception:
        pass


def authenticate(identifier: str, password: str, ip: str) -> AuthContext:
    ident = identifier.strip().lower()
    account_key = f"{ip}:{ident}"
    ip_key = f"ip:{ip}"
    if _is_login_blocked(account_key) or _is_login_blocked(
        ip_key, IP_LOGIN_MAX_ATTEMPTS
    ):
        raise HTTPException(
            status_code=429,
            detail={
                "code": "demasiados_intentos",
                "message": "Demasiados intentos. Espere unos minutos y vuelva a intentar.",
            },
        )
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT id, clinica_id, email, password_hash, rol, session_version, must_change_password FROM usuarios WHERE email = %s",
            (ident,),
        ).fetchone()
        if row is None:
            rows = conn.execute(
                """SELECT u.id, u.clinica_id, u.email, u.password_hash, u.rol, u.session_version, u.must_change_password
                   FROM usuarios u
                   JOIN clinicas c ON c.id = u.clinica_id
                   WHERE lower(c.nombre) = %s
                     AND u.id = (
                         SELECT u2.id FROM usuarios u2
                         WHERE u2.clinica_id = c.id ORDER BY u2.id LIMIT 1
                     )""",
                (ident,),
            ).fetchall()
            if len({r["clinica_id"] for r in rows}) > 1:
                _track_failed_login(account_key)
                _track_failed_login(ip_key)
                raise HTTPException(
                    status_code=401,
                    detail={
                        "code": "nombre_ambiguo",
                        "message": "Hay varias cuentas con ese nombre. Inicie sesión con el correo.",
                    },
                )
            if rows:
                row = rows[0]
    password_hash = row["password_hash"] if row is not None else _DUMMY_HASH
    if not verify_password(password, password_hash):
        _track_failed_login(account_key)
        _track_failed_login(ip_key)
        raise HTTPException(
            status_code=401,
            detail={
                "code": "credenciales_invalidas",
                "message": "Correo, clínica o contraseña incorrectos.",
            },
        )
    _clear_login_attempts(account_key)
    _clear_login_attempts(ip_key)
    return _auth_context(
        row["id"],
        row["clinica_id"],
        row["email"],
        row["rol"],
        row["session_version"],
        row["must_change_password"],
    )


def require_user(request: Request) -> AuthContext:
    session = get_session_from_request(request)
    if session is None:
        raise HTTPException(status_code=401, detail=NO_AUTENTICADO)
    user_id, clinica_id, token_version = session
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT id, email, rol, session_version, must_change_password FROM usuarios WHERE id = %s AND clinica_id = %s",
            (user_id, clinica_id),
        ).fetchone()
    if row is None or row["session_version"] != token_version:
        raise HTTPException(status_code=401, detail=NO_AUTENTICADO)
    return _auth_context(
        user_id,
        clinica_id,
        row["email"],
        row["rol"],
        row["session_version"],
        row["must_change_password"],
    )


CurrentUserDep = Depends(require_user)


def optional_user(request: Request) -> AuthContext | None:
    session = get_session_from_request(request)
    if session is None:
        return None
    try:
        return require_user(request)
    except HTTPException:
        return None


def login(input: LoginInput, request: Request, response: Response) -> MeResponse:
    ip = request.client.host if request.client else "unknown"
    ctx = authenticate(input.email, input.password, ip)
    set_session_cookie(response, ctx.user_id, ctx.clinica_id, ctx.session_version)
    return MeResponse(
        clinica=ctx.clinica,
        usuario=UsuarioInfo(
            id=ctx.user_id,
            email=ctx.email,
            rol=ctx.rol,
            must_change_password=ctx.must_change_password,
        ),
        dias_restantes=_dias_restantes(ctx.clinica),
    )


def logout(request: Request, response: Response) -> dict[str, bool]:
    session = get_session_from_request(request)
    if session is not None:
        user_id, _clinica_id, _token_version = session
        with db.admin_connection() as conn:
            conn.execute(
                "UPDATE usuarios SET session_version = session_version + 1 WHERE id = %s",
                (user_id,),
            )
    clear_session_cookie(response)
    return {"ok": True}


def me(ctx: AuthContext) -> MeResponse:
    return MeResponse(
        clinica=ctx.clinica,
        usuario=UsuarioInfo(
            id=ctx.user_id,
            email=ctx.email,
            rol=ctx.rol,
            must_change_password=ctx.must_change_password,
        ),
        dias_restantes=_dias_restantes(ctx.clinica),
    )


def me_public(request: Request) -> MeResponse:
    ctx = optional_user(request)
    if ctx is None:
        raise HTTPException(status_code=401, detail=NO_AUTENTICADO)
    return me(ctx)


def change_password(
    ctx: AuthContext, current_password: str, new_password: str
) -> dict[str, bool]:
    with db.admin_connection() as conn:
        row = conn.execute(
            "SELECT password_hash FROM usuarios WHERE id = %s", (ctx.user_id,)
        ).fetchone()
    if row is None or not verify_password(current_password, row["password_hash"]):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "clave_actual_incorrecta",
                "message": "La contraseña actual es incorrecta.",
            },
        )
    with db.admin_connection() as conn:
        conn.execute(
            "UPDATE usuarios SET password_hash = %s, must_change_password = FALSE WHERE id = %s",
            (hash_password(new_password), ctx.user_id),
        )
    return {"ok": True}
