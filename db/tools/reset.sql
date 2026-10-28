-- =============================================================================
-- db/tools/reset.sql
-- Owner: Bhooshan Deshpande (Member B)
--
-- Wipes every table, view, function and extension in the public schema so the
-- database can be rebuilt from scratch. Destroys all data.
--
--   psql -d academiaos -f db/tools/reset.sql
--   psql -d academiaos -f db/tools/init.sql
--
-- Roles (student_role, admin_role, academiaos_app) belong to the server, not
-- the database, so they survive; 10_A_rbac.sql creates them only if missing.
-- With Docker, use `docker compose down -v` instead.
-- =============================================================================

\set ON_ERROR_STOP on
SET client_min_messages = warning;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public AUTHORIZATION pg_database_owner;
GRANT USAGE ON SCHEMA public TO PUBLIC;
COMMENT ON SCHEMA public IS 'standard public schema';
