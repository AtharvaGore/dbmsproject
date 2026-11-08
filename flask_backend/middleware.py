"""
Authentication and Role-Based Access Control middleware for Flask.

Owner: Atharva Gore (Member A)

Extracts and verifies JWT tokens, placing user identity on flask.g.
Provides @require_auth and @require_role decorators.
"""

from __future__ import annotations

import datetime as dt
from functools import wraps
from typing import Any, Callable

import jwt
from flask import g, request

from config import settings
from errors import ApiError


def generate_token(user_id: str, role: str, username: str, email: str, days: int = 7) -> str:
    """Generate a signed JWT token."""
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": str(user_id),
        "user_id": str(user_id),
        "role": role,
        "username": username,
        "email": email,
        "iat": now,
        "exp": now + dt.timedelta(days=days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise ApiError(401, "Session expired. Please log in again.") from exc
    except jwt.InvalidTokenError as exc:
        raise ApiError(401, "Invalid authentication token.") from exc


def require_auth(fn: Callable) -> Callable:
    """Decorator requiring a valid JWT Bearer token."""
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        auth_header = request.headers.get("Authorization", "").strip()
        token = ""

        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif "token" in request.cookies:
            token = request.cookies.get("token", "").strip()

        if not token:
            raise ApiError(401, "Authentication required. Missing Bearer token.")

        payload = decode_token(token)
        g.user_id = payload["user_id"]
        g.role = payload.get("role", "Student")
        g.username = payload.get("username", "")
        g.email = payload.get("email", "")

        return fn(*args, **kwargs)

    return wrapper


def require_role(*roles: str) -> Callable:
    """Decorator requiring the authenticated user to hold one of the given roles."""
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            user_role = getattr(g, "role", None)
            if not user_role or user_role not in roles:
                raise ApiError(403, f"Access denied. Requires one of roles: {', '.join(roles)}.")
            return fn(*args, **kwargs)
        return wrapper
    return decorator
