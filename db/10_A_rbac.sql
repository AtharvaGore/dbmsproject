-- =============================================================================
-- 10_A_rbac.sql
-- Owner: Atharva Gore (Member A)
--
-- Roles, Grants, and Row-Level Security for Member A's tables.
-- Runs before 11_B_rls.sql in db/tools/init.sql.
--
-- Roles:
--   student_role    Restricted to rows where user_id = app_current_user_id()
--   admin_role      Unrestricted access to all data
--   academiaos_app  Login role used by Flask; switches into student/admin role
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create Roles (idempotent DO block)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'student_role') THEN
        CREATE ROLE student_role NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin_role') THEN
        CREATE ROLE admin_role NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'academiaos_app') THEN
        CREATE ROLE academiaos_app WITH LOGIN PASSWORD 'change_me';
    END IF;
END
$$;

-- Allow academiaos_app to assume student_role and admin_role via SET LOCAL ROLE
GRANT student_role, admin_role TO academiaos_app;


-- -----------------------------------------------------------------------------
-- 2. Schema and Table Grants
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO student_role, admin_role, academiaos_app;

-- admin_role gets all permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO admin_role;

-- student_role gets standard DML
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO student_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO student_role;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO student_role;

-- academiaos_app gets DML and sequence rights needed before and after SET ROLE
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO academiaos_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO academiaos_app;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO academiaos_app;

-- Default privileges for any tables/sequences created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO student_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO student_role;


-- -----------------------------------------------------------------------------
-- 3. Turn on Row Level Security for Member A tables
-- -----------------------------------------------------------------------------
-- Helper to read app.user_id set per-request by Flask:
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- 4. Admin Policies (Unrestricted)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS pol_users_admin             ON users;
DROP POLICY IF EXISTS pol_courses_admin           ON courses;
DROP POLICY IF EXISTS pol_assignments_admin       ON assignments;
DROP POLICY IF EXISTS pol_personal_projects_admin ON personal_projects;
DROP POLICY IF EXISTS pol_tasks_admin             ON tasks;

CREATE POLICY pol_users_admin             ON users             FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_courses_admin           ON courses           FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_assignments_admin       ON assignments       FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_personal_projects_admin ON personal_projects FOR ALL TO admin_role USING (true) WITH CHECK (true);
CREATE POLICY pol_tasks_admin             ON tasks             FOR ALL TO admin_role USING (true) WITH CHECK (true);


-- -----------------------------------------------------------------------------
-- 5. Student Policies (Owned rows only via app_current_user_id())
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS pol_users_student_select     ON users;
DROP POLICY IF EXISTS pol_users_student_update     ON users;
DROP POLICY IF EXISTS pol_courses_student          ON courses;
DROP POLICY IF EXISTS pol_assignments_student      ON assignments;
DROP POLICY IF EXISTS pol_personal_projects_student ON personal_projects;
DROP POLICY IF EXISTS pol_tasks_student            ON tasks;

-- users: students can read profiles (e.g. usernames for collaboration/leaderboard)
-- and update only their own profile.
CREATE POLICY pol_users_student_select ON users
    FOR SELECT TO student_role
    USING (true);

CREATE POLICY pol_users_student_update ON users
    FOR UPDATE TO student_role
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

-- courses: fully scoped to student's user_id
CREATE POLICY pol_courses_student ON courses
    FOR ALL TO student_role
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

-- assignments: fully scoped to student's user_id
CREATE POLICY pol_assignments_student ON assignments
    FOR ALL TO student_role
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

-- personal_projects: fully scoped to student's user_id
CREATE POLICY pol_personal_projects_student ON personal_projects
    FOR ALL TO student_role
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());

-- tasks: fully scoped to student's user_id
CREATE POLICY pol_tasks_student ON tasks
    FOR ALL TO student_role
    USING (user_id = app_current_user_id())
    WITH CHECK (user_id = app_current_user_id());


-- -----------------------------------------------------------------------------
-- 6. Direct Application Role Policies (Public Auth & Registration)
-- -----------------------------------------------------------------------------
-- When registering or logging in before a JWT session exists, academiaos_app
-- needs direct access to the users table without a tenant context.
DROP POLICY IF EXISTS pol_users_app_login ON users;
CREATE POLICY pol_users_app_login ON users
    FOR ALL TO academiaos_app
    USING (true)
    WITH CHECK (true);
