-- ============================================================
-- Member B schema: DSA, embeddings, OA pipeline, tasks
-- Run AFTER Member A's schema (needs users, assignments, personal_projects).
-- Safe to re-run: no DROPs.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS dsa_problems (
    problem_id      BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    platform        VARCHAR(50)  NOT NULL
        CHECK (platform IN ('LeetCode', 'Codeforces', 'HackerRank', 'Other')),
    topic_tags      TEXT[]       NOT NULL DEFAULT '{}',
    difficulty      VARCHAR(20)  NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    status          VARCHAR(30)  NOT NULL DEFAULT 'Solved'
        CHECK (status IN ('Solved', 'Re-visit Needed', 'Mastered')),
    intuition_notes TEXT,
    last_revised    DATE DEFAULT CURRENT_DATE,
    search_tsv      TSVECTOR,                      -- maintained by trg_dsa_update_tsv (06_vector_fts.sql)
    UNIQUE (user_id, title, platform)
);

CREATE TABLE IF NOT EXISTS dsa_embeddings (
    embedding_id     BIGSERIAL PRIMARY KEY,
    problem_id       BIGINT UNIQUE NOT NULL REFERENCES dsa_problems(problem_id) ON DELETE CASCADE,
    embedding_vector VECTOR(1536) NOT NULL
);

CREATE TABLE IF NOT EXISTS companies_oa (
    oa_id            BIGSERIAL PRIMARY KEY,
    user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_name     VARCHAR(150) NOT NULL,
    role             VARCHAR(100) NOT NULL,
    stage            VARCHAR(50)  NOT NULL DEFAULT 'Applied'
        CHECK (stage IN ('Applied', 'OA Received', 'OA Cleared', 'Technical Round',
                         'HR Round', 'Offer', 'Rejected')),
    event_date       TIMESTAMPTZ,
    application_link TEXT
);

-- M:N junction: which DSA problems showed up in which OA
CREATE TABLE IF NOT EXISTS oa_dsa_tested (
    oa_id      BIGINT NOT NULL REFERENCES companies_oa(oa_id) ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES dsa_problems(problem_id) ON DELETE CASCADE,
    PRIMARY KEY (oa_id, problem_id)
);

-- Master task table. A task points at AT MOST ONE context row.
CREATE TABLE IF NOT EXISTS tasks (
    task_id        BIGSERIAL PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title          VARCHAR(255) NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'To Do'
        CHECK (status IN ('To Do', 'In Progress', 'Done')),
    priority       VARCHAR(12)  NOT NULL DEFAULT 'P2 - Medium'
        CHECK (priority IN ('P1 - High', 'P2 - Medium', 'P3 - Low')),
    scheduled_date DATE,
    category       VARCHAR(50)  NOT NULL DEFAULT 'General',
    assignment_id  BIGINT REFERENCES assignments(assignment_id)       ON DELETE CASCADE,
    project_id     BIGINT REFERENCES personal_projects(project_id)    ON DELETE CASCADE,
    problem_id     BIGINT REFERENCES dsa_problems(problem_id)         ON DELETE CASCADE,
    oa_id          BIGINT REFERENCES companies_oa(oa_id)              ON DELETE CASCADE,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT tasks_single_context
        CHECK (num_nonnulls(assignment_id, project_id, problem_id, oa_id) <= 1)
);
-- NOTE: the blueprint has VARCHAR(10), but 'P2 - Medium' is 11 chars, so it is widened to VARCHAR(12).

CREATE INDEX IF NOT EXISTS idx_dsa_user_status  ON dsa_problems (user_id, status);
CREATE INDEX IF NOT EXISTS idx_oa_user_stage    ON companies_oa (user_id, stage);
CREATE INDEX IF NOT EXISTS idx_tasks_user_open  ON tasks (user_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_problem    ON tasks (problem_id);
