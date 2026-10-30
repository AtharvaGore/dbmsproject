"""
DSA practice API: problems, topics, embeddings, keyword and semantic search.

Owner: Bhooshan Deshpande (Member B)
Prefix: /api/dsa

Every route runs through request_cursor(), so the database's row-level
security decides what the caller can see; no query filters by user_id by hand.
"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify, request

import embedder
from db_context import request_cursor
from errors import ApiError
from middleware import require_auth
from routes.common import (insert_statement, int_arg, json_body, one, pick,
                           require_fields, rows, update_statement)
from psycopg2 import sql

bp = Blueprint("dsa", __name__, url_prefix="/api/dsa")

PROBLEM_FIELDS = ("title", "platform", "difficulty", "status", "problem_url", "intuition_notes")

PROBLEM_SELECT = """
    SELECT p.problem_id, p.title, p.platform, p.difficulty, p.status,
           p.problem_url, p.intuition_notes, p.last_revised, p.created_at,
           coalesce(array_agg(t.name ORDER BY t.name) FILTER (WHERE t.name IS NOT NULL),
                    '{}') AS topics,
           es.embedding_state,
           (SELECT min(tk.scheduled_date) FROM tasks tk
             WHERE tk.problem_id = p.problem_id AND tk.status <> 'Done') AS review_due
    FROM dsa_problems p
    LEFT JOIN dsa_problem_topics dpt ON dpt.problem_id = p.problem_id
    LEFT JOIN topics t               ON t.topic_id     = dpt.topic_id
    LEFT JOIN v_embedding_status es  ON es.problem_id  = p.problem_id
"""


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _get_problem(cur, problem_id: int) -> dict[str, Any]:
    cur.execute(PROBLEM_SELECT + " WHERE p.problem_id = %s GROUP BY p.problem_id, es.embedding_state",
                (problem_id,))
    problem = one(cur)
    if problem is None:
        raise ApiError(404, "Problem not found.")
    return problem


def _clean_topics(value: Any) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(t, str) for t in value):
        raise ApiError(400, "topics must be a list of names.")
    seen: dict[str, str] = {}
    for name in value:
        name = " ".join(name.split())
        if name and name.lower() not in seen:
            seen[name.lower()] = name
    return list(seen.values())


def _set_topics(cur, problem_id: int, names: list[str]) -> None:
    """Replace a problem's topics, creating unknown topic names (M:N TAGGED)."""
    cur.execute("DELETE FROM dsa_problem_topics WHERE problem_id = %s", (problem_id,))
    if not names:
        return
    cur.execute("INSERT INTO topics (name) SELECT unnest(%s::text[]) ON CONFLICT (name) DO NOTHING",
                (names,))
    cur.execute("""
        INSERT INTO dsa_problem_topics (problem_id, topic_id)
        SELECT %s, topic_id FROM topics WHERE name = ANY(%s::text[])
    """, (problem_id, names))


def _embed_problem(cur, problem_id: int) -> tuple[str, str | None]:
    """
    Vector update (rubric 9): embed the problem's current text if its
    embedding is Missing or Stale. Returns (embedding_state, warning).
    """
    cur.execute("SELECT embedding_state, text_to_embed FROM v_embedding_status WHERE problem_id = %s",
                (problem_id,))
    status = one(cur)
    if status is None:
        raise ApiError(404, "Problem not found.")
    if status["embedding_state"] == "Current":
        return "Current", None
    try:
        vector = embedder.embed(status["text_to_embed"])
    except embedder.EmbeddingUnavailable:
        return status["embedding_state"], ("Saved, but the embedding model is unavailable, so "
                                           "semantic search will not find this problem yet.")
    cur.execute("SELECT fn_upsert_embedding(%s, %s::vector, %s)",
                (problem_id, embedder.to_pgvector(vector), embedder.MODEL_LABEL))
    cur.fetchone()
    return "Current", None


def _with_embedding(cur, problem_id: int, status: int = 200):
    state, warning = _embed_problem(cur, problem_id)
    problem = _get_problem(cur, problem_id)
    problem["embedding_state"] = state
    if warning:
        problem["warning"] = warning
    return jsonify(problem), status


def _review_task(cur, problem_id: int) -> dict[str, Any] | None:
    cur.execute("""
        SELECT task_id, title, status, priority, scheduled_date
        FROM tasks
        WHERE problem_id = %s
        ORDER BY (status <> 'Done') DESC, task_id DESC
        LIMIT 1
    """, (problem_id,))
    return one(cur)


# ---------------------------------------------------------------------------
# problems: CRUD
# ---------------------------------------------------------------------------

