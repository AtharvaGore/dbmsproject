-- ============================================================
-- Full-text search (GIN) + semantic search (pgvector HNSW)
-- Needs pgvector >= 0.5.0 for HNSW and PostgreSQL >= 11 for websearch_to_tsquery.
-- ============================================================

-- FTS: title (A) > tags (B) > notes (C)
CREATE OR REPLACE FUNCTION fn_dsa_update_tsv() RETURNS trigger AS $$
BEGIN
    NEW.search_tsv :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(array_to_string(NEW.topic_tags, ' '), '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.intuition_notes, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsa_update_tsv ON dsa_problems;
CREATE TRIGGER trg_dsa_update_tsv
BEFORE INSERT OR UPDATE OF title, topic_tags, intuition_notes ON dsa_problems
FOR EACH ROW EXECUTE FUNCTION fn_dsa_update_tsv();

-- Backfill rows inserted before the trigger existed (e.g. seed data)
UPDATE dsa_problems SET title = title WHERE search_tsv IS NULL;

CREATE INDEX IF NOT EXISTS idx_dsa_fts ON dsa_problems USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS idx_dsa_embeddings_hnsw
    ON dsa_embeddings USING hnsw (embedding_vector vector_cosine_ops);

CREATE OR REPLACE FUNCTION search_dsa_fts(p_user_id UUID, p_query TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (problem_id BIGINT, title VARCHAR, difficulty VARCHAR, status VARCHAR,
               intuition_notes TEXT, relevance_rank REAL)
LANGUAGE sql STABLE AS $$
    SELECT p.problem_id, p.title, p.difficulty, p.status, p.intuition_notes,
           ts_rank(p.search_tsv, q.tsq)
    FROM dsa_problems p, websearch_to_tsquery('english', p_query) AS q(tsq)
    WHERE p.user_id = p_user_id AND p.search_tsv @@ q.tsq
    ORDER BY ts_rank(p.search_tsv, q.tsq) DESC, p.problem_id
    LIMIT p_limit;
$$;

-- similarity_score = cosine similarity (1 = identical direction)
CREATE OR REPLACE FUNCTION search_dsa_vector(p_user_id UUID, p_query VECTOR(1536), p_limit INT DEFAULT 5)
RETURNS TABLE (problem_id BIGINT, title VARCHAR, difficulty VARCHAR, status VARCHAR,
               intuition_notes TEXT, similarity_score DOUBLE PRECISION)
LANGUAGE sql STABLE AS $$
    SELECT p.problem_id, p.title, p.difficulty, p.status, p.intuition_notes,
           1 - (e.embedding_vector <=> p_query)
    FROM dsa_embeddings e
    JOIN dsa_problems p ON p.problem_id = e.problem_id
    WHERE p.user_id = p_user_id
    ORDER BY e.embedding_vector <=> p_query
    LIMIT p_limit;
$$;
