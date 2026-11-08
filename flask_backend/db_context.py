"""
Per-request database context and transaction management for Flask API.

Owner: Atharva Gore (Member A)

Yields a database cursor configured with the authenticated user's PostgreSQL role
(student_role / admin_role) and session variable (app.user_id), enforcing Row-Level
Security at the database engine level.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from flask import g
import psycopg2

import db


@contextmanager
def request_cursor(commit: bool = True) -> Generator[psycopg2.extensions.cursor, None, None]:
    """
    Acquires a pooled connection, applies user context, yields the cursor,
    and handles commit/rollback.
    """
    conn = db.get_conn()
    cur = conn.cursor()
    try:
        user_id = getattr(g, "user_id", None)
        role = getattr(g, "role", None)

        if user_id:
            # Set the role and tenant variables inside the local transaction
            if role == "Admin":
                cur.execute("SET LOCAL ROLE admin_role;")
            else:
                cur.execute("SET LOCAL ROLE student_role;")

            cur.execute("SELECT set_config('app.user_id', %s, true);", (str(user_id),))
            cur.execute("SELECT set_config('app.role', %s, true);", (str(role or "Student"),))

        yield cur

        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        db.put_conn(conn)
