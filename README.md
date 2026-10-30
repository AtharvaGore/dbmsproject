# AcademiaOS

AcademiaOS is a student workspace with four parts: coursework and assignments, a to-do list, DSA practice tracking with keyword and semantic search, and a placement (online assessment) pipeline with funnel analytics.
It is a two-person DBMS project, so most of the logic lives in PostgreSQL itself: constraints, triggers, a stored procedure, a materialized view, row-level security, full-text search and pgvector similarity search.
A Flask REST API sits on top of the database, and a Next.js frontend talks to the API.

## Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL 16 + [pgvector](https://github.com/pgvector/pgvector) |
| API | Flask 3 (`flask_backend/`), psycopg2, JWT auth |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions) |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind, Lucide (`nextjs_frontend/`) |

Linux only, with a local PostgreSQL install. No Docker is needed.

## Setup (Ubuntu / Debian)

```bash
sudo apt install postgresql-16 postgresql-16-pgvector
cp .env.example .env                              # then fill in the passwords and JWT_SECRET

sudo -u postgres createuser --superuser "$USER"   # once: lets you run psql as yourself
./db/tools/setup.sh                               # creates the DB, builds it, sets the app password

python3 -m venv .venv && . .venv/bin/activate
pip install -r flask_backend/requirements.txt
python flask_backend/app.py                       # API on http://localhost:5000

cd nextjs_frontend && npm install && npm run dev  # UI on http://localhost:3000
```

Instead of `createuser`, you can export superuser connection variables (`PGUSER=postgres PGPASSWORD=...`) before running `setup.sh`. Running the script itself with `sudo -u postgres` only works if the `postgres` user can read your checkout.

`sentence-transformers` installs PyTorch. For a smaller CPU-only install, run `pip install torch --index-url https://download.pytorch.org/whl/cpu` before installing the requirements.

**Other distros:** install PostgreSQL 16 from your package manager and build pgvector from source by following https://github.com/pgvector/pgvector#installation. If pgvector is missing, `setup.sh` stops and says so.

### Environment

| Variable | Used by | Purpose |
|---|---|---|
| `DB_NAME` | setup.sh | Database to create and build |
| `APP_DB_PASSWORD` | setup.sh | Password given to the `academiaos_app` login role |
| `DATABASE_URL` | Flask | Always the low-privilege `academiaos_app` login, so RLS applies |
| `ADMIN_DATABASE_URL` | embedding script | Owner connection; bypasses RLS on purpose. Flask never uses it |
| `JWT_SECRET` | Flask | Signs login tokens |
| `EMBEDDING_MODEL`, `EMBEDDING_PRELOAD` | Flask | Model name; load it at startup instead of on first use |
| `CORS_ORIGINS`, `FLASK_PORT` | Flask | Frontend origin(s), API port |
| `NEXT_PUBLIC_API_URL` | Next.js | Base URL of the API |

## Demo logins

**This is demo data only.** The seed (`db/03_A_seed.sql`) creates three accounts, all with the password `Demo@123`:

| Account | user_id | Role |
|---|---|---|
| Atharva | `11111111-1111-1111-1111-111111111111` | Student |
| Bhooshan | `22222222-2222-2222-2222-222222222222` | Student |
| Admin | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Admin |

## Everyday commands

```bash
./db/tools/setup.sh --reset     # wipe the schema and rebuild everything (destroys data)
./db/tools/run_tests.sh         # SQL tests; prints PASS/FAIL tables, exits 1 on any failure

# Regenerate the committed seed embeddings after changing seed problems in 04_B_seed.sql
python flask_backend/scripts/generate_embeddings_sql.py --database-url "$ADMIN_DATABASE_URL"
./db/tools/setup.sh --reset     # reload so the new 04b file is used

# Backfill vectors for Missing/Stale problems in a live database
python flask_backend/scripts/generate_embeddings_sql.py --apply --database-url "$ADMIN_DATABASE_URL"
```

GitHub Actions (`.github/workflows/db-check.yml`) builds the database on a fresh PostgreSQL 16 + pgvector and runs the tests on every push and pull request.

## How the database is built

`db/tools/init.sql` runs the numbered files in order with `psql \ir` and stops at the first error (`ON_ERROR_STOP`). `db/tools/reset.sql` drops and recreates the `public` schema. Both live in `db/tools/`, outside the numbered sequence, so nothing runs them by accident.

