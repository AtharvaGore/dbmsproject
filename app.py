from contextlib import contextmanager
from functools import wraps
import os
import re

import psycopg2
from psycopg2 import errors as pg_errors
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from flask import (
    Flask,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

DB_CONFIG = {
    "dbname": os.environ.get("DB_NAME", "maindb"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", ""),
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": os.environ.get("DB_PORT", "5432"),
}

connection_pool = pool.SimpleConnectionPool(1, 10, **DB_CONFIG)

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,50}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 4


def get_connection():
    return connection_pool.getconn()


def release_connection(conn):
    connection_pool.putconn(conn)


@contextmanager
def db_cursor(commit=False):
    """Yield a RealDictCursor and always return the connection to the pool."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        release_connection(conn)


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            flash("Please log in to continue.", "error")
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


@app.route("/")
def index():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))

    identifier = ""
    errors = []

    if request.method == "POST":
        identifier = (request.form.get("username") or "").strip()
        password = request.form.get("password") or ""

        if not identifier:
            errors.append("Username or email is required.")
        if not password:
            errors.append("Password is required.")

        if not errors:
            try:
                with db_cursor() as cur:
                    cur.execute(
                        """
                        SELECT user_id, username, email, password_hash, role
                        FROM users
                        WHERE lower(username) = lower(%s) OR lower(email) = lower(%s)
                        LIMIT 1
                        """,
                        (identifier, identifier),
                    )
                    user = cur.fetchone()

                if user is None or not check_password_hash(
                    user["password_hash"], password
                ):
                    errors.append("Invalid username/email or password.")
                else:
                    session.clear()
                    session["user_id"] = str(user["user_id"])
                    session["username"] = user["username"]
                    session["role"] = user["role"]
                    return redirect(url_for("dashboard"))
            except psycopg2.Error:
                app.logger.exception("Login query failed")
                errors.append("A database error occurred. Please try again.")

    return render_template("login.html", identifier=identifier, errors=errors)


@app.route("/register", methods=["GET", "POST"])
def register():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))

    form = {"username": "", "email": ""}
    errors = []

    if request.method == "POST":
        username = (request.form.get("username") or "").strip()
        email = (request.form.get("email") or "").strip().lower()
        password = request.form.get("password") or ""
        confirm_password = request.form.get("confirm_password") or ""
        form = {"username": username, "email": email}

        if not username:
            errors.append("Username is required.")
        elif not USERNAME_RE.match(username):
            errors.append(
                "Username must be 3-50 characters and contain only letters, "
                "numbers, and underscores."
            )

        if not email:
            errors.append("Email is required.")
        elif len(email) > 255 or not EMAIL_RE.match(email):
            errors.append("Please enter a valid email address.")

        if len(password) < MIN_PASSWORD_LENGTH:
            errors.append(
                f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
            )
        if password != confirm_password:
            errors.append("Passwords do not match.")

        if not errors:
            try:
                with db_cursor(commit=True) as cur:
                    cur.execute(
                        """
                        SELECT username, email FROM users
                        WHERE lower(username) = lower(%s) OR lower(email) = lower(%s)
                        """,
                        (username, email),
                    )
                    existing = cur.fetchone()

                    if existing:
                        if existing["username"].lower() == username.lower():
                            errors.append("That username is already taken.")
                        if existing["email"].lower() == email.lower():
                            errors.append(
                                "An account with that email is already registered."
                            )
                    else:
                        # Role is hard-coded so a client can never register an Admin.
                        cur.execute(
                            """
                            INSERT INTO users (username, email, password_hash, role)
                            VALUES (%s, %s, %s, %s)
                            """,
                            (
                                username,
                                email,
                                generate_password_hash(password),
                                "Student",
                            ),
                        )
            except pg_errors.UniqueViolation:
                errors.append(
                    "That username or email is already registered. "
                    "Please choose another."
                )
            except psycopg2.Error:
                app.logger.exception("Registration insert failed")
                errors.append("A database error occurred. Please try again.")

        if not errors:
            flash("Account created successfully. Please log in.", "success")
            return redirect(url_for("login"))

    return render_template("register.html", form=form, errors=errors)


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html")


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("login"))


if __name__ == "__main__":
    if not app.secret_key:
        raise RuntimeError("SECRET_KEY is not set. Add it to your .env file.")
    app.run(debug=True)
