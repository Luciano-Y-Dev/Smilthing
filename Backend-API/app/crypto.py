import base64
import logging
from functools import lru_cache

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

logger = logging.getLogger(__name__)

_fernet_cache: dict[str, Fernet] = {}

_HKDF_SALT = b"clinica-fernet-v1"


@lru_cache
def derive_clinic_key(master_key: str, clinica_id: int) -> str:
    kdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_HKDF_SALT,
        info=str(clinica_id).encode("utf-8"),
    )
    raw = kdf.derive(master_key.encode("utf-8"))
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def _get_fernet(fernet_key: str) -> Fernet:
    f = _fernet_cache.get(fernet_key)
    if f is None:
        f = Fernet(fernet_key.encode("utf-8"))
        _fernet_cache[fernet_key] = f
    return f


def encrypt_field(value: str | None, fernet_key: str) -> str | None:
    if value is None or value == "":
        return value
    f = _get_fernet(fernet_key)
    encrypted = f.encrypt(str(value).encode("utf-8"))
    return base64.urlsafe_b64encode(encrypted).decode("utf-8")


def _looks_like_fernet_token(value: str) -> bool:
    try:
        raw = base64.urlsafe_b64decode(value.encode("utf-8"))
        if len(raw) >= 73 and raw[0] == 0x80:
            return True
        raw2 = base64.urlsafe_b64decode(raw)
        return len(raw2) >= 73 and raw2[0] == 0x80
    except Exception:
        return False


def decrypt_field(value: str | None, fernet_key: str) -> str | None:
    if value is None or value == "":
        return value
    f = _get_fernet(fernet_key)
    try:
        encrypted = base64.urlsafe_b64decode(value.encode("utf-8"))
        return f.decrypt(encrypted).decode("utf-8")
    except Exception:
        if _looks_like_fernet_token(value):
            logger.warning("Campo cifrado ilegible (clave distinta o perdida)")
            return ""
        return value
