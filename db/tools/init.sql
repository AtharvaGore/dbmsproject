-- =============================================================================
-- db/tools/init.sql
-- Owner: Bhooshan Deshpande (Member B)
--
-- Builds the whole database from the numbered files, in order, for anyone
-- running Postgres locally instead of Docker:
--
--   createdb academiaos
--   psql -d academiaos -f db/tools/init.sql
--
-- ON_ERROR_STOP makes psql stop at the first error. If that happens, fix the
-- file, run db/tools/reset.sql, and run this again.
-- (Not --single-transaction: the demo query files 07 and 08 wrap their DML
-- examples in BEGIN ... ROLLBACK, which would end a single outer transaction.)
-- Run as a superuser (or the database owner with CREATEROLE), because the
-- RBAC file creates roles and the schema files create extensions.
--
-- Docker does NOT use this file: it runs the numbered files in db/ directly
-- (alphabetical order = numeric order). That is why this file lives in
-- db/tools/ and not in db/: Docker only runs files at the top level of the
-- mounted folder, so it never runs init.sql or reset.sql by accident.
-- =============================================================================

\set ON_ERROR_STOP on

\ir ../01_A_core_schema.sql
\ir ../02_B_dsa_career_schema.sql
\ir ../03_A_seed.sql
\ir ../04_B_seed.sql
\ir ../04b_B_embeddings.sql
\ir ../05_A_logic.sql
\ir ../06_B_logic.sql
\ir ../07_A_queries.sql
\ir ../08_B_queries.sql
\ir ../09_A_action_center.sql
\ir ../10_A_rbac.sql
\ir ../11_B_rls.sql
