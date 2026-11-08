"""
Academics API: Courses, assignments, grades, and academic deadlines.

Owner: Atharva Gore (Member A)
Prefix: /api/academics
"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, g, jsonify, request

from db_context import request_cursor
from errors import ApiError
from middleware import require_auth
from routes.common import json_body, one, pick, require_fields, rows, update_statement

bp = Blueprint("academics", __name__, url_prefix="/api/academics")

COURSE_FIELDS = ("course_code", "course_name", "instructor", "semester", "credits")
ASSIGNMENT_FIELDS = ("course_id", "title", "description", "due_date", "status", "weightage", "grade")


# -----------------------------------------------------------------------------
# Courses
# -----------------------------------------------------------------------------

@bp.get("/courses")
@require_auth
def list_courses():
    """List all courses for current student with calculated progress and grades."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT course_id, user_id, course_code, course_name, instructor, semester, credits,
                   total_assignments, completed_assignments, graded_assignments,
                   total_weightage, graded_weightage, current_grade_percent
            FROM v_course_progress
            ORDER BY course_code, course_name
        """)
        return jsonify(rows(cur))


@bp.post("/courses")
@require_auth
def create_course():
    """Add a new course."""
    body = json_body()
    require_fields(body, "course_name")
    fields = pick(body, COURSE_FIELDS)

    with request_cursor() as cur:
        cur.execute(
            """
            INSERT INTO courses (user_id, course_code, course_name, instructor, semester, credits)
            VALUES (%s, %(course_code)s, %(course_name)s, %(instructor)s, %(semester)s, coalesce(%(credits)s, 3))
            RETURNING course_id
            """,
            {"user_id": g.user_id, **fields},
        )
        new_id = cur.fetchone()[0]

        cur.execute("SELECT * FROM v_course_progress WHERE course_id = %s", (new_id,))
        return jsonify(one(cur)), 201


@bp.get("/courses/<int:course_id>")
@require_auth
def get_course(course_id: int):
    """Get single course with progress metrics and its assignments."""
    with request_cursor() as cur:
        cur.execute("SELECT * FROM v_course_progress WHERE course_id = %s", (course_id,))
        course = one(cur)
        if not course:
            raise ApiError(404, "Course not found.")

        cur.execute("""
            SELECT assignment_id, course_id, title, description, due_date, status, weightage, grade, created_at
            FROM assignments
            WHERE course_id = %s
            ORDER BY due_date ASC
        """, (course_id,))
        course["assignments"] = rows(cur)
        return jsonify(course)


@bp.put("/courses/<int:course_id>")
@require_auth
def update_course(course_id: int):
    """Update course attributes."""
    body = json_body()
    fields = pick(body, COURSE_FIELDS)
    if not fields:
        raise ApiError(400, "No valid course fields to update.")

    with request_cursor() as cur:
        stmt = update_statement("courses", fields, "course_id")
        cur.execute(stmt, {**fields, "_key": course_id})
        if not cur.fetchone():
            raise ApiError(404, "Course not found.")

        cur.execute("SELECT * FROM v_course_progress WHERE course_id = %s", (course_id,))
        return jsonify(one(cur))


@bp.delete("/courses/<int:course_id>")
@require_auth
def delete_course(course_id: int):
    """Delete a course and cascade its assignments."""
    with request_cursor() as cur:
        cur.execute("DELETE FROM courses WHERE course_id = %s RETURNING course_id", (course_id,))
        if not cur.fetchone():
            raise ApiError(404, "Course not found.")
        return jsonify({"deleted": course_id})


# -----------------------------------------------------------------------------
# Assignments
# -----------------------------------------------------------------------------

@bp.get("/assignments")
@require_auth
def list_assignments():
    """List assignments with optional course_id or status filters."""
    course_id = request.args.get("course_id")
    status = request.args.get("status")

    clauses = ["1=1"]
    params: list[Any] = []

    if course_id:
        clauses.append("a.course_id = %s")
        params.append(course_id)
    if status:
        clauses.append("a.status = %s")
        params.append(status)

    where = " AND ".join(clauses)

    with request_cursor() as cur:
        cur.execute(f"""
            SELECT a.assignment_id, a.course_id, c.course_code, c.course_name,
                   a.title, a.description, a.due_date, a.status, a.weightage, a.grade,
                   (SELECT task_id FROM tasks t WHERE t.assignment_id = a.assignment_id LIMIT 1) AS task_id,
                   a.created_at
            FROM assignments a
            JOIN courses c ON c.course_id = a.course_id
            WHERE {where}
            ORDER BY a.due_date ASC
        """, params)
        return jsonify(rows(cur))


@bp.post("/assignments")
@require_auth
def create_assignment():
    """Create an assignment; automatically creates a linked task via trigger."""
    body = json_body()
    require_fields(body, "course_id", "title", "due_date")
    fields = pick(body, ASSIGNMENT_FIELDS)

    with request_cursor() as cur:
        cur.execute(
            """
            INSERT INTO assignments (user_id, course_id, title, description, due_date, status, weightage, grade)
            VALUES (%s, %(course_id)s, %(title)s, %(description)s, %(due_date)s,
                    coalesce(%(status)s, 'Not Started'), %(weightage)s, %(grade)s)
            RETURNING assignment_id
            """,
            {"user_id": g.user_id, **fields},
        )
        new_id = cur.fetchone()[0]

        cur.execute("""
            SELECT a.*, c.course_code, c.course_name
            FROM assignments a
            JOIN courses c ON c.course_id = a.course_id
            WHERE a.assignment_id = %s
        """, (new_id,))
        return jsonify(one(cur)), 201


@bp.get("/assignments/<int:assignment_id>")
@require_auth
def get_assignment(assignment_id: int):
    """Get single assignment."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT a.*, c.course_code, c.course_name
            FROM assignments a
            JOIN courses c ON c.course_id = a.course_id
            WHERE a.assignment_id = %s
        """, (assignment_id,))
        item = one(cur)
        if not item:
            raise ApiError(404, "Assignment not found.")
        return jsonify(item)


@bp.put("/assignments/<int:assignment_id>")
@require_auth
def update_assignment(assignment_id: int):
    """Update assignment fields (status, grade, due_date, weightage)."""
    body = json_body()
    fields = pick(body, ASSIGNMENT_FIELDS)
    if not fields:
        raise ApiError(400, "No valid assignment fields to update.")

    with request_cursor() as cur:
        stmt = update_statement("assignments", fields, "assignment_id")
        cur.execute(stmt, {**fields, "_key": assignment_id})
        if not cur.fetchone():
            raise ApiError(404, "Assignment not found.")

        cur.execute("""
            SELECT a.*, c.course_code, c.course_name
            FROM assignments a
            JOIN courses c ON c.course_id = a.course_id
            WHERE a.assignment_id = %s
        """, (assignment_id,))
        return jsonify(one(cur))


@bp.delete("/assignments/<int:assignment_id>")
@require_auth
def delete_assignment(assignment_id: int):
    """Delete an assignment."""
    with request_cursor() as cur:
        cur.execute("DELETE FROM assignments WHERE assignment_id = %s RETURNING assignment_id", (assignment_id,))
        if not cur.fetchone():
            raise ApiError(404, "Assignment not found.")
        return jsonify({"deleted": assignment_id})


@bp.get("/deadlines")
@require_auth
def upcoming_deadlines():
    """Chronological timeline of upcoming assignments and tasks."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT item_type, item_id, display_title, category, target_date, days_remaining, status
            FROM v_upcoming_deadlines
            ORDER BY target_date ASC NULLS LAST
        """)
        return jsonify(rows(cur))
