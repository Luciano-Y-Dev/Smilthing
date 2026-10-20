from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url_admin: str = "postgresql://postgres@localhost:5432/clinica_global"
    session_secret: str
    fernet_master_key: str
    trial_dias: int = 30
    trial_pacientes: int = 50
    pdf_logo_path: str = ""
    cookie_secure: bool = True
    cookie_name: str = "clinica_session"
    session_max_age: int = 60 * 60 * 24 * 30
    postgres_bin_dir: str = ""
    frontend_dir: str = ""
    media_dir: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_media_dir() -> Path:
    settings = get_settings()
    if settings.media_dir:
        return Path(settings.media_dir)
    return Path(__file__).resolve().parent.parent / "media"
