"""
Authentication and user profile routes.

Owner: Atharva Gore (Member A)
Prefix: /api/auth
"""

from __future__ import annotations

import re
from typing import Any

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from db_context import request_cursor
from errors import ApiError
from middleware import generate_token, require_auth
from routes.common import json_body, one, require_fields

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,50}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


@bp.post("/register")
def register():
    """Register a new student account."""
    body = json_body()
    require_fields(body, "username", "email", "password")

    username = body["username"].strip()
    email = body["email"].strip().lower()
    password = body["password"]

    if not USERNAME_RE.match(username):
        raise ApiError(400, "Username must be 3-50 characters: letters, numbers, and underscores only.")
    if not EMAIL_RE.match(email):
        raise ApiError(400, "Invalid email address format.")
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ApiError(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")

    pw_hash = generate_password_hash(password)

    with request_cursor() as cur:
        # Check uniqueness
        cur.execute(
            "SELECT 1 FROM users WHERE lower(username) = lower(%s) OR lower(email) = lower(%s)",
            (username, email),
        )
        if cur.fetchone():
            raise ApiError(409, "A user with that username or email already exists.")

        cur.execute(
            """
            INSERT INTO users (username, email, password_hash, role)
            VALUES (%s, %s, %s, 'Student')
            RETURNING user_id, username, email, role, created_at
            """,
            (username, email, pw_hash),
        )
        user = one(cur)

    token = generate_token(user["user_id"], user["role"], user["username"], user["email"])
    return jsonify({"token": token, "user": user}), 201


@bp.post("/login")
def login():
    """Authenticate with username/email and password; return JWT."""
    body = json_body()
    require_fields(body, "identifier", "password")

    identifier = body["identifier"].strip()
    password = body["password"]

    with request_cursor() as cur:
        cur.execute(
            """
            SELECT user_id, username, email, password_hash, role, leetcode_username, created_at
            FROM users
            WHERE lower(username) = lower(%s) OR lower(email) = lower(%s)
            LIMIT 1
            """,
            (identifier, identifier),
        )
        user = one(cur)

    if not user or not check_password_hash(user["password_hash"], password):
        raise ApiError(401, "Invalid username/email or password.")

    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    token = generate_token(user_data["user_id"], user_data["role"], user_data["username"], user_data["email"])

    return jsonify({"token": token, "user": user_data})


@bp.get("/me")
@require_auth
def me():
    """Return the profile of the authenticated user."""
    from flask import g
    with request_cursor() as cur:
        cur.execute(
            """
            SELECT user_id, username, email, role, leetcode_username, created_at
            FROM users
            WHERE user_id = %s
            """,
            (g.user_id,),
        )
        user = one(cur)

    if not user:
        raise ApiError(404, "User profile not found.")

    return jsonify({"user": user})


@bp.put("/profile")
@require_auth
def update_profile():
    """Update profile fields such as leetcode_username."""
    from flask import g
    body = json_body()
    leetcode_username = body.get("leetcode_username")

    if leetcode_username is not None:
        leetcode_username = leetcode_username.strip() or None
        if leetcode_username and not re.match(r"^[A-Za-z0-9_-]{1,50}$", leetcode_username):
            raise ApiError(400, "LeetCode username may only contain letters, digits, _ and -.")

    with request_cursor() as cur:
        cur.execute(
            """
            UPDATE users
               SET leetcode_username = %s
             WHERE user_id = %s
            RETURNING user_id, username, email, role, leetcode_username, created_at
            """,
            (leetcode_username, g.user_id),
        )
        user = one(cur)

    return jsonify({"user": user})
