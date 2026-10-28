-- =============================================================================
-- db/tests/B_tests.sql
-- Owner: Bhooshan Deshpande (Member B)
--
-- Self-checking tests for Member B's schema, triggers, functions, procedure,
-- vector/FTS search and row-level security. Run against a freshly built,
-- seeded database, as the database owner:
--
--   psql -d academiaos -f db/tests/B_tests.sql
--
-- Everything runs inside one transaction that is ROLLED BACK at the end, so
-- the database is unchanged afterwards. The last query prints one row per
-- test with PASS / FAIL; the report's "Testing results" table comes from it.
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on
\pset footer off

BEGIN;

-- ---------------------------------------------------------------------------
-- Test scaffolding
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE test_results (
    n      SERIAL,
    test   TEXT,
    passed BOOLEAN,
    detail TEXT
) ON COMMIT DROP;
GRANT ALL ON test_results TO student_role, admin_role;
GRANT ALL ON SEQUENCE test_results_n_seq TO student_role, admin_role;

CREATE FUNCTION pg_temp.ok(p_test TEXT, p_passed BOOLEAN, p_detail TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO test_results (test, passed, detail)
    VALUES (p_test, coalesce(p_passed, false), p_detail);
$$;

-- A deterministic 384-dim test vector: 1 at position k, 0 elsewhere.
CREATE FUNCTION pg_temp.unit_vec(k INT) RETURNS VECTOR LANGUAGE sql AS $$
    SELECT ('[' || string_agg(CASE WHEN i = k THEN '1' ELSE '0' END, ',' ORDER BY i) || ']')::vector
    FROM generate_series(1, 384) AS i;
$$;

\set B '22222222-2222-2222-2222-222222222222'
\set A '11111111-1111-1111-1111-111111111111'


-- ===========================================================================
-- 1. Constraints (run as owner)
-- ===========================================================================

DO $$ BEGIN
    INSERT INTO dsa_problems (user_id, title, difficulty)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Bad difficulty', 'Impossible');
    PERFORM pg_temp.ok('C1 difficulty outside Easy/Medium/Hard is rejected', false, 'row was inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C1 difficulty outside Easy/Medium/Hard is rejected', true);
END $$;

DO $$ BEGIN
    INSERT INTO dsa_problems (user_id, title, platform, difficulty)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Two Sum', 'LeetCode', 'Easy');
    PERFORM pg_temp.ok('C2 same user + platform + title twice is rejected', false, 'duplicate inserted');
EXCEPTION WHEN unique_violation THEN
    PERFORM pg_temp.ok('C2 same user + platform + title twice is rejected', true);
END $$;

DO $$ BEGIN
    INSERT INTO dsa_embeddings (problem_id, embedding, model, source_hash)
    SELECT problem_id, '[1,2,3]', 'test', md5('x')
    FROM dsa_problems WHERE title = 'Coin Change' LIMIT 1;
    PERFORM pg_temp.ok('C3 embedding with wrong dimension is rejected', false, 'inserted');
EXCEPTION WHEN data_exception THEN
    PERFORM pg_temp.ok('C3 embedding with wrong dimension is rejected', true, SQLERRM);
END $$;

DO $$ BEGIN
    INSERT INTO companies_oa (user_id, company_name, role_title, stage)
    VALUES ('22222222-2222-2222-2222-222222222222', 'TestCo', 'Intern', 'Ghosted');
    PERFORM pg_temp.ok('C4 stage outside the oa_stage domain is rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C4 stage outside the oa_stage domain is rejected', true);
END $$;

DO $$ BEGIN
    INSERT INTO companies_oa (user_id, company_name, role_title, applied_on, event_date)
    VALUES ('22222222-2222-2222-2222-222222222222', 'TestCo', 'Intern', current_date, current_date - 1);
    PERFORM pg_temp.ok('C5 event_date before applied_on is rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C5 event_date before applied_on is rejected', true);
END $$;

DO $$ BEGIN
    INSERT INTO tasks (user_id, title, category, problem_id, oa_id)
    SELECT '22222222-2222-2222-2222-222222222222', 'Two contexts', 'DSA',
           (SELECT problem_id FROM dsa_problems WHERE title = 'Coin Change'),
           (SELECT oa_id FROM companies_oa WHERE company_name = 'Amazon');
    PERFORM pg_temp.ok('C6 task linked to a problem AND an OA is rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C6 task linked to a problem AND an OA is rejected', true);
END $$;


-- ===========================================================================
-- 2. Triggers (run as owner)
-- ===========================================================================

DO $$
DECLARE
    v_pid   BIGINT;
    v_count INT;
    v_last  DATE;
BEGIN
    INSERT INTO dsa_problems (user_id, title, difficulty, status, intuition_notes)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Test Revisit Problem', 'Medium',
            'Re-visit Needed', 'first notes')
    RETURNING problem_id INTO v_pid;

    SELECT count(*) INTO v_count FROM tasks WHERE problem_id = v_pid AND status <> 'Done';
    PERFORM pg_temp.ok('T1 inserting a Re-visit Needed problem creates one review task',
                       v_count = 1, v_count || ' open task(s)');

    -- Saving the problem again without a status change must not add a task.
    UPDATE dsa_problems SET intuition_notes = 'edited notes' WHERE problem_id = v_pid;
    UPDATE dsa_problems SET status = 'Re-visit Needed' WHERE problem_id = v_pid;
    SELECT count(*) INTO v_count FROM tasks WHERE problem_id = v_pid;
    PERFORM pg_temp.ok('T2 re-saving does not create duplicate review tasks',
                       v_count = 1, v_count || ' task(s)');

    -- Finishing the revisit closes the task and stamps last_revised.
    UPDATE dsa_problems SET status = 'Solved' WHERE problem_id = v_pid;
    SELECT count(*) INTO v_count FROM tasks WHERE problem_id = v_pid AND status <> 'Done';
    SELECT last_revised INTO v_last FROM dsa_problems WHERE problem_id = v_pid;
    PERFORM pg_temp.ok('T3 leaving Re-visit Needed closes the task and sets last_revised',
                       v_count = 0 AND v_last = current_date,
                       v_count || ' open, last_revised ' || coalesce(v_last::text, 'null'));

    -- Back into Re-visit Needed: a new task, since none is open any more.
    UPDATE dsa_problems SET status = 'Re-visit Needed' WHERE problem_id = v_pid;
    SELECT count(*) INTO v_count FROM tasks WHERE problem_id = v_pid AND status <> 'Done';
    PERFORM pg_temp.ok('T4 a second revisit cycle creates a fresh task', v_count = 1);
