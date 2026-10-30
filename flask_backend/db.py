"""
PostgreSQL connection pool.

Owner: Bhooshan Deshpande (Member B)

Only hands out and takes back connections. Switching to the logged-in user's
role and setting app.user_id is done per request by Atharva's
db_context.request_cursor(), which is what routes should use.
"""

from __future__ import annotations

import threading

from psycopg2.extensions import TRANSACTION_STATUS_IDLE
from psycopg2.extensions import connection as PgConnection
from psycopg2.pool import ThreadedConnectionPool

from config import settings

_pool: ThreadedConnectionPool | None = None
_lock = threading.Lock()


def _get_pool() -> ThreadedConnectionPool:
    """Create the pool on first use, so importing this module never connects."""
    global _pool
    if _pool is None:
        with _lock:
            if _pool is None:
                _pool = ThreadedConnectionPool(
                    settings.db_pool_min,
                    settings.db_pool_max,
                    dsn=settings.database_url,
                    application_name="academiaos_flask",
                )
    return _pool


def get_conn() -> PgConnection:
    """Borrow a connection. Always give it back with put_conn()."""
    return _get_pool().getconn()


def put_conn(conn: PgConnection) -> None:
    """Return a connection to the pool, rolling back anything left open."""
    if _pool is None:
        conn.close()
        return
    if not conn.closed and conn.get_transaction_status() != TRANSACTION_STATUS_IDLE:
        conn.rollback()
    _pool.putconn(conn, close=bool(conn.closed))


def close_pool() -> None:
    """Close every pooled connection (tests, shutdown)."""
    global _pool
    with _lock:
        if _pool is not None:
            _pool.closeall()
            _pool = None
