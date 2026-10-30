"""
Admin API: every user's numbers and system totals.

Owner: Bhooshan Deshpande (Member B)
Prefix: /api/admin

Admin-only twice over: @require_role('Admin') in Flask, and admin_role in the
database (only admin_role may read mv_oa_funnel_analytics directly; see
11_B_rls.sql).
"""

from __future__ import annotations

from flask import Blueprint, jsonify

from db_context import request_cursor
from middleware import require_auth, require_role
from routes.common import one, rows

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/users")
@require_auth
@require_role("Admin")
def users():
    """All users (password hash removed) with their funnel row and DSA counts (RBAC, rubric 12)."""
    with request_cursor() as cur:
        # to_jsonb(u) - 'password_hash' keeps this independent of the exact users columns.
        cur.execute("""
            SELECT to_jsonb(u) - 'password_hash'      AS profile,
                   to_jsonb(f) - 'user_id'            AS funnel,
                   d.problems, d.solved, d.revisit_needed, d.mastered
            FROM users u
            LEFT JOIN mv_oa_funnel_analytics f ON f.user_id = u.user_id
            LEFT JOIN LATERAL (
                SELECT count(*)                                          AS problems,
                       count(*) FILTER (WHERE p.status = 'Solved')          AS solved,
                       count(*) FILTER (WHERE p.status = 'Re-visit Needed') AS revisit_needed,
                       count(*) FILTER (WHERE p.status = 'Mastered')        AS mastered
                FROM dsa_problems p WHERE p.user_id = u.user_id
            ) d ON true
            ORDER BY u.role, u.email
        """)
        result = []
        for r in rows(cur):
            user = dict(r["profile"])
            user["funnel"] = r["funnel"]
            user["dsa"] = {k: r[k] for k in ("problems", "solved", "revisit_needed", "mastered")}
            result.append(user)
    return jsonify(result)


@bp.get("/overview")
@require_auth
@require_role("Admin")
def overview():
    """System totals across all users."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT (SELECT count(*) FROM users)                                  AS users,
                   (SELECT count(*) FROM users WHERE role = 'Student')           AS students,
                   (SELECT count(*) FROM dsa_problems)                           AS problems,
                   (SELECT count(*) FROM companies_oa)                           AS applications,
                   (SELECT count(*) FROM companies_oa WHERE stage = 'Offer')     AS offers,
                   (SELECT max(refreshed_at) FROM mv_oa_funnel_analytics)        AS funnel_refreshed_at
        """)
        totals = one(cur) or {}
        cur.execute("SELECT embedding_state, count(*) AS n FROM v_embedding_status GROUP BY 1")
        totals["embeddings"] = {"Current": 0, "Stale": 0, "Missing": 0}
        totals["embeddings"].update({r["embedding_state"]: r["n"] for r in rows(cur)})
    return jsonify(totals)


@bp.post("/refresh-funnel")
@require_auth
@require_role("Admin")
def refresh_funnel():
    """REFRESH MATERIALIZED VIEW CONCURRENTLY through fn_refresh_oa_funnel()."""
    with request_cursor() as cur:
        cur.execute("SELECT fn_refresh_oa_funnel()")
        cur.execute("SELECT max(refreshed_at) AS refreshed_at FROM mv_oa_funnel_analytics")
        return jsonify(one(cur))
