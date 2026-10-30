"""
AcademiaOS Flask API: application factory and entry point.

Owner: Bhooshan Deshpande (Member B)

Run from the repo root:
    python flask_backend/app.py

Every route module exposes a Blueprint named `bp`. Modules that do not exist
yet (Atharva's routes, or his middleware / db_context that the routes import)
are skipped with a warning, so the API starts before both halves land.
"""

from __future__ import annotations

import datetime as dt
import decimal
import importlib
import logging
import uuid
from typing import Any

import psycopg2
from flask import Flask, jsonify
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

import db
import embedder
from config import settings
from errors import ApiError, error_response, map_db_error

log = logging.getLogger("academiaos")

# (module, owner). Each must define `bp` with its own url_prefix.
BLUEPRINTS: list[tuple[str, str]] = [
    ("routes.auth", "A"),
    ("routes.academics", "A"),
    ("routes.projects", "A"),
    ("routes.tasks", "A"),
    ("routes.dsa", "B"),
    ("routes.career", "B"),
    ("routes.admin", "B"),
]

# Missing modules that mean "the other half is not merged yet", not a bug.
OPTIONAL_DEPENDENCIES = {"middleware", "db_context"}


class ApiJSONProvider(DefaultJSONProvider):
    """ISO 8601 dates, numbers for NUMERIC, strings for UUID."""

    @staticmethod
    def default(o: Any) -> Any:
        if isinstance(o, (dt.datetime, dt.date, dt.time)):
            return o.isoformat()
        if isinstance(o, decimal.Decimal):
            return float(o)
        if isinstance(o, uuid.UUID):
            return str(o)
        return DefaultJSONProvider.default(o)


def register_blueprints(app: Flask) -> None:
    for module_name, owner in BLUEPRINTS:
        try:
            module = importlib.import_module(module_name)
        except ModuleNotFoundError as exc:
            if exc.name in {module_name, *OPTIONAL_DEPENDENCIES}:
                log.warning("Skipping %s (Member %s): module %s not found yet",
                            module_name, owner, exc.name)
                continue
            raise
        app.register_blueprint(module.bp)
        log.info("Registered %s", module_name)


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def _api_error(exc: ApiError):
        return error_response(exc.status, exc.message, **exc.extra)

    @app.errorhandler(psycopg2.Error)
    def _db_error(exc: psycopg2.Error):
        status, message = map_db_error(exc)
        if status >= 500:
            log.exception("Database error", exc_info=exc)
        return error_response(status, message)

    @app.errorhandler(HTTPException)
    def _http_error(exc: HTTPException):
        return error_response(exc.code or 500, exc.description or exc.name)

    @app.errorhandler(Exception)
    def _unexpected(exc: Exception):
        log.exception("Unhandled error", exc_info=exc)
        return error_response(500, "Internal server error.")


def register_health(app: Flask) -> None:
    @app.get("/api/health")
    def health():
        """Liveness check: database reachable, pgvector installed, model state."""
        conn = db.get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
                cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
                row = cur.fetchone()
            conn.rollback()
        finally:
            db.put_conn(conn)
        return jsonify({
            "status": "ok",
            "database": "ok",
            "pgvector": row[0] if row else None,
            "embedding_model_loaded": embedder.is_loaded(),
        })


def create_app() -> Flask:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    app = Flask(__name__)
    app.json = ApiJSONProvider(app)
    app.config["JWT_SECRET"] = settings.jwt_secret
    CORS(app, resources={r"/api/*": {"origins": settings.cors_origins}})

    register_error_handlers(app)
    register_health(app)
    register_blueprints(app)

    if settings.embedding_preload:
        try:
            embedder.get_model()
        except embedder.EmbeddingUnavailable:
            log.warning("EMBEDDING_PRELOAD=true but the model failed to load; "
                        "semantic search will return 503 until it can.")
    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=settings.flask_port)
