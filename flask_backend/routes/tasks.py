"""
Tasks and Action Center API: Unified to-do tracking across all domains.

Owner: Atharva Gore (Member A)
Prefix: /api/tasks
"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, g, jsonify, request

from db_context import request_cursor
from errors import ApiError
from middleware import require_auth
from routes.common import json_body, one, pick, require_fields, rows, update_statement

bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")

TASK_FIELDS = (
    "title", "category", "priority", "status", "scheduled_date",
    "assignment_id", "project_id", "problem_id", "oa_id",
)


@bp.get("")
@require_auth
def list_tasks():
    """List tasks for the current user with optional filtering."""
    status = request.args.get("status")
    category = request.args.get("category")
    priority = request.args.get("priority")

    clauses = ["1=1"]
    params: list[Any] = []

    if status:
        clauses.append("t.status = %s")
        params.append(status)
    if category:
        clauses.append("t.category = %s")
        params.append(category)
    if priority:
        clauses.append("t.priority = %s")
        params.append(priority)

    where = " AND ".join(clauses)

    with request_cursor() as cur:
        cur.execute(f"""
            SELECT t.task_id, t.user_id, t.title, t.category, t.priority, t.status,
                   t.scheduled_date, t.assignment_id, t.project_id, t.problem_id, t.oa_id,
                   t.created_at,
                   COALESCE(
                       c.course_code || ': ' || a.title,
                       p.title,
                       dp.title,
                       co.company_name,
                       NULL
                   ) AS context_name
            FROM tasks t
            LEFT JOIN assignments a       ON a.assignment_id = t.assignment_id
            LEFT JOIN courses c           ON c.course_id = a.course_id
            LEFT JOIN personal_projects p ON p.project_id = t.project_id
            LEFT JOIN dsa_problems dp     ON dp.problem_id = t.problem_id
            LEFT JOIN companies_oa co     ON co.oa_id = t.oa_id
            WHERE {where}
            ORDER BY
                CASE t.status WHEN 'To Do' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END,
                CASE t.priority
                    WHEN 'P0 - Urgent' THEN 1
                    WHEN 'P1 - High'   THEN 2
                    WHEN 'P2 - Medium' THEN 3
                    WHEN 'P3 - Low'    THEN 4
                    ELSE 5
                END,
                t.scheduled_date ASC NULLS LAST
        """, params)
        return jsonify(rows(cur))


@bp.post("")
@require_auth
def create_task():
    """Create a new task item."""
    body = json_body()
    require_fields(body, "title")
    fields = pick(body, TASK_FIELDS)

    with request_cursor() as cur:
        cur.execute(
            """
            INSERT INTO tasks (
                user_id, title, category, priority, status,
                scheduled_date, assignment_id, project_id, problem_id, oa_id
            )
            VALUES (
                %s, %(title)s, coalesce(%(category)s, 'General'),
                coalesce(%(priority)s, 'P2 - Medium'), coalesce(%(status)s, 'To Do'),
                %(scheduled_date)s, %(assignment_id)s, %(project_id)s, %(problem_id)s, %(oa_id)s
            )
            RETURNING task_id
            """,
            {"user_id": g.user_id, **fields},
        )
        new_id = cur.fetchone()[0]

        cur.execute("SELECT * FROM tasks WHERE task_id = %s", (new_id,))
        return jsonify(one(cur)), 201


@bp.get("/<int:task_id>")
@require_auth
def get_task(task_id: int):
    """Get single task details."""
    with request_cursor() as cur:
        cur.execute("SELECT * FROM tasks WHERE task_id = %s", (task_id,))
        task = one(cur)
        if not task:
            raise ApiError(404, "Task not found.")
        return jsonify(task)


@bp.put("/<int:task_id>")
@require_auth
def update_task(task_id: int):
    """Update task fields (title, status, priority, scheduled_date)."""
    body = json_body()
    fields = pick(body, TASK_FIELDS)
    if not fields:
        raise ApiError(400, "No valid task fields to update.")

    with request_cursor() as cur:
        stmt = update_statement("tasks", fields, "task_id")
        cur.execute(stmt, {**fields, "_key": task_id})
        if not cur.fetchone():
            raise ApiError(404, "Task not found.")

        cur.execute("SELECT * FROM tasks WHERE task_id = %s", (task_id,))
        return jsonify(one(cur))


@bp.delete("/<int:task_id>")
@require_auth
def delete_task(task_id: int):
    """Delete a task."""
    with request_cursor() as cur:
        cur.execute("DELETE FROM tasks WHERE task_id = %s RETURNING task_id", (task_id,))
        if not cur.fetchone():
            raise ApiError(404, "Task not found.")
        return jsonify({"deleted": task_id})


@bp.post("/<int:task_id>/complete")
@require_auth
def complete_task(task_id: int):
    """Mark task complete and cascade updates using stored procedure."""
    with request_cursor() as cur:
        cur.execute("CALL sp_complete_task(%s);", (task_id,))
        cur.execute("SELECT * FROM tasks WHERE task_id = %s", (task_id,))
        return jsonify(one(cur))


@bp.post("/<int:task_id>/reschedule")
@require_auth
def reschedule_task(task_id: int):
    """Reschedule task using stored procedure."""
    body = json_body()
    require_fields(body, "scheduled_date")
    new_date = body["scheduled_date"]

    with request_cursor() as cur:
        cur.execute("CALL sp_reschedule_task(%s, %s::date);", (task_id, new_date))
        cur.execute("SELECT * FROM tasks WHERE task_id = %s", (task_id,))
        return jsonify(one(cur))


@bp.get("/action-center")
@require_auth
def action_center():
    """Unified Action Center priority feed and summary stats."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT task_id, user_id, title, category, priority, status,
                   scheduled_date, urgency, context_type, context_title, context_id
            FROM v_action_center
            LIMIT 50
        """)
        feed = rows(cur)

        cur.execute("""
            SELECT total_pending, overdue_count, due_today_count, due_week_count, high_priority_count
            FROM v_action_center_summary
            WHERE user_id = %s
        """, (g.user_id,))
        summary = one(cur) or {
            "total_pending": 0, "overdue_count": 0, "due_today_count": 0,
            "due_week_count": 0, "high_priority_count": 0,
        }

        return jsonify({
            "feed": feed,
            "summary": summary,
        })
