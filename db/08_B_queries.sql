-- =============================================================================
-- 08_B_queries.sql
-- Owner: Bhooshan Deshpande (Member B)
-- Demonstration queries for the report and the viva (rubric 6 and 7).
--
-- Safe to run any number of times: SELECTs only change nothing, and the DML
-- examples at the end run inside a transaction that is rolled back.
--
-- Run from psql as the database owner:
--   psql -d academiaos -f db/08_B_queries.sql
-- Queries are pinned to the demo student Bhooshan via the :demo_user variable.
-- =============================================================================

\set demo_user '22222222-2222-2222-2222-222222222222'


-- -----------------------------------------------------------------------------
-- Q1. Nested subquery (NOT EXISTS): problems I have practised that have never
-- come up in any OA. Useful for "what did I prepare that was never asked?".
-- -----------------------------------------------------------------------------
SELECT p.title, p.difficulty, p.status
FROM dsa_problems p
WHERE p.user_id = :'demo_user'
  AND NOT EXISTS (
        SELECT 1 FROM oa_dsa_tested odt
        WHERE odt.problem_id = p.problem_id
  )
ORDER BY p.difficulty DESC, p.title;


-- -----------------------------------------------------------------------------
-- Q2. Nested subquery (IN): companies whose OA asked at least one Hard problem.
-- -----------------------------------------------------------------------------
SELECT o.company_name, o.role_title, o.stage
FROM companies_oa o
WHERE o.user_id = :'demo_user'
  AND o.oa_id IN (
        SELECT odt.oa_id
        FROM oa_dsa_tested odt
        JOIN dsa_problems p ON p.problem_id = odt.problem_id
        WHERE p.difficulty = 'Hard'
  )
ORDER BY o.company_name;


-- -----------------------------------------------------------------------------
-- Q3. GROUP BY + HAVING: weak topics, i.e. topics with 3 or more problems
-- still marked Re-visit Needed.
-- -----------------------------------------------------------------------------
SELECT t.name AS topic,
       count(*) AS revisit_needed
FROM dsa_problems p
JOIN dsa_problem_topics dpt ON dpt.problem_id = p.problem_id
JOIN topics t               ON t.topic_id     = dpt.topic_id
WHERE p.user_id = :'demo_user'
  AND p.status = 'Re-visit Needed'
GROUP BY t.name
HAVING count(*) >= 3
ORDER BY revisit_needed DESC;


-- -----------------------------------------------------------------------------
-- Q4. Join across both junction tables: for each application, which topics
-- its OA covered and how many of its problems I solved in the test.
-- -----------------------------------------------------------------------------
SELECT o.company_name,
       o.stage,
       count(DISTINCT odt.problem_id)                                     AS problems_asked,
       count(DISTINCT odt.problem_id) FILTER (WHERE odt.solved_during_oa) AS solved_in_oa,
       string_agg(DISTINCT t.name, ', ' ORDER BY t.name)                  AS topics_covered
FROM companies_oa o
JOIN oa_dsa_tested odt      ON odt.oa_id      = o.oa_id
JOIN dsa_problem_topics dpt ON dpt.problem_id = odt.problem_id
JOIN topics t               ON t.topic_id     = dpt.topic_id
WHERE o.user_id = :'demo_user'
GROUP BY o.oa_id, o.company_name, o.stage
ORDER BY o.company_name;


-- -----------------------------------------------------------------------------
-- Q5. Correlated subquery: for each application, the number of days it spent
-- in its current stage (time since the latest history row for that same oa_id).
-- -----------------------------------------------------------------------------
SELECT o.company_name,
       o.stage,
       current_date - (
           SELECT max(h.changed_at)::date
           FROM oa_stage_history h
           WHERE h.oa_id = o.oa_id
       ) AS days_in_stage
FROM companies_oa o
WHERE o.user_id = :'demo_user'
  AND o.stage NOT IN ('Offer', 'Rejected')
ORDER BY days_in_stage DESC;


-- -----------------------------------------------------------------------------
-- Q6. CTE + window function: difficulty mix with each level's share of the
-- total, and a running total ordered Easy -> Hard.
-- -----------------------------------------------------------------------------
WITH by_difficulty AS (
    SELECT difficulty,
           count(*) AS problems,
           CASE difficulty WHEN 'Easy' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END AS sort_key
    FROM dsa_problems
    WHERE user_id = :'demo_user'
    GROUP BY difficulty
)
SELECT difficulty,
       problems,
       round(100.0 * problems / sum(problems) OVER (), 1)       AS pct_of_total,
       sum(problems) OVER (ORDER BY sort_key)                   AS running_total