END $$;

DO $$
DECLARE
    v_oa    BIGINT;
    v_count INT;
BEGIN
    INSERT INTO companies_oa (user_id, company_name, role_title)
    VALUES ('22222222-2222-2222-2222-222222222222', 'HistoryCo', 'Intern')
    RETURNING oa_id INTO v_oa;

    UPDATE companies_oa SET stage = 'OA Received' WHERE oa_id = v_oa;
    UPDATE companies_oa SET event_date = current_date + 1 WHERE oa_id = v_oa;  -- not a stage change
    UPDATE companies_oa SET stage = 'OA Received' WHERE oa_id = v_oa;          -- same stage
    UPDATE companies_oa SET stage = 'OA Cleared'  WHERE oa_id = v_oa;

    SELECT count(*) INTO v_count FROM oa_stage_history WHERE oa_id = v_oa;
    PERFORM pg_temp.ok('T5 stage history logs real stage changes only',
                       v_count = 3, v_count || ' history rows (expected 3)');
END $$;

DO $$ BEGIN
    INSERT INTO oa_dsa_tested (oa_id, problem_id)
    SELECT (SELECT oa_id FROM companies_oa
             WHERE user_id = '22222222-2222-2222-2222-222222222222' AND company_name = 'Amazon'),
           (SELECT problem_id FROM dsa_problems
             WHERE user_id = '11111111-1111-1111-1111-111111111111' AND title = 'Word Search');
    PERFORM pg_temp.ok('T6 linking an OA to another user''s problem is rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('T6 linking an OA to another user''s problem is rejected', true);
END $$;

DO $$
DECLARE
    v_pid   BIGINT;
    v_task  BIGINT;
    v_links INT;
    v_emb   INT;
    v_tp    BIGINT;
BEGIN
    INSERT INTO dsa_problems (user_id, title, difficulty, status)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Test Cascade', 'Easy', 'Re-visit Needed')
    RETURNING problem_id INTO v_pid;
    INSERT INTO dsa_problem_topics (problem_id, topic_id)
    SELECT v_pid, topic_id FROM topics WHERE name = 'Arrays';
    PERFORM fn_upsert_embedding(v_pid, pg_temp.unit_vec(1), 'test');
    SELECT task_id INTO v_task FROM tasks WHERE problem_id = v_pid;

    DELETE FROM dsa_problems WHERE problem_id = v_pid;

    SELECT count(*) INTO v_links FROM dsa_problem_topics WHERE problem_id = v_pid;
    SELECT count(*) INTO v_emb   FROM dsa_embeddings     WHERE problem_id = v_pid;
    SELECT problem_id INTO v_tp  FROM tasks WHERE task_id = v_task;
    PERFORM pg_temp.ok('T7 deleting a problem cascades to links + embedding, task link set null',
                       v_links = 0 AND v_emb = 0 AND v_task IS NOT NULL AND v_tp IS NULL,
                       format('links %s, embeddings %s, task problem_id %s', v_links, v_emb, v_tp));
END $$;


-- ===========================================================================
-- 3. Embeddings and search (run as owner)
-- ===========================================================================

DO $$
DECLARE
    v_pid   BIGINT;
    r1 TEXT; r2 TEXT; r3 TEXT;
    s1 TEXT; s2 TEXT; s3 TEXT;
BEGIN
    INSERT INTO dsa_problems (user_id, title, difficulty, intuition_notes)
    VALUES ('22222222-2222-2222-2222-222222222222', 'Test Embedding RUD', 'Easy', 'v1 notes')
    RETURNING problem_id INTO v_pid;

    SELECT embedding_state INTO s1 FROM v_embedding_status WHERE problem_id = v_pid;
    r1 := fn_upsert_embedding(v_pid, pg_temp.unit_vec(1), 'test');
    r2 := fn_upsert_embedding(v_pid, pg_temp.unit_vec(1), 'test');
    UPDATE dsa_problems SET intuition_notes = 'v2 notes' WHERE problem_id = v_pid;
    SELECT embedding_state INTO s2 FROM v_embedding_status WHERE problem_id = v_pid;
    r3 := fn_upsert_embedding(v_pid, pg_temp.unit_vec(2), 'test');
    SELECT embedding_state INTO s3 FROM v_embedding_status WHERE problem_id = v_pid;

    PERFORM pg_temp.ok('E1 upsert: inserted, then unchanged, then updated after notes edit',
                       r1 = 'inserted' AND r2 = 'unchanged' AND r3 = 'updated',
                       concat_ws(' / ', r1, r2, r3));
    PERFORM pg_temp.ok('E2 embedding state goes Missing -> Stale -> Current',
                       s1 = 'Missing' AND s2 = 'Stale' AND s3 = 'Current',
                       concat_ws(' / ', s1, s2, s3));
END $$;

DO $$
DECLARE
    v_target BIGINT;
    v_top    BIGINT;
    v_sim    FLOAT8;
BEGIN
    -- Give three problems orthogonal test vectors, then search with one of them.
    PERFORM fn_upsert_embedding(problem_id, pg_temp.unit_vec(10 + row_number), 'test')
    FROM (SELECT problem_id, row_number() OVER (ORDER BY problem_id)::int AS row_number
          FROM dsa_problems
          WHERE user_id = '22222222-2222-2222-2222-222222222222'
            AND title IN ('Coin Change', 'House Robber', 'Edit Distance')) x;

    SELECT problem_id INTO v_target FROM dsa_problems
     WHERE user_id = '22222222-2222-2222-2222-222222222222' AND title = 'House Robber';

    SELECT s.problem_id, s.similarity INTO v_top, v_sim
    FROM search_dsa_vector((SELECT embedding FROM dsa_embeddings WHERE problem_id = v_target), 3) s
    LIMIT 1;

    PERFORM pg_temp.ok('E3 vector search ranks the matching problem first with similarity 1',
                       v_top = v_target AND abs(v_sim - 1) < 1e-6,
                       format('top %s, similarity %s', v_top, round(v_sim::numeric, 4)));
END $$;

DO $$
DECLARE v_title TEXT;
BEGIN
    SELECT title INTO v_title FROM search_dsa_fts('formed counter') LIMIT 1;
    PERFORM pg_temp.ok('F1 full-text search finds a problem by words in its notes',
                       v_title = 'Minimum Window Substring', v_title);

    SELECT title INTO v_title FROM search_dsa_fts('"monotonic decreasing stack"') LIMIT 1;
    PERFORM pg_temp.ok('F2 phrase search with quotes', v_title = 'Daily Temperatures', v_title);
END $$;


-- ===========================================================================
-- 4. Funnel analytics (run as owner, against seed data)
-- ===========================================================================

DO $$
DECLARE r RECORD;
BEGIN
    SELECT * INTO r FROM mv_oa_funnel_analytics
     WHERE user_id = '22222222-2222-2222-2222-222222222222';
    PERFORM pg_temp.ok('M1 funnel counts match the seeded stage history',
                       r.total_applications = 8 AND r.reached_oa = 6 AND r.cleared_oa = 4
                       AND r.reached_interview = 3 AND r.offers = 1 AND r.rejections = 3,
                       format('total %s, oa %s, cleared %s, interview %s, offers %s, rejected %s',
                              r.total_applications, r.reached_oa, r.cleared_oa,
                              r.reached_interview, r.offers, r.rejections));
END $$;


-- ===========================================================================
-- 5. Row-level security as a STUDENT (Bhooshan)
-- ===========================================================================
-- Expected values computed as the owner, before switching role.
SELECT set_config('test.b_history',
                  (SELECT count(*) FROM oa_stage_history h JOIN companies_oa o USING (oa_id)
                    WHERE o.user_id = :'B')::text, true) \gset
SELECT set_config('test.atharva_problem',
                  (SELECT min(problem_id) FROM dsa_problems WHERE user_id = :'A')::text, true) \gset

SET LOCAL ROLE student_role;
SELECT set_config('app.user_id', :'B', true) \gset

DO $$
DECLARE v_mine INT; v_others INT;
BEGIN
    SELECT count(*) FILTER (WHERE user_id = app_current_user_id()),
           count(*) FILTER (WHERE user_id <> app_current_user_id())
      INTO v_mine, v_others
      FROM dsa_problems;
    PERFORM pg_temp.ok('R1 student sees only their own problems',
                       v_mine > 0 AND v_others = 0, format('mine %s, others %s', v_mine, v_others));
END $$;

DO $$
DECLARE v_n INT;
BEGIN
    SELECT count(*) INTO v_n FROM search_dsa_fts('Two Sum');
    PERFORM pg_temp.ok('R2 search only returns the student''s own rows (both users have Two Sum)',
                       v_n = 1, v_n || ' result(s)');
END $$;

DO $$ BEGIN
    INSERT INTO dsa_problems (user_id, title, difficulty)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Sneaky insert', 'Easy');
    PERFORM pg_temp.ok('R3 student cannot insert a problem for another user', false, 'inserted');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.ok('R3 student cannot insert a problem for another user', true, SQLERRM);
END $$;

DO $$
DECLARE v_seen INT; v_deleted INT;
BEGIN
    SELECT count(*) INTO v_seen FROM topics;
    DELETE FROM topics WHERE name = 'Arrays';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    PERFORM pg_temp.ok('R4 student can read topics but cannot delete them',
                       v_seen > 0 AND v_deleted = 0, format('seen %s, deleted %s', v_seen, v_deleted));
END $$;

DO $$ BEGIN
    PERFORM count(*) FROM mv_oa_funnel_analytics;
    PERFORM pg_temp.ok('R5 student cannot read the funnel materialized view directly', false, 'read it');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.ok('R5 student cannot read the funnel materialized view directly', true);
END $$;

DO $$
DECLARE v_n INT; v_uid UUID;
BEGIN
    SELECT count(*), max(user_id::text)::uuid INTO v_n, v_uid FROM v_my_oa_funnel;
    PERFORM pg_temp.ok('R6 v_my_oa_funnel returns exactly the student''s own row',
                       v_n = 1 AND v_uid = app_current_user_id());
END $$;

DO $$
DECLARE v_n INT; v_expected INT := current_setting('test.b_history')::int;
BEGIN
    SELECT count(*) INTO v_n FROM oa_stage_history;
    PERFORM pg_temp.ok('R7 child tables are filtered through the parent (stage history)',
                       v_n = v_expected, format('%s visible, %s expected', v_n, v_expected));
END $$;

-- Procedure: success path, then two failures that must leave nothing behind.
DO $$
DECLARE
    v_oa     BIGINT;
    v_links  INT;
    v_offers INT;
    v_ids    BIGINT[] := ARRAY(SELECT problem_id FROM dsa_problems
                               WHERE title IN ('Coin Change', 'House Robber'));
BEGIN
    CALL sp_log_oa_event('ProcCo', 'SDE Intern', 'Offer', NULL, NULL,
                         v_ids, ARRAY[true, false], v_oa);
    SELECT count(*) INTO v_links FROM oa_dsa_tested WHERE oa_id = v_oa;
    SELECT offers INTO v_offers FROM v_my_oa_funnel;
    PERFORM pg_temp.ok('P1 procedure creates the application, its links, and refreshes the funnel',
                       v_oa IS NOT NULL AND v_links = 2 AND v_offers = 2,
                       format('oa %s, links %s, offers %s', v_oa, v_links, v_offers));
END $$;

DO $$
DECLARE v_oa BIGINT;
BEGIN
    BEGIN
        CALL sp_log_oa_event('BrokenCo', 'Intern', 'Applied', NULL, NULL,
                             ARRAY[1, 2]::bigint[], ARRAY[true], v_oa);
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    PERFORM pg_temp.ok('P2 mismatched arrays: error, and no application is created',
                       NOT EXISTS (SELECT 1 FROM companies_oa WHERE company_name = 'BrokenCo'));
END $$;

DO $$
DECLARE
    v_oa  BIGINT;
    v_err TEXT := 'no error raised';
    v_ids BIGINT[] := ARRAY[(SELECT problem_id FROM dsa_problems WHERE title = 'Coin Change'),
                            current_setting('test.atharva_problem')::bigint];
BEGIN
    -- The second id belongs to Atharva, so linking it must fail (as owner it is
    -- caught by trg_oa_dsa_same_owner; as a student RLS hides the row first).
    BEGIN
        CALL sp_log_oa_event('RollbackCo', 'Intern', 'Applied', NULL, NULL,
                             v_ids, ARRAY[true, true], v_oa);
    EXCEPTION WHEN OTHERS THEN
        v_err := SQLSTATE || ' ' || SQLERRM;
    END;
    PERFORM pg_temp.ok('P3 one bad link rolls back the whole event (no application, no links)',
                       v_err <> 'no error raised'
                       AND NOT EXISTS (SELECT 1 FROM companies_oa WHERE company_name = 'RollbackCo'),
                       v_err);
END $$;

RESET ROLE;


-- ===========================================================================
-- 6. Row-level security as an ADMIN
-- ===========================================================================
SET LOCAL ROLE admin_role;
SELECT set_config('app.user_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true) \gset

DO $$
DECLARE v_users INT; v_funnel INT;
BEGIN
    SELECT count(DISTINCT user_id) INTO v_users FROM dsa_problems;
    SELECT count(*) INTO v_funnel FROM mv_oa_funnel_analytics;
    PERFORM pg_temp.ok('R8 admin sees every user''s problems and the full funnel view',
                       v_users >= 2 AND v_funnel >= 2,
                       format('%s users with problems, %s funnel rows', v_users, v_funnel));
END $$;

RESET ROLE;


-- ===========================================================================
-- Results
-- ===========================================================================
\set QUIET off
SELECT n AS "#",
       CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result,
       test,
       coalesce(detail, '') AS detail
FROM test_results
ORDER BY n;

SELECT count(*) FILTER (WHERE passed) AS passed,
       count(*) FILTER (WHERE NOT passed) AS failed
FROM test_results;

ROLLBACK;
