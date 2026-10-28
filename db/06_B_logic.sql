-- =============================================================================
-- 06_B_logic.sql
-- Owner: Bhooshan Deshpande (Member B)
-- Runs after the seed files, so none of these triggers fire on seed data.
--
-- Contents
--   1. Helper functions
--   2. Triggers                                   (rubric 8: trigger)
--        trg_dsa_revisit_task       review task when a problem needs a revisit
--        trg_dsa_touch_revised      stamp last_revised when a revisit is done
--        trg_oa_stage_history       log every application stage change
--        trg_oa_dsa_same_owner      both sides of a link belong to one user
--   3. Search functions                           (rubric 9: vector feature; FTS)
--        search_dsa_fts, search_dsa_vector, find_similar_problems
--   4. Embedding read / update / delete           (rubric 9: RUD)
--        fn_upsert_embedding, v_embedding_status
--   5. Stored procedure + transaction             (rubric 8: procedure)
--        sp_log_oa_event
--   6. Materialized view + refresh                (advanced: materialized view)
--        mv_oa_funnel_analytics, fn_refresh_oa_funnel, v_my_oa_funnel
--   7. Views for the DSA page
--        v_topic_progress
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Helpers
-- -----------------------------------------------------------------------------

-- The logged-in user's id, set per request by Flask (request_cursor) with
-- set_config('app.user_id', ..., true). NULL when no user context is set.
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

-- The exact text that gets embedded for a problem. Defined once, here, so the
-- Python embedder and the staleness check can never disagree about it.
CREATE OR REPLACE FUNCTION fn_embedding_text(p_title TEXT, p_notes TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
    SELECT coalesce(p_title, '') || E'\n' || coalesce(p_notes, '');
$$;

-- Position of a stage in the funnel. Rejected is an exit, not a step, so it
-- has no rank.
CREATE OR REPLACE FUNCTION fn_stage_rank(p_stage TEXT)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
    SELECT CASE p_stage
        WHEN 'Applied'         THEN 1
        WHEN 'OA Received'     THEN 2
        WHEN 'OA Cleared'      THEN 3
        WHEN 'Technical Round' THEN 4
        WHEN 'HR Round'        THEN 5
        WHEN 'Offer'           THEN 6
    END;
$$;


-- -----------------------------------------------------------------------------
-- 2. Triggers
-- -----------------------------------------------------------------------------

-- 2a. Spaced repetition.
-- When a problem moves INTO 'Re-visit Needed', add a high-priority review task
-- five days out, unless an open review task for it already exists.
-- When it moves OUT of 'Re-visit Needed', close its open review tasks.
-- Firing only on an actual status change (not on every save) avoids the
-- duplicate-task bug in the original spec.
CREATE OR REPLACE FUNCTION fn_dsa_revisit_task()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'Re-visit Needed'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN

        IF NOT EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.problem_id = NEW.problem_id
              AND t.status <> 'Done'
        ) THEN
            INSERT INTO tasks (user_id, title, category, priority, status,
                               scheduled_date, problem_id)
            VALUES (NEW.user_id, 'Revisit: ' || NEW.title, 'DSA', 'P1 - High',
                    'To Do', current_date + 5, NEW.problem_id);
        END IF;

    ELSIF TG_OP = 'UPDATE'
          AND OLD.status = 'Re-visit Needed'
          AND NEW.status <> 'Re-visit Needed' THEN

        UPDATE tasks
           SET status = 'Done'
         WHERE problem_id = NEW.problem_id
           AND category = 'DSA'
           AND status <> 'Done';
    END IF;

    RETURN NULL;   -- AFTER trigger: return value is ignored
END;
$$;

CREATE TRIGGER trg_dsa_revisit_task
AFTER INSERT OR UPDATE OF status ON dsa_problems
FOR EACH ROW
EXECUTE FUNCTION fn_dsa_revisit_task();


