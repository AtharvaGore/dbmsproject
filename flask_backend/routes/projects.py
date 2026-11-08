"""
Personal Projects API: Portfolio and side project tracking.

Owner: Atharva Gore (Member A)
Prefix: /api/projects
"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, g, jsonify

from db_context import request_cursor
from errors import ApiError
from middleware import require_auth
from routes.common import json_body, one, pick, require_fields, rows, update_statement

bp = Blueprint("projects", __name__, url_prefix="/api/projects")

PROJECT_FIELDS = ("title", "description", "status", "tech_stack", "github_url", "live_url")


@bp.get("")
@require_auth
def list_projects():
    """List all projects for the current user with task counts."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT p.project_id, p.title, p.description, p.status, p.tech_stack,
                   p.github_url, p.live_url, p.created_at,
                   count(t.task_id)                                   AS total_tasks,
                   count(t.task_id) FILTER (WHERE t.status <> 'Done') AS open_tasks
            FROM personal_projects p
            LEFT JOIN tasks t ON t.project_id = p.project_id
            GROUP BY p.project_id
            ORDER BY
                CASE p.status
                    WHEN 'In Development' THEN 1
                    WHEN 'Idea'           THEN 2
                    WHEN 'Shipped'        THEN 3
                    ELSE 4
                END,
                p.created_at DESC
        """)
        return jsonify(rows(cur))


@bp.post("")
@require_auth
def create_project():
    """Create a new personal project."""
    body = json_body()
    require_fields(body, "title")
    fields = pick(body, PROJECT_FIELDS)

    with request_cursor() as cur:
        cur.execute(
            """
            INSERT INTO personal_projects (user_id, title, description, status, tech_stack, github_url, live_url)
            VALUES (%s, %(title)s, %(description)s, coalesce(%(status)s, 'Idea'),
                    coalesce(%(tech_stack)s, '{}'), %(github_url)s, %(live_url)s)
            RETURNING project_id
            """,
            {"user_id": g.user_id, **fields},
        )
        new_id = cur.fetchone()[0]

        cur.execute("SELECT * FROM personal_projects WHERE project_id = %s", (new_id,))
        return jsonify(one(cur)), 201


@bp.get("/<int:project_id>")
@require_auth
def get_project(project_id: int):
    """Get single project with its linked tasks."""
    with request_cursor() as cur:
        cur.execute("SELECT * FROM personal_projects WHERE project_id = %s", (project_id,))
        project = one(cur)
        if not project:
            raise ApiError(404, "Project not found.")

        cur.execute("""
            SELECT task_id, title, priority, status, scheduled_date
            FROM tasks
            WHERE project_id = %s
            ORDER BY status DESC, priority, scheduled_date
        """, (project_id,))
        project["tasks"] = rows(cur)
        return jsonify(project)


@bp.put("/<int:project_id>")
@require_auth
def update_project(project_id: int):
    """Update project fields (title, status, tech_stack, links)."""
    body = json_body()
    fields = pick(body, PROJECT_FIELDS)
    if not fields:
        raise ApiError(400, "No valid project fields to update.")

    with request_cursor() as cur:
        stmt = update_statement("personal_projects", fields, "project_id")
        cur.execute(stmt, {**fields, "_key": project_id})
        if not cur.fetchone():
            raise ApiError(404, "Project not found.")

        cur.execute("SELECT * FROM personal_projects WHERE project_id = %s", (project_id,))
        return jsonify(one(cur))


@bp.delete("/<int:project_id>")
@require_auth
def delete_project(project_id: int):
    """Delete a personal project."""
    with request_cursor() as cur:
        cur.execute("DELETE FROM personal_projects WHERE project_id = %s RETURNING project_id", (project_id,))
        if not cur.fetchone():
            raise ApiError(404, "Project not found.")
        return jsonify({"deleted": project_id})
