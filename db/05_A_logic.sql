-- =============================================================================
-- 05_A_logic.sql
-- Owner: Atharva Gore (Member A)
--
-- Business logic for Member A's domain:
--   1. Grade calculation function
--   2. Triggers:
--        trg_assignment_task_sync: auto-create/update to-do tasks for assignments
--        trg_project_shipped_task: close project tasks when shipped
--   3. Views:
--        v_course_progress: per-course metrics, completion rate, weighted score
--        v_upcoming_deadlines: timeline of assignments and tasks
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper function: Weighted grade calculation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calculate_course_grade(p_course_id BIGINT)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    v_weighted_grade NUMERIC(5,2);
BEGIN
    SELECT round((sum(grade * weightage) / nullif(sum(weightage), 0))::numeric, 2)
      INTO v_weighted_grade
      FROM assignments
     WHERE course_id = p_course_id
       AND grade IS NOT NULL
       AND weightage > 0;

    RETURN v_weighted_grade;
END;
$$;


-- -----------------------------------------------------------------------------
-- 2. Triggers
-- -----------------------------------------------------------------------------

-- 2a. Sync assignments with tasks:
--     - On INSERT: automatically add a to-do item for pending assignments
--     - On UPDATE of due_date: keep scheduled_date in sync
--     - On UPDATE of status: mark task 'Done' when assignment is submitted/graded
CREATE OR REPLACE FUNCTION fn_assignment_task_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status NOT IN ('Submitted', 'Graded') THEN
            INSERT INTO tasks (
                user_id, title, category, priority, status,
                scheduled_date, assignment_id
            )
            VALUES (
                NEW.user_id,
                'Submit: ' || NEW.title,
                'Coursework',
                CASE WHEN NEW.due_date < current_timestamp + INTERVAL '3 days'
                     THEN 'P0 - Urgent' ELSE 'P1 - High' END,
                'To Do',
                NEW.due_date::date,
                NEW.assignment_id
            );
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- If due_date changed, update scheduled_date on any open linked tasks
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
            UPDATE tasks
               SET scheduled_date = NEW.due_date::date
             WHERE assignment_id = NEW.assignment_id
               AND status <> 'Done';
        END IF;

        -- If status moved to Submitted/Graded, close all linked tasks
        IF NEW.status IN ('Submitted', 'Graded') AND OLD.status NOT IN ('Submitted', 'Graded') THEN
            UPDATE tasks
               SET status = 'Done'
             WHERE assignment_id = NEW.assignment_id
               AND status <> 'Done';

        -- If reopened from Submitted/Graded back to active, reopen linked task or create one
        ELSIF NEW.status NOT IN ('Submitted', 'Graded') AND OLD.status IN ('Submitted', 'Graded') THEN
            UPDATE tasks
               SET status = 'To Do'
             WHERE assignment_id = NEW.assignment_id;

            IF NOT FOUND THEN
                INSERT INTO tasks (
                    user_id, title, category, priority, status,
                    scheduled_date, assignment_id
                )
                VALUES (
                    NEW.user_id,
                    'Submit: ' || NEW.title,
                    'Coursework',
                    'P1 - High',
                    'To Do',
                    NEW.due_date::date,
                    NEW.assignment_id
                );
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_assignment_task_sync ON assignments;
CREATE TRIGGER trg_assignment_task_sync
AFTER INSERT OR UPDATE OF due_date, status ON assignments
FOR EACH ROW
EXECUTE FUNCTION fn_assignment_task_sync();


-- 2b. Close tasks when a project is marked Shipped
CREATE OR REPLACE FUNCTION fn_project_shipped_task()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'Shipped' AND (TG_OP = 'INSERT' OR OLD.status <> 'Shipped') THEN
        UPDATE tasks
           SET status = 'Done'
         WHERE project_id = NEW.project_id
           AND status <> 'Done';
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_shipped_task ON personal_projects;
CREATE TRIGGER trg_project_shipped_task
AFTER INSERT OR UPDATE OF status ON personal_projects
FOR EACH ROW
EXECUTE FUNCTION fn_project_shipped_task();


-- -----------------------------------------------------------------------------
-- 3. Analytical Views
-- -----------------------------------------------------------------------------

-- 3a. Course progress with assignment metrics and weighted grades
CREATE OR REPLACE VIEW v_course_progress AS
SELECT
    c.course_id,
    c.user_id,
    c.course_code,
    c.course_name,
    c.instructor,
    c.semester,
    c.credits,
    count(a.assignment_id)                                                     AS total_assignments,
    count(a.assignment_id) FILTER (WHERE a.status IN ('Submitted', 'Graded'))  AS completed_assignments,
    count(a.assignment_id) FILTER (WHERE a.status = 'Graded')                  AS graded_assignments,
    coalesce(sum(a.weightage), 0.00)                                           AS total_weightage,
    coalesce(sum(a.weightage) FILTER (WHERE a.status = 'Graded'), 0.00)        AS graded_weightage,
    round(
        (sum(a.grade * a.weightage) / nullif(sum(a.weightage) FILTER (WHERE a.grade IS NOT NULL), 0))::numeric,
        2
    ) AS current_grade_percent
FROM courses c
LEFT JOIN assignments a ON a.course_id = c.course_id
GROUP BY c.course_id, c.user_id, c.course_code, c.course_name, c.instructor, c.semester, c.credits;


-- 3b. Chronological upcoming academic and task deadlines
CREATE OR REPLACE VIEW v_upcoming_deadlines AS
SELECT
    'Assignment' AS item_type,
    a.assignment_id::bigint AS item_id,
    a.user_id,
    c.course_name || ': ' || a.title AS display_title,
    'Coursework' AS category,
    a.due_date::date AS target_date,
    (a.due_date::date - current_date) AS days_remaining,
    a.status
FROM assignments a
JOIN courses c ON c.course_id = a.course_id
WHERE a.status NOT IN ('Submitted', 'Graded')

UNION ALL

SELECT
    'Task' AS item_type,
    t.task_id::bigint AS item_id,
    t.user_id,
    t.title AS display_title,
    t.category,
    t.scheduled_date AS target_date,
    (t.scheduled_date - current_date) AS days_remaining,
    t.status
FROM tasks t
WHERE t.status <> 'Done'
  AND t.scheduled_date IS NOT NULL;
