-- =============================================================================
-- 09_A_action_center.sql
-- Owner: Atharva Gore (Member A)
--
-- Action Center: A unified workspace feed that aggregates and prioritizes
-- pending actions across coursework, personal projects, DSA revisits, and
-- job applications.
--
-- Contents:
--   1. v_action_center: Unified prioritized feed of active items
--   2. v_action_center_summary: Quick metrics for dashboard cards
--   3. sp_complete_task: Stored procedure to mark tasks done and cascade updates
--   4. sp_reschedule_task: Stored procedure to defer or reschedule a task
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Unified Action Center Feed
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_action_center AS
SELECT
    t.task_id,
    t.user_id,
    t.title,
    t.category,
    t.priority,
    t.status,
    t.scheduled_date,
    CASE
        WHEN t.scheduled_date < current_date THEN 'Overdue'
        WHEN t.scheduled_date = current_date THEN 'Today'
        WHEN t.scheduled_date = current_date + 1 THEN 'Tomorrow'
        WHEN t.scheduled_date <= current_date + 7 THEN 'This Week'
        ELSE 'Upcoming'
    END AS urgency,
    CASE
        WHEN t.assignment_id IS NOT NULL THEN 'Coursework'
        WHEN t.project_id IS NOT NULL    THEN 'Project'
        WHEN t.problem_id IS NOT NULL    THEN 'DSA'
        WHEN t.oa_id IS NOT NULL         THEN 'Career'
        ELSE 'General'
    END AS context_type,
    COALESCE(
        c.course_code || ' - ' || a.title,
        p.title,
        dp.title || ' (' || dp.difficulty || ')',
        co.company_name || ' (' || co.stage || ')',
        'General Task'
    ) AS context_title,
    COALESCE(t.assignment_id, t.project_id, t.problem_id, t.oa_id) AS context_id
FROM tasks t
LEFT JOIN assignments a       ON a.assignment_id = t.assignment_id
LEFT JOIN courses c           ON c.course_id = a.course_id
LEFT JOIN personal_projects p ON p.project_id = t.project_id
LEFT JOIN dsa_problems dp     ON dp.problem_id = t.problem_id
LEFT JOIN companies_oa co     ON co.oa_id = t.oa_id
WHERE t.status <> 'Done'
ORDER BY
    CASE t.priority
        WHEN 'P0 - Urgent' THEN 1
        WHEN 'P1 - High'   THEN 2
        WHEN 'P2 - Medium' THEN 3
        WHEN 'P3 - Low'    THEN 4
        ELSE 5
    END,
    t.scheduled_date ASC NULLS LAST,
    t.created_at ASC;


-- -----------------------------------------------------------------------------
-- 2. Action Center Summary Counts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_action_center_summary AS
SELECT
    u.user_id,
    count(t.task_id) FILTER (WHERE t.status <> 'Done') AS total_pending,
    count(t.task_id) FILTER (WHERE t.status <> 'Done' AND t.scheduled_date < current_date) AS overdue_count,
    count(t.task_id) FILTER (WHERE t.status <> 'Done' AND t.scheduled_date = current_date) AS due_today_count,
    count(t.task_id) FILTER (WHERE t.status <> 'Done' AND t.scheduled_date BETWEEN current_date AND current_date + 7) AS due_week_count,
    count(t.task_id) FILTER (WHERE t.status <> 'Done' AND t.priority IN ('P0 - Urgent', 'P1 - High')) AS high_priority_count
FROM users u
LEFT JOIN tasks t ON t.user_id = u.user_id
GROUP BY u.user_id;


-- -----------------------------------------------------------------------------
-- 3. Stored Procedure: Complete Task and Cascade Domain Updates
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_complete_task(p_task_id BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_assign_id  BIGINT;
    v_problem_id BIGINT;
BEGIN
    SELECT assignment_id, problem_id
      INTO v_assign_id, v_problem_id
      FROM tasks
     WHERE task_id = p_task_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task % not found', p_task_id;
    END IF;

    -- Complete the task
    UPDATE tasks
       SET status = 'Done'
     WHERE task_id = p_task_id;

    -- If this task was tracking an assignment, mark it Submitted
    IF v_assign_id IS NOT NULL THEN
        UPDATE assignments
           SET status = 'Submitted'
         WHERE assignment_id = v_assign_id
           AND status NOT IN ('Submitted', 'Graded');
    END IF;

    -- If this task was tracking a DSA revisit, mark problem Solved
    IF v_problem_id IS NOT NULL THEN
        UPDATE dsa_problems
           SET status = 'Solved'
         WHERE problem_id = v_problem_id
           AND status = 'Re-visit Needed';
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: Reschedule Task
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_reschedule_task(p_task_id BIGINT, p_new_date DATE)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE tasks
       SET scheduled_date = p_new_date
     WHERE task_id = p_task_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Task % not found', p_task_id;
    END IF;
END;
$$;
