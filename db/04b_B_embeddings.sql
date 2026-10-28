-- =============================================================================
-- 04b_B_embeddings.sql
-- Owner: Bhooshan Deshpande (Member B)
--
-- PLACEHOLDER. This file is meant to be GENERATED, not hand-written:
--
--   pip install sentence-transformers psycopg2-binary
--   python flask_backend/scripts/generate_embeddings_sql.py \
--       --database-url postgresql://postgres:<password>@localhost:5432/academiaos
--
-- The script embeds every seeded problem with all-MiniLM-L6-v2 and overwrites
-- this file with one INSERT per problem. Commit the generated file, so a fresh
-- clone has working semantic search without downloading the model.
--
-- Until then this file intentionally inserts nothing, and the database builds
-- fine without it: v_embedding_status shows every problem as 'Missing'.
-- =============================================================================

SELECT 'no seed embeddings yet: run flask_backend/scripts/generate_embeddings_sql.py' AS note;
