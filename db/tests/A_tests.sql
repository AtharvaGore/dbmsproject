-- =============================================================================
-- db/tests/A_tests.sql
-- Owner: Atharva Gore (Member A)
--
-- Self-checking tests for Member A's schema, constraints, triggers, views,
-- procedures, and row-level security.
--
-- Pinned to demo users:
--   Atharva:  11111111-1111-1111-1111-111111111111
--   Bhooshan: 22222222-2222-2222-2222-222222222222
--   Admin:    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
--
-- Everything runs inside a single transaction that is ROLLED BACK at the end.
-- =============================================================================

\set ON_ERROR_STOP on
\set QUIET on
\pset footer off

\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'
\set Admin 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

BEGIN;

-- -----------------------------------------------------------------------------
-- Scaffolding
-- -----------------------------------------------------------------------------
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


-- =============================================================================
-- 1. Constraints (Run as DB owner)
-- =============================================================================

-- C1: User role constraint
DO $$ BEGIN
    INSERT INTO users (username, email, password_hash, role)
    VALUES ('invalid_user', 'invalid@test.internal', 'hash', 'SuperUser');
    PERFORM pg_temp.ok('C1 invalid user role is rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C1 invalid user role is rejected', true);
END $$;

-- C2: Course credits constraint
DO $$ BEGIN
    INSERT INTO courses (user_id, course_name, credits)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Zero Credit Course', 0);
    PERFORM pg_temp.ok('C2 course credits <= 0 rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C2 course credits <= 0 rejected', true);
END $$;

-- C3: Assignment weightage constraint
DO $$ BEGIN
    INSERT INTO assignments (user_id, course_id, title, due_date, weightage)
    SELECT '11111111-1111-1111-1111-111111111111', min(course_id), 'Overweight Assignment', current_timestamp + INTERVAL '1 day', 120.00
      FROM courses WHERE user_id = '11111111-1111-1111-1111-111111111111';
    PERFORM pg_temp.ok('C3 assignment weightage > 100 rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C3 assignment weightage > 100 rejected', true);
END $$;

