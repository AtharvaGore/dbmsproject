"""
Placement pipeline API: applications, OA events, stage history, funnel.

Owner: Bhooshan Deshpande (Member B)
Prefix: /api/career

Stage history rows are written by trg_oa_stage_history, never by this code.
After anything that changes stages, the funnel materialized view is refreshed
with fn_refresh_oa_funnel() (SECURITY DEFINER).
"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

from db_context import request_cursor
from errors import ApiError
from middleware import require_auth
from routes.common import json_body, one, pick, require_fields, rows, update_statement

bp = Blueprint("career", __name__, url_prefix="/api/career")

APPLICATION_FIELDS = ("company_name", "role_title", "applied_on", "event_date", "application_link")

APPLICATION_SELECT = """
    SELECT o.oa_id, o.company_name, o.role_title, o.stage, o.applied_on, o.event_date,
           o.application_link, o.created_at,
           -- correlated subqueries: time in the current stage, and problems asked
           current_date - (SELECT max(h.changed_at)::date FROM oa_stage_history h
                            WHERE h.oa_id = o.oa_id)                       AS days_in_stage,
           (SELECT count(*) FROM oa_dsa_tested t WHERE t.oa_id = o.oa_id)  AS problems_tested
    FROM companies_oa o
"""

FUNNEL_ZERO: dict[str, Any] = {
    "total_applications": 0, "reached_oa": 0, "cleared_oa": 0, "reached_interview": 0,
    "offers": 0, "rejections": 0, "active": 0, "oa_clear_rate_pct": None,
    "interview_to_offer_pct": None, "overall_offer_rate_pct": None, "refreshed_at": None,
}


def _refresh_funnel(cur) -> None:
    cur.execute("SELECT fn_refresh_oa_funnel()")


def _get_application(cur, oa_id: int) -> dict[str, Any]:
    cur.execute(APPLICATION_SELECT + " WHERE o.oa_id = %s", (oa_id,))
    app = one(cur)
    if app is None:
        raise ApiError(404, "Application not found.")
    cur.execute("SELECT stage, changed_at FROM oa_stage_history WHERE oa_id = %s ORDER BY changed_at",
                (oa_id,))
    app["history"] = rows(cur)
    cur.execute("""
        SELECT p.problem_id, p.title, p.difficulty, p.status, odt.solved_during_oa,
               coalesce(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
                        '{}') AS topics
        FROM oa_dsa_tested odt
        JOIN dsa_problems p             ON p.problem_id   = odt.problem_id
        LEFT JOIN dsa_problem_topics dpt ON dpt.problem_id = p.problem_id
        LEFT JOIN topics t               ON t.topic_id     = dpt.topic_id
        WHERE odt.oa_id = %s
        GROUP BY p.problem_id, odt.solved_during_oa
        ORDER BY p.title
    """, (oa_id,))
    app["problems"] = rows(cur)
    return app


def _problem_links(value: Any) -> tuple[list[int], list[bool]]:
    if value is None:
        return [], []
    if not isinstance(value, list):
        raise ApiError(400, "problems must be a list of {problem_id, solved}.")
    ids: list[int] = []
    solved: list[bool] = []
    for item in value:
        if not isinstance(item, dict) or "problem_id" not in item:
            raise ApiError(400, "Each problem needs a problem_id.")
        try:
            ids.append(int(item["problem_id"]))
        except (TypeError, ValueError) as exc:
            raise ApiError(400, "problem_id must be an integer.") from exc
        solved.append(bool(item.get("solved", False)))
    return ids, solved


@bp.get("/applications")
@require_auth
def list_applications():
    """Applications with days_in_stage and problems_tested (correlated subqueries)."""
    stage = request.args.get("stage") or None
    with request_cursor() as cur:
        cur.execute(APPLICATION_SELECT + """
            WHERE (%(stage)s::text IS NULL OR o.stage = %(stage)s)
            ORDER BY coalesce(o.event_date, o.applied_on) DESC, o.oa_id DESC
        """, {"stage": stage})
        return jsonify(rows(cur))


@bp.get("/applications/<int:oa_id>")
@require_auth
def get_application(oa_id: int):
    """Detail with the full stage history (weak entity) and the problems tested (M:N)."""
    with request_cursor() as cur:
        return jsonify(_get_application(cur, oa_id))


@bp.post("/oa-event")
@require_auth
def log_oa_event():
    """Stored procedure + transaction (rubric 8): one CALL writes the application and its links."""
    body = json_body()
    require_fields(body, "company_name", "role_title")
    ids, solved = _problem_links(body.get("problems"))
    with request_cursor() as cur:
        cur.execute(
            "CALL sp_log_oa_event(%s, %s, %s, %s::date, %s, %s::bigint[], %s::boolean[], NULL)",
            (body["company_name"], body["role_title"], body.get("stage") or None,
             body.get("event_date") or None, body.get("application_link") or None, ids, solved),
        )
        oa_id = cur.fetchone()[0]
        app = _get_application(cur, oa_id)
    return jsonify({"oa_id": oa_id, "application": app}), 201


@bp.patch("/applications/<int:oa_id>/stage")
@require_auth
def update_stage(oa_id: int):
    """Stage change; trg_oa_stage_history logs it (trigger), then the funnel MV refreshes."""
    body = json_body()
    require_fields(body, "stage")
    with request_cursor() as cur:
        cur.execute("UPDATE companies_oa SET stage = %s WHERE oa_id = %s RETURNING oa_id",
                    (body["stage"], oa_id))
        if cur.fetchone() is None:
            raise ApiError(404, "Application not found.")
        _refresh_funnel(cur)
        return jsonify(_get_application(cur, oa_id))


@bp.put("/applications/<int:oa_id>")
@require_auth
def update_application(oa_id: int):
    """Edit company, role, dates and link (CHECK constraints validate them)."""
    fields = pick(json_body(), APPLICATION_FIELDS)
    for required in ("company_name", "role_title", "applied_on"):
        if required in fields and fields[required] is None:
            raise ApiError(400, f"{required} cannot be empty.")
    with request_cursor() as cur:
        if fields:
            cur.execute(update_statement("companies_oa", fields, "oa_id"), {**fields, "_key": oa_id})
            if cur.fetchone() is None:
                raise ApiError(404, "Application not found.")
        return jsonify(_get_application(cur, oa_id))


@bp.delete("/applications/<int:oa_id>")
@require_auth
def delete_application(oa_id: int):
    """Delete; history and problem links cascade, then the funnel refreshes."""
    with request_cursor() as cur:
        cur.execute("DELETE FROM companies_oa WHERE oa_id = %s RETURNING oa_id", (oa_id,))
        if cur.fetchone() is None:
            raise ApiError(404, "Application not found.")
        _refresh_funnel(cur)
    return "", 204


@bp.post("/applications/<int:oa_id>/problems")
@require_auth
def link_problem(oa_id: int):
    """Upsert one TESTED_IN link; trg_oa_dsa_same_owner rejects other users' problems."""
    body = json_body()
    require_fields(body, "problem_id")
    ids, solved = _problem_links([body])
    with request_cursor() as cur:
        cur.execute("SELECT 1 FROM companies_oa WHERE oa_id = %s", (oa_id,))
        if cur.fetchone() is None:
            raise ApiError(404, "Application not found.")
        cur.execute("""
            INSERT INTO oa_dsa_tested (oa_id, problem_id, solved_during_oa)
            VALUES (%s, %s, %s)
            ON CONFLICT (oa_id, problem_id) DO UPDATE SET solved_during_oa = EXCLUDED.solved_during_oa
            RETURNING oa_id, problem_id, solved_during_oa
        """, (oa_id, ids[0], solved[0]))
        return jsonify(one(cur)), 201


@bp.delete("/applications/<int:oa_id>/problems/<int:problem_id>")
@require_auth
def unlink_problem(oa_id: int, problem_id: int):
    with request_cursor() as cur:
        cur.execute("DELETE FROM oa_dsa_tested WHERE oa_id = %s AND problem_id = %s RETURNING oa_id",
                    (oa_id, problem_id))
        if cur.fetchone() is None:
            raise ApiError(404, "Link not found.")
    return "", 204


@bp.get("/funnel")
@require_auth
def funnel():
    """The caller's row of mv_oa_funnel_analytics via v_my_oa_funnel (materialized view)."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT total_applications, reached_oa, cleared_oa, reached_interview, offers,
                   rejections, active, oa_clear_rate_pct, interview_to_offer_pct,
                   overall_offer_rate_pct, refreshed_at
            FROM v_my_oa_funnel
        """)
        row = one(cur)
    return jsonify(row or FUNNEL_ZERO)
