-- =============================================================================
-- 07_A_queries.sql
-- Owner: Atharva Gore (Member A)
-- Demonstration queries for the DBMS project report and viva.
--
-- Safe to run multiple times: read queries modify nothing, and DML examples
-- run inside an explicit transaction that rolls back.
--
-- Pinned to demo student Atharva via :demo_user.
-- =============================================================================

\set demo_user '11111111-1111-1111-1111-111111111111'

-- -----------------------------------------------------------------------------
-- Q1. Nested subquery (NOT EXISTS): Courses where no pending assignments remain.
-- -----------------------------------------------------------------------------
SELECT c.course_code, c.course_name, c.instructor
FROM courses c
WHERE c.user_id = :'demo_user'
  AND NOT EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.course_id = c.course_id
        AND a.status NOT IN ('Submitted', 'Graded')
  )
ORDER BY c.course_code;


-- -----------------------------------------------------------------------------
-- Q2. Nested subquery (IN): Personal projects that have active P0 or P1 tasks.
-- -----------------------------------------------------------------------------
SELECT p.title, p.status, p.tech_stack
FROM personal_projects p
WHERE p.user_id = :'demo_user'
  AND p.project_id IN (
      SELECT t.project_id
      FROM tasks t
      WHERE t.status <> 'Done'
        AND t.priority IN ('P0 - Urgent', 'P1 - High')
        AND t.project_id IS NOT NULL
  )
ORDER BY p.title;


-- -----------------------------------------------------------------------------
-- Q3. Correlated subquery: Assignments scoring above the course's average grade.
-- -----------------------------------------------------------------------------
SELECT c.course_code, a.title, a.grade,
       round((SELECT avg(a2.grade) FROM assignments a2
               WHERE a2.course_id = a.course_id AND a2.grade IS NOT NULL)::numeric, 2) AS course_avg_grade
FROM assignments a
JOIN courses c ON c.course_id = a.course_id
WHERE a.user_id = :'demo_user'
  AND a.grade IS NOT NULL
  AND a.grade > (
      SELECT avg(a2.grade)
      FROM assignments a2
      WHERE a2.course_id = a.course_id
        AND a2.grade IS NOT NULL
  )
ORDER BY a.grade DESC;


-- -----------------------------------------------------------------------------
-- Q4. GROUP BY + HAVING: Courses with at least 2 assignments and total weight >= 40.
-- -----------------------------------------------------------------------------
SELECT c.course_code, c.course_name,
       count(a.assignment_id) AS assignment_count,
       sum(a.weightage)        AS total_weightage
FROM courses c
JOIN assignments a ON a.course_id = c.course_id
WHERE c.user_id = :'demo_user'
GROUP BY c.course_code, c.course_name
HAVING count(a.assignment_id) >= 2
   AND sum(a.weightage) >= 40.00
ORDER BY total_weightage DESC;


-- -----------------------------------------------------------------------------
-- Q5. Window function (DENSE_RANK): Rank assignments by weightage per course.
-- -----------------------------------------------------------------------------
SELECT c.course_code, a.title, a.weightage,
       dense_rank() OVER (PARTITION BY a.course_id ORDER BY a.weightage DESC NULLS LAST) AS weight_rank
FROM assignments a
JOIN courses c ON c.course_id = a.course_id
WHERE a.user_id = :'demo_user'
ORDER BY c.course_code, weight_rank;


-- -----------------------------------------------------------------------------
-- Q6. Window function (SUM OVER): Running cumulative weightage of assignments.
-- -----------------------------------------------------------------------------
SELECT c.course_code, a.title, a.due_date::date AS due_date, a.weightage,
       sum(a.weightage) OVER (
           PARTITION BY a.course_id
           ORDER BY a.due_date ASC
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
       ) AS cumulative_weightage
FROM assignments a
JOIN courses c ON c.course_id = a.course_id
WHERE a.user_id = :'demo_user'
ORDER BY c.course_code, a.due_date;


-- -----------------------------------------------------------------------------
-- Q7. Multi-table JOIN: Coursework assignments linked to their action tasks.
-- -----------------------------------------------------------------------------
SELECT c.course_code, a.title AS assignment_title, a.status AS assignment_status,
       t.title AS task_title, t.priority, t.status AS task_status
FROM courses c
JOIN assignments a ON a.course_id = c.course_id
LEFT JOIN tasks t ON t.assignment_id = a.assignment_id
WHERE c.user_id = :'demo_user'
ORDER BY c.course_code, a.due_date;


-- -----------------------------------------------------------------------------
-- Q8. Query Plan (EXPLAIN): Index scan verification on upcoming assignments.
-- -----------------------------------------------------------------------------
EXPLAIN (COSTS OFF)
SELECT a.title, a.due_date, c.course_name
FROM assignments a
JOIN courses c ON c.course_id = a.course_id
WHERE a.user_id = :'demo_user'
  AND a.due_date >= current_date
ORDER BY a.due_date ASC;


-- -----------------------------------------------------------------------------
-- Q9. DML demonstration with trigger verification (rolled back).
-- -----------------------------------------------------------------------------
BEGIN;

-- 1. Create a new course and an assignment
INSERT INTO courses (user_id, course_code, course_name, credits)
VALUES (:'demo_user', 'CS399', 'Advanced Database Systems', 4);

INSERT INTO assignments (user_id, course_id, title, due_date, status, weightage)
SELECT :'demo_user', course_id, 'Distributed Consensus Implementation', current_timestamp + INTERVAL '5 days', 'Not Started', 30.00
FROM courses WHERE user_id = :'demo_user' AND course_code = 'CS399';

-- Check that trg_assignment_task_sync auto-created the task:
SELECT title, category, priority, scheduled_date, status
FROM tasks
WHERE user_id = :'demo_user'
  AND assignment_id = (SELECT assignment_id FROM assignments WHERE user_id = :'demo_user' AND title = 'Distributed Consensus Implementation');

-- 2. Mark assignment Submitted; trigger auto-closes the task:
UPDATE assignments
   SET status = 'Submitted'
 WHERE user_id = :'demo_user' AND title = 'Distributed Consensus Implementation';

SELECT title, status
FROM tasks
WHERE user_id = :'demo_user'
  AND assignment_id = (SELECT assignment_id FROM assignments WHERE user_id = :'demo_user' AND title = 'Distributed Consensus Implementation');

ROLLBACK;