-- C4: Personal project status constraint
DO $$ BEGIN
    INSERT INTO personal_projects (user_id, title, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Test Project', 'Abandoned');
    PERFORM pg_temp.ok('C4 invalid project status rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C4 invalid project status rejected', true);
END $$;

-- C5: Single context constraint on tasks
DO $$
DECLARE
    v_aid BIGINT;
    v_pid BIGINT;
BEGIN
    SELECT min(assignment_id) INTO v_aid FROM assignments WHERE user_id = '11111111-1111-1111-1111-111111111111';
    SELECT min(project_id)    INTO v_pid FROM personal_projects WHERE user_id = '11111111-1111-1111-1111-111111111111';

    INSERT INTO tasks (user_id, title, assignment_id, project_id)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Dual Context Conflict', v_aid, v_pid);
    PERFORM pg_temp.ok('C5 task with multiple parent contexts rejected', false, 'inserted');
EXCEPTION WHEN check_violation THEN
    PERFORM pg_temp.ok('C5 task with multiple parent contexts rejected', true);
END $$;


-- =============================================================================
-- 2. Triggers and Procedures
-- =============================================================================

-- T1: Inserting an assignment auto-creates a linked task
DO $$
DECLARE
    v_cid BIGINT;
    v_aid BIGINT;
    v_tid BIGINT;
BEGIN
    SELECT min(course_id) INTO v_cid FROM courses WHERE user_id = '11111111-1111-1111-1111-111111111111';

    INSERT INTO assignments (user_id, course_id, title, due_date, status, weightage)
    VALUES ('11111111-1111-1111-1111-111111111111', v_cid, 'Trigger Test Homework', current_timestamp + INTERVAL '4 days', 'In Progress', 15.00)
    RETURNING assignment_id INTO v_aid;

    SELECT task_id INTO v_tid FROM tasks WHERE assignment_id = v_aid;

    PERFORM pg_temp.ok('T1 inserting assignment creates linked task', v_tid IS NOT NULL, format('Task ID %s', v_tid));

    -- T2: Moving assignment status to Submitted closes the linked task
    UPDATE assignments SET status = 'Submitted' WHERE assignment_id = v_aid;

    PERFORM pg_temp.ok('T2 submitting assignment marks task Done',
                       EXISTS (SELECT 1 FROM tasks WHERE task_id = v_tid AND status = 'Done'));

    -- T3: sp_reschedule_task updates scheduled_date
    CALL sp_reschedule_task(v_tid, current_date + 10);
    PERFORM pg_temp.ok('T3 sp_reschedule_task updates scheduled_date',
                       EXISTS (SELECT 1 FROM tasks WHERE task_id = v_tid AND scheduled_date = current_date + 10));
END $$;

-- T4: Marking project Shipped marks linked tasks Done
DO $$
DECLARE
    v_pid BIGINT;
    v_tid BIGINT;
BEGIN
    INSERT INTO personal_projects (user_id, title, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Autonomous Drone Firmware', 'In Development')
    RETURNING project_id INTO v_pid;

    INSERT INTO tasks (user_id, title, category, project_id, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Calibrate PID controller', 'Project', v_pid, 'To Do')
    RETURNING task_id INTO v_tid;

    UPDATE personal_projects SET status = 'Shipped' WHERE project_id = v_pid;

    PERFORM pg_temp.ok('T4 shipping project marks linked tasks Done',
                       EXISTS (SELECT 1 FROM tasks WHERE task_id = v_tid AND status = 'Done'));
END $$;


-- =============================================================================
-- 3. Views
-- =============================================================================

-- V1: v_course_progress aggregates assignments and weighted grade
DO $$
DECLARE
    v_count INT;
    v_grade NUMERIC;
BEGIN
    SELECT count(*), max(current_grade_percent)
      INTO v_count, v_grade
      FROM v_course_progress
     WHERE user_id = '11111111-1111-1111-1111-111111111111';

    PERFORM pg_temp.ok('V1 v_course_progress returns courses with calculated grades',
                       v_count >= 3 AND v_grade IS NOT NULL,
                       format('%s courses, max grade %s', v_count, v_grade));
END $$;

-- V2: v_action_center produces urgency and context titles
DO $$
DECLARE
    v_count INT;
    v_overdue INT;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE urgency = 'Overdue')
      INTO v_count, v_overdue
      FROM v_action_center
     WHERE user_id = '11111111-1111-1111-1111-111111111111';

    PERFORM pg_temp.ok('V2 v_action_center returns prioritized items',
                       v_count > 0, format('Total pending: %s, Overdue: %s', v_count, v_overdue));
END $$;


-- =============================================================================
-- 4. Row-Level Security (Student Role)
-- =============================================================================

SET LOCAL ROLE student_role;
SELECT set_config('app.user_id', :'A', true) \gset

-- R1: Student sees only their own courses
DO $$
DECLARE
    v_mine INT;
    v_others INT;
BEGIN
    SELECT count(*) FILTER (WHERE user_id = app_current_user_id()),
           count(*) FILTER (WHERE user_id <> app_current_user_id())
      INTO v_mine, v_others
      FROM courses;

    PERFORM pg_temp.ok('R1 student sees only their own courses',
                       v_mine > 0 AND v_others = 0, format('Mine: %s, Others: %s', v_mine, v_others));
END $$;

-- R2: Student sees only their own assignments
DO $$
DECLARE
    v_mine INT;
    v_others INT;
BEGIN
    SELECT count(*) FILTER (WHERE user_id = app_current_user_id()),
           count(*) FILTER (WHERE user_id <> app_current_user_id())
      INTO v_mine, v_others
      FROM assignments;

    PERFORM pg_temp.ok('R2 student sees only their own assignments',
                       v_mine > 0 AND v_others = 0, format('Mine: %s, Others: %s', v_mine, v_others));
END $$;

-- R3: Student cannot insert an assignment for another student
DO $$ BEGIN
    INSERT INTO assignments (user_id, course_id, title, due_date)
    SELECT '22222222-2222-2222-2222-222222222222'::uuid, min(course_id), 'Sneaky Assignment', current_timestamp + INTERVAL '1 day'
      FROM courses;
    PERFORM pg_temp.ok('R3 student cannot insert assignment for another user', false, 'inserted');
EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.ok('R3 student cannot insert assignment for another user', true);
END $$;

-- R4: Student sees only their own personal projects
DO $$
DECLARE
    v_mine INT;
    v_others INT;
BEGIN
    SELECT count(*) FILTER (WHERE user_id = app_current_user_id()),
           count(*) FILTER (WHERE user_id <> app_current_user_id())
      INTO v_mine, v_others
      FROM personal_projects;

    PERFORM pg_temp.ok('R4 student sees only their own projects',
                       v_mine > 0 AND v_others = 0, format('Mine: %s, Others: %s', v_mine, v_others));
END $$;

-- R5: Student sees only their own tasks
DO $$
DECLARE
    v_mine INT;
    v_others INT;
BEGIN
    SELECT count(*) FILTER (WHERE user_id = app_current_user_id()),
           count(*) FILTER (WHERE user_id <> app_current_user_id())
      INTO v_mine, v_others
      FROM tasks;

    PERFORM pg_temp.ok('R5 student sees only their own tasks',
                       v_mine > 0 AND v_others = 0, format('Mine: %s, Others: %s', v_mine, v_others));
END $$;

RESET ROLE;


-- =============================================================================
-- 5. Row-Level Security (Admin Role)
-- =============================================================================

SET LOCAL ROLE admin_role;
SELECT set_config('app.user_id', :'Admin', true) \gset

-- R6: Admin sees courses and projects across all students
DO $$
DECLARE
    v_distinct_users INT;
BEGIN
    SELECT count(DISTINCT user_id) INTO v_distinct_users FROM courses;
    PERFORM pg_temp.ok('R6 admin sees courses across multiple students',
                       v_distinct_users >= 2, format('Distinct users: %s', v_distinct_users));
END $$;

RESET ROLE;


-- =============================================================================
-- Results
-- =============================================================================
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