-- 2b. When a revisit is completed (status leaves 'Re-visit Needed'), record
-- today as last_revised. BEFORE trigger, so it edits the row being written.
CREATE OR REPLACE FUNCTION fn_dsa_touch_revised()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'Re-visit Needed' AND NEW.status <> 'Re-visit Needed' THEN
        NEW.last_revised := current_date;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dsa_touch_revised
BEFORE UPDATE OF status ON dsa_problems
FOR EACH ROW
EXECUTE FUNCTION fn_dsa_touch_revised();


-- 2c. Stage history. companies_oa only stores the current stage; this keeps
-- the full path, which the funnel analytics need (a rejected application can
-- still have cleared its OA). clock_timestamp() rather than now(), so two
-- changes inside one transaction still get distinct keys.
CREATE OR REPLACE FUNCTION fn_oa_stage_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage THEN
        INSERT INTO oa_stage_history (oa_id, changed_at, stage)
        VALUES (NEW.oa_id, clock_timestamp(), NEW.stage);
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_oa_stage_history
AFTER INSERT OR UPDATE OF stage ON companies_oa
FOR EACH ROW
EXECUTE FUNCTION fn_oa_stage_history();


-- 2d. Integrity check that foreign keys alone cannot express: an application
-- may only be linked to problems logged by the SAME user.
CREATE OR REPLACE FUNCTION fn_oa_dsa_same_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_oa_owner      UUID;
    v_problem_owner UUID;
BEGIN
    SELECT user_id INTO v_oa_owner      FROM companies_oa WHERE oa_id = NEW.oa_id;
    SELECT user_id INTO v_problem_owner FROM dsa_problems WHERE problem_id = NEW.problem_id;

    IF v_oa_owner IS NULL OR v_problem_owner IS NULL
       OR v_oa_owner <> v_problem_owner THEN
        RAISE EXCEPTION 'Problem % cannot be linked to application %: both must exist and belong to the same user',
                        NEW.problem_id, NEW.oa_id
              USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_oa_dsa_same_owner
BEFORE INSERT OR UPDATE ON oa_dsa_tested
FOR EACH ROW
EXECUTE FUNCTION fn_oa_dsa_same_owner();


-- -----------------------------------------------------------------------------
-- 3. Search
-- All functions are SECURITY INVOKER (the default), so row-level security
-- applies: a student only ever searches their own problems. No user_id
-- parameter is needed.
-- -----------------------------------------------------------------------------

