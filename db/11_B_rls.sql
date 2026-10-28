-- =============================================================================
-- 11_B_rls.sql
-- Owner: Bhooshan Deshpande (Member B)
-- Runs last, after 10_A_rbac.sql has created student_role / admin_role and
-- granted table privileges on the whole schema.
--
-- Row-level security for Member B's tables (rubric 12: RBAC in the database).
--   student_role: only rows that belong to app.user_id
--   admin_role:   every row
-- Tables without a user_id column check ownership through their parent row.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Turn RLS on
-- -----------------------------------------------------------------------------
ALTER TABLE dsa_problems       ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsa_problem_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsa_embeddings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies_oa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE oa_stage_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE oa_dsa_tested      ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- Admin: unrestricted on every B table
-- -----------------------------------------------------------------------------
CREATE POLICY pol_dsa_problems_admin       ON dsa_problems       FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_topics_admin             ON topics             FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_dsa_problem_topics_admin ON dsa_problem_topics FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_dsa_embeddings_admin     ON dsa_embeddings     FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_companies_oa_admin       ON companies_oa       FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_oa_stage_history_admin   ON oa_stage_history   FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_oa_dsa_tested_admin      ON oa_dsa_tested      FOR ALL TO admin_role USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- Student: tables with their own user_id
-- USING filters what can be read / updated / deleted.
-- WITH CHECK stops a student writing a row that belongs to someone else.
-- -----------------------------------------------------------------------------
CREATE POLICY pol_dsa_problems_owner ON dsa_problems
    FOR ALL TO student_role
    USING      (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

CREATE POLICY pol_companies_oa_owner ON companies_oa
    FOR ALL TO student_role
    USING      (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());


-- -----------------------------------------------------------------------------
-- Student: child and junction tables, ownership through the parent.
-- The parent lookups are themselves filtered by the parent's policy, so
-- "EXISTS (my problem)" is exactly "this row hangs off my data".
-- -----------------------------------------------------------------------------
CREATE POLICY pol_dsa_embeddings_owner ON dsa_embeddings
    FOR ALL TO student_role
    USING      (EXISTS (SELECT 1 FROM dsa_problems p
                        WHERE p.problem_id = dsa_embeddings.problem_id
                          AND p.user_id = app_current_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM dsa_problems p
                        WHERE p.problem_id = dsa_embeddings.problem_id
                          AND p.user_id = app_current_user_id()));

CREATE POLICY pol_dsa_problem_topics_owner ON dsa_problem_topics
    FOR ALL TO student_role
    USING      (EXISTS (SELECT 1 FROM dsa_problems p
                        WHERE p.problem_id = dsa_problem_topics.problem_id
                          AND p.user_id = app_current_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM dsa_problems p
                        WHERE p.problem_id = dsa_problem_topics.problem_id
                          AND p.user_id = app_current_user_id()));

CREATE POLICY pol_oa_stage_history_owner ON oa_stage_history
    FOR ALL TO student_role
    USING      (EXISTS (SELECT 1 FROM companies_oa o
                        WHERE o.oa_id = oa_stage_history.oa_id
                          AND o.user_id = app_current_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM companies_oa o
                        WHERE o.oa_id = oa_stage_history.oa_id
                          AND o.user_id = app_current_user_id()));

-- Both ends of the link must be the student's own.
CREATE POLICY pol_oa_dsa_tested_owner ON oa_dsa_tested
    FOR ALL TO student_role
    USING      (EXISTS (SELECT 1 FROM companies_oa o
                        WHERE o.oa_id = oa_dsa_tested.oa_id
                          AND o.user_id = app_current_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM companies_oa o
                        WHERE o.oa_id = oa_dsa_tested.oa_id
                          AND o.user_id = app_current_user_id())
            AND EXISTS (SELECT 1 FROM dsa_problems p
                        WHERE p.problem_id = oa_dsa_tested.problem_id
                          AND p.user_id = app_current_user_id()));


-- -----------------------------------------------------------------------------
-- Student: topics are a shared list.
-- Everyone can read them and add a new one; only admins rename or delete.
-- (No UPDATE / DELETE policy for student_role means those are denied.)
-- -----------------------------------------------------------------------------
CREATE POLICY pol_topics_read ON topics
    FOR SELECT TO student_role
    USING (true);

CREATE POLICY pol_topics_add ON topics
    FOR INSERT TO student_role
    WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- Materialized view: RLS cannot filter it, so students lose direct access.
-- They read their own row through v_my_oa_funnel; admins keep full access.
-- 10_A_rbac.sql grants SELECT on all tables, which includes this one, so the
-- REVOKE has to come after it (that is why this file runs last).
-- -----------------------------------------------------------------------------
REVOKE ALL ON mv_oa_funnel_analytics FROM student_role;
GRANT SELECT ON mv_oa_funnel_analytics TO admin_role;
GRANT SELECT ON v_my_oa_funnel TO student_role, admin_role;

-- Refreshing runs with the owner's rights (SECURITY DEFINER); allow both roles
-- to call it, and nobody else.
REVOKE ALL ON FUNCTION fn_refresh_oa_funnel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_refresh_oa_funnel() TO student_role, admin_role;
