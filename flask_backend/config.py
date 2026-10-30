"""
Settings for the Flask API, read once from the repo-root .env file.

Owner: Bhooshan Deshpande (Member B)

Flask always connects with DATABASE_URL (the low-privilege academiaos_app
login), never with ADMIN_DATABASE_URL, so row-level security always applies.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")


class ConfigError(RuntimeError):
    """A required setting is missing or invalid."""


def _required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(
            f"{name} is not set. Copy .env.example to .env in {REPO_ROOT} and fill it in."
        )
    return value


def _bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer, got {raw!r}") from exc


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str
    flask_port: int
    cors_origins: list[str]
    embedding_model: str
    embedding_preload: bool
    db_pool_min: int
    db_pool_max: int


def load_settings() -> Settings:
    """Read and validate settings. Raises ConfigError with a readable message."""
    origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    return Settings(
        database_url=_required("DATABASE_URL"),
        jwt_secret=_required("JWT_SECRET"),
        flask_port=_int("FLASK_PORT", 5000),
        cors_origins=[o.strip() for o in origins.split(",") if o.strip()],
        embedding_model=os.environ.get(
            "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
        ).strip(),
        embedding_preload=_bool("EMBEDDING_PRELOAD"),
        db_pool_min=_int("DB_POOL_MIN", 1),
        db_pool_max=_int("DB_POOL_MAX", 10),
    )


settings = load_settings()

# Plain module-level names for code that prefers `from config import JWT_SECRET`.
DATABASE_URL = settings.database_url
JWT_SECRET = settings.jwt_secret
