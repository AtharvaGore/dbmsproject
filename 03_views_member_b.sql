-- ============================================================
-- Member B views. Needs Member A's tables: assignments, personal_projects.
-- ============================================================

-- Dashboard checklist: open tasks that are undated, overdue, or due within 7 days
CREATE OR REPLACE VIEW v_daily_action_center AS
SELECT t.task_id,
       t.user_id,
       t.title            AS task_title,
       t.status,
       t.priority,
       t.scheduled_date,
       t.category,
       dp.title           AS dsa_problem_context,
       a.title            AS assignment_context,
       pp.title           AS project_context,
       oa.company_name    AS oa_context
FROM tasks t
LEFT JOIN dsa_problems      dp ON dp.problem_id    = t.problem_id
LEFT JOIN assignments       a  ON a.assignment_id  = t.assignment_id
LEFT JOIN personal_projects pp ON pp.project_id    = t.project_id
LEFT JOIN companies_oa      oa ON oa.oa_id         = t.oa_id
WHERE t.status <> 'Done'
  AND (t.scheduled_date IS NULL OR t.scheduled_date <= CURRENT_DATE + 7)
ORDER BY t.priority, t.scheduled_date NULLS LAST, t.task_id;   -- 'P1 - High' < 'P2 - Medium' < 'P3 - Low'

-- Funnel counts per user. Stages are the CURRENT stage only, so a 'Rejected' row
-- cannot be attributed to the stage it was rejected at. Refreshed by trg_refresh_oa_funnel.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_oa_funnel_analytics AS
SELECT user_id,
       COUNT(*)                                                                             AS total_applications,
       COUNT(*) FILTER (WHERE stage IN ('OA Received','OA Cleared','Technical Round','HR Round','Offer')) AS reached_oa,
       COUNT(*) FILTER (WHERE stage IN ('OA Cleared','Technical Round','HR Round','Offer'))               AS cleared_oa,
       COUNT(*) FILTER (WHERE stage IN ('Technical Round','HR Round','Offer'))                            AS reached_interview,
       COUNT(*) FILTER (WHERE stage = 'Offer')                                              AS offers,
       COUNT(*) FILTER (WHERE stage = 'Rejected')                                           AS rejected
FROM companies_oa
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_oa_funnel_user ON mv_oa_funnel_analytics (user_id);