-- 3a. Lexical search. websearch_to_tsquery accepts Google-style input:
--   sliding window          both words
--   "two pointers"          exact phrase
--   dp -knapsack            exclude a word
--   heap or stack           either word
-- Ranked with ts_rank_cd (cover density); title hits weigh more (setweight A).
CREATE OR REPLACE FUNCTION search_dsa_fts(p_query TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (
    problem_id BIGINT,
    title      VARCHAR,
    platform   VARCHAR,
    difficulty VARCHAR,
    status     VARCHAR,
    rank       REAL,
    snippet    TEXT
)
LANGUAGE sql STABLE
AS $$
    WITH q AS (SELECT websearch_to_tsquery('english', p_query) AS tsq)
    SELECT p.problem_id, p.title, p.platform, p.difficulty, p.status,
           ts_rank_cd(p.fts_tokens, q.tsq) AS rank,
           ts_headline('english', coalesce(p.intuition_notes, ''), q.tsq,
                       'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=12') AS snippet
    FROM dsa_problems p, q
    WHERE p.fts_tokens @@ q.tsq
    ORDER BY rank DESC, p.title
    LIMIT least(greatest(p_limit, 1), 50);
$$;


-- 3b. Semantic search. The caller (Flask) embeds the query text with the same
-- model and passes the vector in. Cosine distance <=> ranges 0..2; we report
-- similarity = 1 - distance. The inner ORDER BY distance + LIMIT is the shape
-- the HNSW index can serve; the similarity floor is applied afterwards.
CREATE OR REPLACE FUNCTION search_dsa_vector(
    p_query_embedding VECTOR(384),
    p_limit           INT    DEFAULT 5,
    p_min_similarity  FLOAT8 DEFAULT 0.0
)
RETURNS TABLE (
    problem_id BIGINT,
    title      VARCHAR,
    platform   VARCHAR,
    difficulty VARCHAR,
    status     VARCHAR,
    similarity FLOAT8
)
LANGUAGE sql STABLE
AS $$
    SELECT r.problem_id, r.title, r.platform, r.difficulty, r.status, r.similarity
    FROM (
        SELECT p.problem_id, p.title, p.platform, p.difficulty, p.status,
               1 - (e.embedding <=> p_query_embedding) AS similarity
        FROM dsa_embeddings e
        JOIN dsa_problems p ON p.problem_id = e.problem_id
        ORDER BY e.embedding <=> p_query_embedding
        LIMIT least(greatest(p_limit, 1), 50)
    ) r
    WHERE r.similarity >= p_min_similarity
    ORDER BY r.similarity DESC;
$$;


-- 3c. "More like this": neighbours of a problem using its stored embedding.
-- Needs no model call at all.
CREATE OR REPLACE FUNCTION find_similar_problems(p_problem_id BIGINT, p_limit INT DEFAULT 5)
RETURNS TABLE (
    problem_id BIGINT,
    title      VARCHAR,
    difficulty VARCHAR,
    status     VARCHAR,
    similarity FLOAT8
)
LANGUAGE sql STABLE
AS $$
    SELECT p.problem_id, p.title, p.difficulty, p.status,
           1 - (e.embedding <=> src.embedding) AS similarity
    FROM dsa_embeddings src
    JOIN dsa_embeddings e ON e.problem_id <> src.problem_id
    JOIN dsa_problems p   ON p.problem_id = e.problem_id
    WHERE src.problem_id = p_problem_id
    ORDER BY e.embedding <=> src.embedding
    LIMIT least(greatest(p_limit, 1), 50);
$$;


-- -----------------------------------------------------------------------------
-- 4. Embedding read / update / delete
--   Read:   search_dsa_vector, find_similar_problems, v_embedding_status
--   Update: fn_upsert_embedding (called by Flask after notes change)
--   Delete: ON DELETE CASCADE from dsa_problems, or a direct
--           DELETE FROM dsa_embeddings WHERE problem_id = ...
-- -----------------------------------------------------------------------------

-- Which problems have a current, stale or missing embedding. "Stale" means
-- the title or notes changed after the vector was made.
CREATE VIEW v_embedding_status WITH (security_invoker = true) AS
SELECT p.problem_id,
       p.user_id,
       p.title,
       CASE
           WHEN e.problem_id IS NULL THEN 'Missing'
           WHEN e.source_hash <> md5(fn_embedding_text(p.title, p.intuition_notes)) THEN 'Stale'
           ELSE 'Current'
       END AS embedding_state,
       fn_embedding_text(p.title, p.intuition_notes) AS text_to_embed,
       e.model,
       e.embedded_at
FROM dsa_problems p
LEFT JOIN dsa_embeddings e ON e.problem_id = p.problem_id;


-- Insert or replace a problem's embedding. The hash is computed here from the
-- problem's current text, so it always describes what is stored.
-- Returns 'inserted', 'updated' or 'unchanged'.
CREATE OR REPLACE FUNCTION fn_upsert_embedding(
    p_problem_id BIGINT,
    p_embedding  VECTOR(384),
    p_model      VARCHAR
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_hash      CHAR(32);
    v_old_hash  CHAR(32);
    v_old_model VARCHAR;
BEGIN
    SELECT md5(fn_embedding_text(title, intuition_notes))
      INTO v_hash
      FROM dsa_problems
     WHERE problem_id = p_problem_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Problem % not found', p_problem_id
              USING ERRCODE = 'no_data_found';
    END IF;

    SELECT source_hash, model INTO v_old_hash, v_old_model
      FROM dsa_embeddings
     WHERE problem_id = p_problem_id;

    IF v_old_hash = v_hash AND v_old_model = p_model THEN
        RETURN 'unchanged';
    END IF;

    INSERT INTO dsa_embeddings (problem_id, embedding, model, source_hash, embedded_at)
    VALUES (p_problem_id, p_embedding, p_model, v_hash, now())
    ON CONFLICT (problem_id) DO UPDATE
        SET embedding   = EXCLUDED.embedding,
            model       = EXCLUDED.model,
            source_hash = EXCLUDED.source_hash,
            embedded_at = EXCLUDED.embedded_at;

    RETURN CASE WHEN v_old_hash IS NULL THEN 'inserted' ELSE 'updated' END;
END;
$$;


-- -----------------------------------------------------------------------------
-- 5. Stored procedure: log an OA event in one transaction
-- Creates the application (or updates it if this company + role already
-- exists for the user) and links every DSA problem that came up. If anything
-- fails (bad problem id, problem owned by someone else, invalid stage,
-- mismatched arrays) the whole CALL is rolled back: no half-written
-- application, no orphan links.
--
-- Example (as the logged-in user):
--   CALL sp_log_oa_event('Amazon', 'SDE Intern', 'OA Received', current_date + 3,
--                        NULL, ARRAY[12, 21]::bigint[], ARRAY[true, false], NULL);
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_log_oa_event(
    IN    p_company_name     VARCHAR,
    IN    p_role_title       VARCHAR,
    IN    p_stage            VARCHAR,
    IN    p_event_date       DATE,
    IN    p_application_link VARCHAR,
    IN    p_problem_ids      BIGINT[],
    IN    p_solved           BOOLEAN[],
    INOUT p_oa_id            BIGINT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user UUID := app_current_user_id();
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'No user context: app.user_id is not set'
              USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF coalesce(array_length(p_problem_ids, 1), 0)
       <> coalesce(array_length(p_solved, 1), 0) THEN
        RAISE EXCEPTION 'p_problem_ids and p_solved must have the same length'
              USING ERRCODE = 'invalid_parameter_value';
    END IF;

    INSERT INTO companies_oa (user_id, company_name, role_title, stage,
                              event_date, application_link)
    VALUES (v_user, p_company_name, p_role_title, coalesce(p_stage, 'Applied'),
            p_event_date, p_application_link)
    ON CONFLICT ON CONSTRAINT uq_oa_user_company_role DO UPDATE
        SET stage            = EXCLUDED.stage,
            event_date       = coalesce(EXCLUDED.event_date, companies_oa.event_date),
            application_link = coalesce(EXCLUDED.application_link, companies_oa.application_link)
    RETURNING oa_id INTO p_oa_id;

    IF coalesce(array_length(p_problem_ids, 1), 0) > 0 THEN
        INSERT INTO oa_dsa_tested (oa_id, problem_id, solved_during_oa)
        SELECT p_oa_id, t.problem_id, t.solved
        FROM unnest(p_problem_ids, p_solved) AS t(problem_id, solved)
        ON CONFLICT (oa_id, problem_id) DO UPDATE
            SET solved_during_oa = EXCLUDED.solved_during_oa;
    END IF;

    PERFORM fn_refresh_oa_funnel();
END;
$$;


-- -----------------------------------------------------------------------------
-- 6. Funnel analytics
-- One row per student: how many applications reached each stage, plus
-- conversion rates. "Reached" uses the stage HISTORY (highest stage ever
-- reached), so rejected applications still count at the stage they got to.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW mv_oa_funnel_analytics AS
WITH reached AS (
    SELECT o.user_id,
           o.oa_id,
           o.stage                    AS current_stage,
           max(fn_stage_rank(h.stage)) AS max_rank
    FROM companies_oa o
    LEFT JOIN oa_stage_history h ON h.oa_id = o.oa_id
    GROUP BY o.user_id, o.oa_id, o.stage
)
SELECT u.user_id,
       count(r.oa_id)                                           AS total_applications,
       count(*) FILTER (WHERE r.max_rank >= 2)                  AS reached_oa,
       count(*) FILTER (WHERE r.max_rank >= 3)                  AS cleared_oa,
       count(*) FILTER (WHERE r.max_rank >= 4)                  AS reached_interview,
       count(*) FILTER (WHERE r.max_rank >= 6)                  AS offers,
       count(*) FILTER (WHERE r.current_stage = 'Rejected')     AS rejections,
       count(*) FILTER (WHERE r.current_stage NOT IN ('Offer', 'Rejected')) AS active,
       round(100.0 * count(*) FILTER (WHERE r.max_rank >= 3)
             / nullif(count(*) FILTER (WHERE r.max_rank >= 2), 0), 1) AS oa_clear_rate_pct,
       round(100.0 * count(*) FILTER (WHERE r.max_rank >= 6)
             / nullif(count(*) FILTER (WHERE r.max_rank >= 4), 0), 1) AS interview_to_offer_pct,
       round(100.0 * count(*) FILTER (WHERE r.max_rank >= 6)
             / nullif(count(r.oa_id), 0), 1)                    AS overall_offer_rate_pct,
       now()                                                    AS refreshed_at
FROM users u
LEFT JOIN reached r ON r.user_id = u.user_id
WHERE u.role = 'Student'
GROUP BY u.user_id
WITH DATA;

-- REFRESH ... CONCURRENTLY needs a unique index; it lets readers keep reading
-- the old data while the refresh runs.
CREATE UNIQUE INDEX uq_mv_oa_funnel_user ON mv_oa_funnel_analytics (user_id);


-- Only the owner of a materialized view may refresh it. SECURITY DEFINER runs
-- this function with the owner's rights, so the app role can trigger a refresh
-- without owning the view. search_path is pinned, as it must be for any
-- SECURITY DEFINER function.
CREATE OR REPLACE FUNCTION fn_refresh_oa_funnel()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_oa_funnel_analytics;
END;
$$;


-- Row-level security does not apply to materialized views, so students are
-- not given access to mv_oa_funnel_analytics itself (see 11_B_rls.sql).
-- They read their own row through this view instead. It deliberately does NOT
-- use security_invoker: it runs with the owner's rights to read the
-- materialized view, and the WHERE clause limits it to the caller's row.
CREATE VIEW v_my_oa_funnel AS
SELECT *
FROM mv_oa_funnel_analytics
WHERE user_id = app_current_user_id();


-- -----------------------------------------------------------------------------
-- 7. Topic progress for the DSA page (GROUP BY over the M:N junctions)
-- -----------------------------------------------------------------------------
CREATE VIEW v_topic_progress WITH (security_invoker = true) AS
SELECT p.user_id,
       t.topic_id,
       t.name                                               AS topic,
       -- DISTINCT because the LEFT JOIN repeats a problem once per OA it was in
       count(DISTINCT p.problem_id)                                              AS problems,
       count(DISTINCT p.problem_id) FILTER (WHERE p.status = 'Mastered')         AS mastered,
       count(DISTINCT p.problem_id) FILTER (WHERE p.status = 'Solved')           AS solved,
       count(DISTINCT p.problem_id) FILTER (WHERE p.status = 'Re-visit Needed')  AS revisit_needed,
       count(odt.oa_id)                                                          AS times_in_oa,
       count(odt.oa_id) FILTER (WHERE NOT odt.solved_during_oa)                  AS failed_in_oa
FROM dsa_problems p
JOIN dsa_problem_topics dpt ON dpt.problem_id = p.problem_id
JOIN topics t               ON t.topic_id     = dpt.topic_id
LEFT JOIN oa_dsa_tested odt ON odt.problem_id = p.problem_id
GROUP BY p.user_id, t.topic_id, t.name;