FROM by_difficulty
ORDER BY sort_key;


-- -----------------------------------------------------------------------------
-- Q7. Funnel: the materialized view and the per-stage path of one application.
-- -----------------------------------------------------------------------------
SELECT * FROM mv_oa_funnel_analytics WHERE user_id = :'demo_user';

SELECT h.stage, h.changed_at::date AS on_date
FROM oa_stage_history h
JOIN companies_oa o ON o.oa_id = h.oa_id
WHERE o.user_id = :'demo_user' AND o.company_name = 'Flipkart'
ORDER BY h.changed_at;


-- -----------------------------------------------------------------------------
-- Q8. Full-text search. websearch_to_tsquery syntax: quotes for a phrase,
-- "-word" to exclude, "or" for either. (As the DB owner, RLS does not apply,
-- so this searches everyone's problems; through the app it is per user.)
-- -----------------------------------------------------------------------------
SELECT title, round(rank::numeric, 3) AS rank, snippet
FROM search_dsa_fts('sliding window');

SELECT title, round(rank::numeric, 3) AS rank
FROM search_dsa_fts('"binary search" -rotated');


-- -----------------------------------------------------------------------------
-- Q9. Vector search with a stored embedding ("more like this"). Returns no
-- rows until embeddings exist (04b_B_embeddings.sql or the app).
-- -----------------------------------------------------------------------------
SELECT s.title, round(s.similarity::numeric, 3) AS similarity
FROM find_similar_problems(
        (SELECT problem_id FROM dsa_problems
         WHERE user_id = :'demo_user' AND title = 'Coin Change'), 5) s;

SELECT embedding_state, count(*)
FROM v_embedding_status
GROUP BY embedding_state;


-- -----------------------------------------------------------------------------
-- Q10. Show that the indexes are used. With small demo data the planner may
-- prefer a sequential scan, so turn that off for the demonstration only.
-- -----------------------------------------------------------------------------
BEGIN;
SET LOCAL enable_seqscan = off;

EXPLAIN
SELECT problem_id FROM dsa_problems
WHERE fts_tokens @@ websearch_to_tsquery('english', 'stack');

EXPLAIN
SELECT problem_id FROM dsa_embeddings
ORDER BY embedding <=> (SELECT embedding FROM dsa_embeddings LIMIT 1)
LIMIT 5;
ROLLBACK;


-- -----------------------------------------------------------------------------
-- Q11. DML examples (rubric 6), rolled back at the end so the data is unchanged.
-- -----------------------------------------------------------------------------
BEGIN;

-- INSERT: a new problem with two topics (INSERT ... SELECT to look up ids)
INSERT INTO dsa_problems (user_id, title, difficulty, status, intuition_notes)
VALUES (:'demo_user', 'Trapping Rain Water', 'Hard', 'Re-visit Needed',
        'Water above i is min(max_left, max_right) - height[i]. Two pointers moving the lower side in.');

INSERT INTO dsa_problem_topics (problem_id, topic_id)
SELECT p.problem_id, t.topic_id
FROM dsa_problems p, topics t
WHERE p.user_id = :'demo_user' AND p.title = 'Trapping Rain Water'
  AND t.name IN ('Two Pointers', 'Arrays');

-- The INSERT above fired trg_dsa_revisit_task:
SELECT title, category, priority, scheduled_date
FROM tasks
WHERE problem_id = (SELECT problem_id FROM dsa_problems
                    WHERE user_id = :'demo_user' AND title = 'Trapping Rain Water');

-- UPDATE: finish the revisit. trg_dsa_touch_revised stamps last_revised and
-- trg_dsa_revisit_task closes the review task.
UPDATE dsa_problems SET status = 'Solved'
WHERE user_id = :'demo_user' AND title = 'Trapping Rain Water';

-- UPDATE: move an application forward; trg_oa_stage_history logs it.
UPDATE companies_oa SET stage = 'OA Cleared'
WHERE user_id = :'demo_user' AND company_name = 'Razorpay';

SELECT h.stage, h.changed_at FROM oa_stage_history h
JOIN companies_oa o USING (oa_id)
WHERE o.user_id = :'demo_user' AND o.company_name = 'Razorpay'
ORDER BY changed_at;

-- DELETE: removing a problem cascades to its topics links and embedding, and
-- sets problem_id to NULL on any task that pointed at it.
DELETE FROM dsa_problems
WHERE user_id = :'demo_user' AND title = 'Trapping Rain Water';

ROLLBACK;
