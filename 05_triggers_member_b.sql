-- ============================================================
-- Member B triggers
-- ============================================================

-- Spaced repetition: marking a problem 'Re-visit Needed' creates a review task;
-- moving it out of that status closes the open review task.
CREATE OR REPLACE FUNCTION fn_dsa_revisit_task() RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'Re-visit Needed'
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
        IF NOT EXISTS (SELECT 1 FROM tasks
                       WHERE problem_id = NEW.problem_id AND category = 'DSA' AND status <> 'Done') THEN
            INSERT INTO tasks (user_id, title, priority, scheduled_date, category, problem_id)
            VALUES (NEW.user_id,
                    'Review DSA Problem: ' || NEW.title,
                    CASE NEW.difficulty WHEN 'Hard' THEN 'P1 - High'
                                        WHEN 'Medium' THEN 'P2 - Medium'
                                        ELSE 'P3 - Low' END,
                    CURRENT_DATE + 3,
                    'DSA',
                    NEW.problem_id);
        END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'Re-visit Needed' AND NEW.status <> 'Re-visit Needed' THEN
        UPDATE tasks SET status = 'Done'
        WHERE problem_id = NEW.problem_id AND category = 'DSA' AND status <> 'Done';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsa_revisit_task ON dsa_problems;
CREATE TRIGGER trg_dsa_revisit_task
AFTER INSERT OR UPDATE OF status ON dsa_problems
FOR EACH ROW EXECUTE FUNCTION fn_dsa_revisit_task();

-- Keep the funnel materialized view in sync (plain REFRESH: fine at this data size)
CREATE OR REPLACE FUNCTION fn_refresh_oa_funnel() RETURNS trigger AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_oa_funnel_analytics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_oa_funnel ON companies_oa;
CREATE TRIGGER trg_refresh_oa_funnel
AFTER INSERT OR UPDATE OR DELETE ON companies_oa
FOR EACH STATEMENT EXECUTE FUNCTION fn_refresh_oa_funnel();