@bp.get("/problems")
@require_auth
def list_problems():
    """List problems with filters; topics via the M:N junction (joins, array_agg)."""
    params = {k: request.args.get(k) or None for k in ("status", "difficulty", "platform", "topic")}
    with request_cursor() as cur:
        cur.execute(PROBLEM_SELECT + """
            WHERE (%(status)s::text     IS NULL OR p.status     = %(status)s)
              AND (%(difficulty)s::text IS NULL OR p.difficulty = %(difficulty)s)
              AND (%(platform)s::text   IS NULL OR p.platform   = %(platform)s)
              AND (%(topic)s::text      IS NULL OR EXISTS (
                     SELECT 1 FROM dsa_problem_topics x JOIN topics y ON y.topic_id = x.topic_id
                     WHERE x.problem_id = p.problem_id AND y.name = %(topic)s))
            GROUP BY p.problem_id, es.embedding_state
            ORDER BY p.created_at DESC, p.problem_id DESC
        """, params)
        return jsonify(rows(cur))


@bp.get("/problems/<int:problem_id>")
@require_auth
def get_problem(problem_id: int):
    """Problem detail, the OAs it appeared in, and nearest neighbours (vector read, rubric 9)."""
    with request_cursor() as cur:
        problem = _get_problem(cur, problem_id)
        cur.execute("""
            SELECT o.oa_id, o.company_name, o.role_title, o.stage, odt.solved_during_oa
            FROM oa_dsa_tested odt
            JOIN companies_oa o ON o.oa_id = odt.oa_id
            WHERE odt.problem_id = %s
            ORDER BY o.applied_on DESC
        """, (problem_id,))
        problem["applications"] = rows(cur)
        cur.execute("SELECT * FROM find_similar_problems(%s, 5)", (problem_id,))
        problem["similar"] = rows(cur)
        problem["review_task"] = _review_task(cur, problem_id)
    return jsonify(problem)


@bp.post("/problems")
@require_auth
def create_problem():
    """Insert a problem + topics, then embed it (vector create, rubric 9)."""
    body = json_body()
    require_fields(body, "title", "difficulty")
    fields = {k: v for k, v in pick(body, PROBLEM_FIELDS).items() if v is not None}
    topics = _clean_topics(body.get("topics"))
    with request_cursor() as cur:
        cur.execute(insert_statement("dsa_problems", fields, "problem_id",
                                     extra={"user_id": sql.SQL("app_current_user_id()")}), fields)
        problem_id = cur.fetchone()[0]
        _set_topics(cur, problem_id, topics)
        return _with_embedding(cur, problem_id, 201)


@bp.put("/problems/<int:problem_id>")
@require_auth
def update_problem(problem_id: int):
    """Update fields and/or topics; re-embed only if title or notes changed (vector update)."""
    body = json_body()
    fields = pick(body, PROBLEM_FIELDS)
    for required in ("title", "difficulty", "platform", "status"):
        if required in fields and fields[required] is None:
            raise ApiError(400, f"{required} cannot be empty.")
    with request_cursor() as cur:
        if fields:
            cur.execute(update_statement("dsa_problems", fields, "problem_id"),
                        {**fields, "_key": problem_id})
            if cur.fetchone() is None:
                raise ApiError(404, "Problem not found.")
        else:
            _get_problem(cur, problem_id)
        if "topics" in body:
            _set_topics(cur, problem_id, _clean_topics(body["topics"]))
        return _with_embedding(cur, problem_id)


@bp.patch("/problems/<int:problem_id>/status")
@require_auth
def update_status(problem_id: int):
    """Status change; trg_dsa_revisit_task opens/closes the review task (trigger, rubric 8)."""
    body = json_body()
    require_fields(body, "status")
    with request_cursor() as cur:
        cur.execute("UPDATE dsa_problems SET status = %s WHERE problem_id = %s RETURNING problem_id",
                    (body["status"], problem_id))
        if cur.fetchone() is None:
            raise ApiError(404, "Problem not found.")
        problem = _get_problem(cur, problem_id)
        problem["review_task"] = _review_task(cur, problem_id)
    return jsonify(problem)


@bp.delete("/problems/<int:problem_id>")
@require_auth
def delete_problem(problem_id: int):
    """Delete; ON DELETE CASCADE removes topic links, OA links and the embedding."""
    with request_cursor() as cur:
        cur.execute("DELETE FROM dsa_problems WHERE problem_id = %s RETURNING problem_id", (problem_id,))
        if cur.fetchone() is None:
            raise ApiError(404, "Problem not found.")
    return "", 204


# ---------------------------------------------------------------------------
# embeddings
# ---------------------------------------------------------------------------

@bp.delete("/problems/<int:problem_id>/embedding")
@require_auth
def delete_embedding(problem_id: int):
    """Vector delete (rubric 9 RUD). The problem stays; its state becomes Missing."""
    with request_cursor() as cur:
        _get_problem(cur, problem_id)
        cur.execute("DELETE FROM dsa_embeddings WHERE problem_id = %s", (problem_id,))
    return "", 204


