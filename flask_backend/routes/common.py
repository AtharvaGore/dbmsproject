"""
Small helpers shared by Member B's route modules.

Owner: Bhooshan Deshpande (Member B)

They work with whatever cursor request_cursor() yields (plain or dict), by
building dicts from cursor.description.
"""

from __future__ import annotations

from typing import Any, Iterable

from flask import request
from psycopg2 import sql

from errors import ApiError


def rows(cur) -> list[dict[str, Any]]:
    """All remaining rows of the last query as dicts."""
    if cur.description is None:
        return []
    names = [c.name for c in cur.description]
    return [dict(zip(names, _values(r, names))) for r in cur.fetchall()]


def one(cur) -> dict[str, Any] | None:
    """The next row as a dict, or None."""
    if cur.description is None:
        return None
    row = cur.fetchone()
    if row is None:
        return None
    names = [c.name for c in cur.description]
    return dict(zip(names, _values(row, names)))


def _values(row: Any, names: list[str]) -> Iterable[Any]:
    return [row[n] for n in names] if isinstance(row, dict) else row


def json_body() -> dict[str, Any]:
    """The request's JSON object, or a 400."""
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise ApiError(400, "Request body must be a JSON object.")
    return body


def require_fields(body: dict[str, Any], *names: str) -> None:
    missing = [n for n in names
               if body.get(n) is None or (isinstance(body.get(n), str) and not body[n].strip())]
    if missing:
        raise ApiError(400, f"Missing required field(s): {', '.join(missing)}.")


def pick(body: dict[str, Any], allowed: Iterable[str]) -> dict[str, Any]:
    """The subset of body whose keys are in allowed (empty strings become NULL)."""
    out: dict[str, Any] = {}
    for key in allowed:
        if key in body:
            value = body[key]
            out[key] = None if isinstance(value, str) and value.strip() == "" else value
    return out


def int_arg(name: str, default: int, lo: int = 1, hi: int = 50) -> int:
    """An integer query-string argument clamped to [lo, hi]."""
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    try:
        return max(lo, min(hi, int(raw)))
    except ValueError as exc:
        raise ApiError(400, f"{name} must be an integer.") from exc


def update_statement(table: str, fields: dict[str, Any], key_column: str) -> sql.Composed:
    """UPDATE <table> SET a = %(a)s, ... WHERE <key> = %(_key)s RETURNING <key>."""
    assignments = sql.SQL(", ").join(
        sql.SQL("{} = {}").format(sql.Identifier(k), sql.Placeholder(k)) for k in fields
    )
    return sql.SQL("UPDATE {} SET {} WHERE {} = %(_key)s RETURNING {}").format(
        sql.Identifier(table), assignments, sql.Identifier(key_column), sql.Identifier(key_column)
    )


def insert_statement(table: str, fields: dict[str, Any], returning: str,
                     extra: dict[str, sql.Composable] | None = None) -> sql.Composed:
    """INSERT INTO <table> (cols) VALUES (...) RETURNING <col>; extra = raw SQL values."""
    extra = extra or {}
    columns = [sql.Identifier(k) for k in [*extra, *fields]]
    values = [*extra.values(), *(sql.Placeholder(k) for k in fields)]
    return sql.SQL("INSERT INTO {} ({}) VALUES ({}) RETURNING {}").format(
        sql.Identifier(table), sql.SQL(", ").join(columns),
        sql.SQL(", ").join(values), sql.Identifier(returning),
    )
