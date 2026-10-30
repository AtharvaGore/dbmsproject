"""
Error helpers shared by app.py and the route modules.

Owner: Bhooshan Deshpande (Member B)

Every error leaves the API as JSON {"error": "<readable message>"}.
Database errors are mapped by SQLSTATE class:
  42501 insufficient_privilege (incl. RLS WITH CHECK)  -> 403
  23xxx integrity (CHECK, UNIQUE, FK, NOT NULL, triggers raising check_violation),
  22xxx data errors, P0001 raise_exception             -> 400
  P0002 no_data_found                                  -> 404
  anything else                                        -> 500
"""

from __future__ import annotations

from typing import Any

import psycopg2
from flask import jsonify
from flask.typing import ResponseReturnValue


class ApiError(Exception):
    """Raise from a route to return {"error": message} with this status."""

    def __init__(self, status: int, message: str, **extra: Any) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.extra = extra


def error_response(status: int, message: str, **extra: Any) -> ResponseReturnValue:
    return jsonify({"error": message, **extra}), status


# Readable text for the named constraints in 02_B_dsa_career_schema.sql.
# Constraints not listed here fall back to Postgres's own message.
CONSTRAINT_MESSAGES: dict[str, str] = {
    "chk_dsa_platform": "Platform must be LeetCode, Codeforces, HackerRank or Other.",
    "chk_dsa_difficulty": "Difficulty must be Easy, Medium or Hard.",
    "chk_dsa_status": "Status must be Solved, Re-visit Needed or Mastered.",
    "chk_dsa_url": "Problem URL must start with http:// or https://.",
    "chk_dsa_title_not_blank": "Title cannot be blank.",
    "uq_dsa_user_platform_title": "You already logged a problem with this title on this platform.",
    "uq_topics_name": "That topic already exists.",
    "chk_topics_name_not_blank": "Topic names cannot be blank.",
    "chk_oa_stage_value": "Stage must be one of: Applied, OA Received, OA Cleared, "
                          "Technical Round, HR Round, Offer, Rejected.",
    "uq_oa_user_company_role": "You already have an application for this company and role.",
    "chk_oa_event_after_applied": "Event date cannot be before the applied date.",
    "chk_oa_link": "Application link must start with http:// or https://.",
    "chk_oa_company_not_blank": "Company name cannot be blank.",
    "chk_single_context": "A task can belong to only one assignment, project, problem or application.",
    "chk_users_leetcode_username": "LeetCode username may only contain letters, digits, _ and -.",
    "pk_oa_dsa_tested": "That problem is already linked to this application.",
}


def map_db_error(exc: psycopg2.Error) -> tuple[int, str]:
    """Translate a psycopg2 exception into (HTTP status, readable message)."""
    code = exc.pgcode or ""
    diag = getattr(exc, "diag", None)
    constraint = getattr(diag, "constraint_name", None) if diag else None
    primary = (getattr(diag, "message_primary", None) if diag else None) or str(exc).strip()

    if constraint and constraint in CONSTRAINT_MESSAGES:
        message = CONSTRAINT_MESSAGES[constraint]
    elif code == "23503":
        message = "That refers to a record that does not exist."
    elif code == "23502":
        column = getattr(diag, "column_name", None) if diag else None
        message = f"{column} is required." if column else "A required field is missing."
    else:
        message = primary.splitlines()[0] if primary else "Database error."

    if code == "42501":
        if "row-level security" in primary:
            message = "You can only change your own records."
        return 403, message
    if code == "P0002":
        return 404, message
    if code.startswith(("22", "23")) or code == "P0001":
        return 400, message
    return 500, "Database error."