@bp.post("/embeddings/refresh")
@require_auth
def refresh_embeddings():
    """Vector update in bulk: re-embed this user's Missing or Stale problems."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT problem_id, text_to_embed FROM v_embedding_status
            WHERE embedding_state IN ('Missing', 'Stale') ORDER BY problem_id
        """)
        pending = rows(cur)
        try:
            vectors = embedder.embed_many([p["text_to_embed"] for p in pending])
        except embedder.EmbeddingUnavailable as exc:
            raise ApiError(503, "The embedding model is unavailable.") from exc
        counts = {"inserted": 0, "updated": 0, "unchanged": 0}
        for p, vector in zip(pending, vectors):
            cur.execute("SELECT fn_upsert_embedding(%s, %s::vector, %s)",
                        (p["problem_id"], embedder.to_pgvector(vector), embedder.MODEL_LABEL))
            counts[cur.fetchone()[0]] += 1
    return jsonify({"processed": len(pending), **counts})


# ---------------------------------------------------------------------------
# search
# ---------------------------------------------------------------------------

@bp.get("/search/fts")
@require_auth
def search_fts():
    """Full-text search (GIN index, websearch_to_tsquery, ts_rank_cd, ts_headline)."""
    q = (request.args.get("q") or "").strip()
    if not q:
        raise ApiError(400, "Query parameter q is required.")
    limit = int_arg("limit", 10)
    with request_cursor() as cur:
        cur.execute("SELECT * FROM search_dsa_fts(%s, %s)", (q, limit))
        return jsonify(rows(cur))


@bp.post("/search/vector")
@require_auth
def search_vector():
    """Semantic search (rubric 9): embed the query, cosine distance over the HNSW index."""
    body = json_body()
    require_fields(body, "query")
    try:
        limit = max(1, min(50, int(body.get("limit", 5))))
        min_similarity = float(body.get("min_similarity", 0))
    except (TypeError, ValueError) as exc:
        raise ApiError(400, "limit and min_similarity must be numbers.") from exc
    try:
        vector = embedder.embed(str(body["query"]))
    except embedder.EmbeddingUnavailable as exc:
        raise ApiError(503, "Semantic search is unavailable right now; try keyword search.",
                       fallback="fts") from exc
    with request_cursor() as cur:
        cur.execute("SELECT * FROM search_dsa_vector(%s::vector, %s, %s)",
                    (embedder.to_pgvector(vector), limit, min_similarity))
        return jsonify(rows(cur))


@bp.get("/problems/<int:problem_id>/similar")
@require_auth
def similar_problems(problem_id: int):
    """'More like this' from the stored embedding; no model call (vector read)."""
    limit = int_arg("limit", 5)
    with request_cursor() as cur:
        _get_problem(cur, problem_id)
        cur.execute("SELECT * FROM find_similar_problems(%s, %s)", (problem_id, limit))
        return jsonify(rows(cur))


# ---------------------------------------------------------------------------
# topics and stats
# ---------------------------------------------------------------------------

@bp.get("/topics")
@require_auth
def list_topics():
    with request_cursor() as cur:
        cur.execute("SELECT topic_id, name FROM topics ORDER BY name")
        return jsonify(rows(cur))


@bp.get("/topics/progress")
@require_auth
def topic_progress():
    """Per-topic progress (GROUP BY over both junction tables, v_topic_progress)."""
    with request_cursor() as cur:
        cur.execute("""
            SELECT topic_id, topic, problems, mastered, solved, revisit_needed,
                   times_in_oa, failed_in_oa
            FROM v_topic_progress
            WHERE user_id = app_current_user_id()
            ORDER BY revisit_needed DESC, problems DESC, topic
        """)
        return jsonify(rows(cur))


@bp.get("/stats")
@require_auth
def stats():
    """Dashboard numbers: GROUP BY totals, GROUP BY/HAVING weak topics, NOT EXISTS query."""
    with request_cursor() as cur:
        cur.execute("SELECT status, count(*) AS n FROM dsa_problems GROUP BY status")
        by_status = {r["status"]: r["n"] for r in rows(cur)}
        cur.execute("SELECT difficulty, count(*) AS n FROM dsa_problems GROUP BY difficulty")
        by_difficulty = {r["difficulty"]: r["n"] for r in rows(cur)}
        cur.execute("""
            SELECT t.name AS topic, count(*) AS revisit_needed
            FROM dsa_problems p
            JOIN dsa_problem_topics dpt ON dpt.problem_id = p.problem_id
            JOIN topics t               ON t.topic_id     = dpt.topic_id
            WHERE p.status = 'Re-visit Needed'
            GROUP BY t.name
            HAVING count(*) >= 3
            ORDER BY revisit_needed DESC, topic
        """)
        weak_topics = rows(cur)
        cur.execute("""
            SELECT p.problem_id, p.title, p.difficulty, p.status
            FROM dsa_problems p
            WHERE NOT EXISTS (SELECT 1 FROM oa_dsa_tested odt WHERE odt.problem_id = p.problem_id)
            ORDER BY p.difficulty DESC, p.title
        """)
        never_in_oa = rows(cur)
    return jsonify({
        "total": sum(by_status.values()),
        "by_status": by_status,
        "by_difficulty": by_difficulty,
        "weak_topics": weak_topics,
        "never_in_oa": never_in_oa,
    })