| File | Owner | Contents |
|---|---|---|
| `db/01_A_core_schema.sql` | Atharva (A) | users, courses, assignments, personal_projects, tasks |
| `db/02_B_dsa_career_schema.sql` | Bhooshan (B) | pgvector; dsa_problems, topics, dsa_problem_topics, dsa_embeddings, companies_oa, oa_stage_history, oa_dsa_tested; GIN / HNSW / B-tree indexes; ALTERs on users and tasks |
| `db/03_A_seed.sql` | A | Demo users and coursework |
| `db/04_B_seed.sql` | B | Demo DSA problems, topics, applications, stage history, review tasks |
| `db/04b_B_embeddings.sql` | B | Generated vectors for the seed problems |
| `db/05_A_logic.sql` | A | A's triggers, functions, views |
| `db/06_B_logic.sql` | B | Triggers, FTS and vector search, embedding upsert, `sp_log_oa_event`, funnel materialized view |
| `db/07_A_queries.sql` | A | A's demo queries |
| `db/08_B_queries.sql` | B | B's demo queries (nested, correlated, GROUP BY/HAVING, joins, window functions, EXPLAIN) |
| `db/09_A_action_center.sql` | A | Action center |
| `db/10_A_rbac.sql` | A | Roles `student_role`, `admin_role`, `academiaos_app`; grants; RLS on A's tables |
| `db/11_B_rls.sql` | B | RLS on B's tables; materialized view access |
| `db/tests/B_tests.sql` | B | 30 self-checking tests (rolled back) |
| `db/tools/init.sql`, `reset.sql`, `setup.sh`, `run_tests.sh` | B | Build, reset and test tooling |

## Code ownership

| Path | Owner |
|---|---|
| `flask_backend/app.py`, `config.py`, `db.py`, `errors.py` | B: app factory, settings, connection pool, error mapping |
| `flask_backend/embedder.py`, `scripts/generate_embeddings_sql.py` | B: embedding model and seed-vector generator |
| `flask_backend/routes/dsa.py`, `career.py`, `admin.py`, `common.py` | B: `/api/dsa`, `/api/career`, `/api/admin` |
| `flask_backend/middleware.py`, `db_context.py` | A: JWT auth (`require_auth`, `require_role`), per-request role + `app.user_id` (`request_cursor`) |
| `flask_backend/routes/auth.py`, `academics.py`, `projects.py`, `tasks.py` | A |
| `nextjs_frontend/src/app/dsa`, `career`, `admin` | B |
| `nextjs_frontend/src/components/dsa`, `career`, `admin` | B |
| `nextjs_frontend/src/app/layout.tsx`, `src/lib/api.ts`, other pages | A |
| `.github/workflows/db-check.yml`, `.env.example`, `README.md` | B |

## Vector search design

- **What is embedded:** one vector per DSA problem. The text is `fn_embedding_text(title, intuition_notes)`, which is the title, a newline, then the notes. It is defined once in SQL so the API, the seed script and the staleness check always agree on it.
- **Model:** `all-MiniLM-L6-v2` from sentence-transformers. It produces 384 dimensions, normalised to unit length, and is stored in `dsa_embeddings.embedding VECTOR(384)`. This table is a weak entity, with exactly 0 or 1 vector per problem.
- **Staleness:** `source_hash` is the md5 of the embedded text. `v_embedding_status` compares it with the current text and reports each problem as Current, Stale or Missing. `fn_upsert_embedding` skips work when nothing has changed.
- **Distance and index:** cosine distance (`<=>`). An HNSW index (`vector_cosine_ops`, m = 16, ef_construction = 64) serves `ORDER BY embedding <=> query LIMIT k`. Similarity is reported as `1 - distance`.
- **Retrieval:** for a search, Flask embeds the query with the same model and calls `search_dsa_vector(query_vec, k, min_similarity)`. "Similar problems" uses `find_similar_problems(problem_id, k)`, which compares stored vectors and needs no model call. Both are `SECURITY INVOKER`, so row-level security limits results to the caller's own problems.
- **Create / read / update / delete:** vectors are created and updated on save (`POST`/`PUT /api/dsa/problems`), in bulk with `POST /api/dsa/embeddings/refresh`, read through search, and deleted with `DELETE /api/dsa/problems/<id>/embedding` or by cascade when a problem is deleted.
- **Fallback:** if the model cannot load, problems still save (state Missing), semantic search returns 503 with `fallback: "fts"`, and the UI offers keyword search. Keyword search is full-text search over a generated, weighted `tsvector` column with a GIN index, queried with `websearch_to_tsquery`.
- **Seed vectors** are committed in `04b_B_embeddings.sql`, so a fresh clone has working semantic search without downloading the model. Rows are matched by `(user_id, platform, title)`, not by id.
