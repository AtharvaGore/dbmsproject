-- =============================================================================
-- 02_B_dsa_career_schema.sql
-- Owner: Bhooshan Deshpande (Member B)
-- Runs after 01_A_core_schema.sql (needs users and tasks to exist).
--
-- Contents
--   1. pgvector extension                         (rubric 4: vector DB creation)
--   2. Domain for OA stages
--   3. DSA tables: dsa_problems, topics, dsa_problem_topics, dsa_embeddings
--   4. Career tables: companies_oa, oa_stage_history, oa_dsa_tested
--   5. Indexes: GIN (full-text), HNSW (vector), B-tree
--   6. ALTER / DROP on Member A's tables          (rubric 3: ALTER and DROP)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Extension
-- pgvector adds the VECTOR type, distance operators (<=> cosine, <-> L2,
-- <#> inner product) and the HNSW / IVFFlat index types.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;


-- -----------------------------------------------------------------------------
-- 2. Domain: one definition of the valid OA stages, reused by companies_oa and
-- oa_stage_history so the two lists can never drift apart.
-- -----------------------------------------------------------------------------
CREATE DOMAIN oa_stage AS VARCHAR(20)
    CONSTRAINT chk_oa_stage_value CHECK (VALUE IN (
        'Applied', 'OA Received', 'OA Cleared',
        'Technical Round', 'HR Round', 'Offer', 'Rejected'
    ));


-- -----------------------------------------------------------------------------
-- 3. DSA tables
-- -----------------------------------------------------------------------------

-- One row per practice problem a user has logged.
CREATE TABLE dsa_problems (
    problem_id      BIGSERIAL     PRIMARY KEY,
    user_id         UUID          NOT NULL,
    title           VARCHAR(200)  NOT NULL,
    platform        VARCHAR(20)   NOT NULL DEFAULT 'LeetCode',
    difficulty      VARCHAR(10)   NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'Solved',
    problem_url     VARCHAR(255),
    intuition_notes TEXT,
    last_revised    DATE,
    -- Derived attribute: kept in sync by Postgres, never written by the app.
    -- Title matches are weighted higher (A) than note matches (B).
    fts_tokens      TSVECTOR GENERATED ALWAYS AS (
                        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                        setweight(to_tsvector('english', coalesce(intuition_notes, '')), 'B')
                    ) STORED,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT fk_dsa_problems_user
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT chk_dsa_platform
        CHECK (platform IN ('LeetCode', 'Codeforces', 'HackerRank', 'Other')),
    CONSTRAINT chk_dsa_difficulty
        CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    CONSTRAINT chk_dsa_status
        CHECK (status IN ('Solved', 'Re-visit Needed', 'Mastered')),
    CONSTRAINT chk_dsa_url
        CHECK (problem_url IS NULL OR problem_url ~ '^https?://'),
    CONSTRAINT chk_dsa_title_not_blank
        CHECK (length(trim(title)) > 0),
    CONSTRAINT uq_dsa_user_platform_title
        UNIQUE (user_id, platform, title)
);

-- Shared list of topic tags (Arrays, Graphs, Dynamic Programming, ...).
-- Replaces the old TEXT[] topic_tags column so topics are in 1NF and joinable.
CREATE TABLE topics (
    topic_id   SERIAL       PRIMARY KEY,
    name       VARCHAR(50)  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_topics_name UNIQUE (name),
    CONSTRAINT chk_topics_name_not_blank CHECK (length(trim(name)) > 0)
);

-- Junction table for the M:N TAGGED relationship.
CREATE TABLE dsa_problem_topics (
    problem_id BIGINT      NOT NULL,
    topic_id   INT         NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_dsa_problem_topics PRIMARY KEY (problem_id, topic_id),
    CONSTRAINT fk_dpt_problem
        FOREIGN KEY (problem_id) REFERENCES dsa_problems (problem_id) ON DELETE CASCADE,
    CONSTRAINT fk_dpt_topic
        FOREIGN KEY (topic_id) REFERENCES topics (topic_id) ON DELETE CASCADE
);

-- Weak entity: the vector store. One embedding per problem at most.
-- problem_id is both PK and FK, which enforces the 1 : 0..1 relationship.
-- 384 dimensions = sentence-transformers/all-MiniLM-L6-v2.
-- If the team switches to OpenAI text-embedding-3-small, change 384 to 1536
-- here, in 06_B_logic.sql, and in the embedding script.
CREATE TABLE dsa_embeddings (
    problem_id  BIGINT       PRIMARY KEY,
    embedding   VECTOR(384)  NOT NULL,
    model       VARCHAR(50)  NOT NULL,
    source_hash CHAR(32)     NOT NULL,   -- md5 of the exact text that was embedded
    embedded_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_dsa_embeddings_problem
        FOREIGN KEY (problem_id) REFERENCES dsa_problems (problem_id) ON DELETE CASCADE,
    CONSTRAINT chk_dsa_embeddings_hash
        CHECK (source_hash ~ '^[0-9a-f]{32}$')
);


-- -----------------------------------------------------------------------------
-- 4. Career tables
-- -----------------------------------------------------------------------------

-- One row per job / internship application. stage holds the CURRENT stage;
-- the full path is in oa_stage_history.
CREATE TABLE companies_oa (
    oa_id            BIGSERIAL     PRIMARY KEY,
    user_id          UUID          NOT NULL,
    company_name     VARCHAR(100)  NOT NULL,
    role_title       VARCHAR(100)  NOT NULL,
    stage            oa_stage      NOT NULL DEFAULT 'Applied',
    applied_on       DATE          NOT NULL DEFAULT current_date,
    event_date       DATE,                      -- next OA / interview date
    application_link VARCHAR(255),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT fk_companies_oa_user
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
    CONSTRAINT uq_oa_user_company_role
        UNIQUE (user_id, company_name, role_title),
    CONSTRAINT chk_oa_event_after_applied
        CHECK (event_date IS NULL OR event_date >= applied_on),
    CONSTRAINT chk_oa_link
        CHECK (application_link IS NULL OR application_link ~ '^https?://'),
    CONSTRAINT chk_oa_company_not_blank
        CHECK (length(trim(company_name)) > 0)
);

-- Weak entity: every stage an application has passed through.
-- Partial key changed_at + owner key oa_id = primary key.
-- Rows are written by trg_oa_stage_history (06_B_logic.sql), not by the app.
CREATE TABLE oa_stage_history (
    oa_id      BIGINT       NOT NULL,
    changed_at TIMESTAMPTZ  NOT NULL DEFAULT clock_timestamp(),
    stage      oa_stage     NOT NULL,

    CONSTRAINT pk_oa_stage_history PRIMARY KEY (oa_id, changed_at),
    CONSTRAINT fk_oa_history_oa
        FOREIGN KEY (oa_id) REFERENCES companies_oa (oa_id) ON DELETE CASCADE
);

-- Junction table for the M:N TESTED_IN relationship, with its own attribute.
CREATE TABLE oa_dsa_tested (
    oa_id            BIGINT      NOT NULL,
    problem_id       BIGINT      NOT NULL,
    solved_during_oa BOOLEAN     NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT pk_oa_dsa_tested PRIMARY KEY (oa_id, problem_id),
    CONSTRAINT fk_oa_tested_oa
        FOREIGN KEY (oa_id) REFERENCES companies_oa (oa_id) ON DELETE CASCADE,
    CONSTRAINT fk_oa_tested_problem
        FOREIGN KEY (problem_id) REFERENCES dsa_problems (problem_id) ON DELETE CASCADE
);


-- -----------------------------------------------------------------------------
-- 5. Indexes
-- -----------------------------------------------------------------------------

-- Full-text search: GIN index over the generated tsvector column.
CREATE INDEX idx_dsa_problems_fts ON dsa_problems USING GIN (fts_tokens);

-- Vector search: HNSW graph index for cosine distance (the <=> operator).
-- m / ef_construction are pgvector's defaults, written out so they can be
-- explained in the viva.
CREATE INDEX idx_dsa_embeddings_hnsw ON dsa_embeddings
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- B-tree indexes for the common filters and the reverse side of each junction.
CREATE INDEX idx_dsa_problems_user_status ON dsa_problems (user_id, status);
CREATE INDEX idx_dpt_topic                ON dsa_problem_topics (topic_id);
CREATE INDEX idx_companies_oa_user_stage  ON companies_oa (user_id, stage);
CREATE INDEX idx_oa_tested_problem        ON oa_dsa_tested (problem_id);


-- -----------------------------------------------------------------------------
-- 6. ALTER / DROP on Member A's tables (agreed contract, see the work-split doc)
-- -----------------------------------------------------------------------------

-- users: LeetCode username for the dashboard stats card.
ALTER TABLE users
    ADD COLUMN leetcode_username VARCHAR(50),
    ADD CONSTRAINT chk_users_leetcode_username
        CHECK (leetcode_username IS NULL OR leetcode_username ~ '^[A-Za-z0-9_-]{1,50}$');

-- tasks: link a to-do item to a DSA problem or an application.
ALTER TABLE tasks
    ADD COLUMN problem_id BIGINT,
    ADD COLUMN oa_id      BIGINT,
    ADD CONSTRAINT fk_tasks_problem
        FOREIGN KEY (problem_id) REFERENCES dsa_problems (problem_id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_tasks_oa
        FOREIGN KEY (oa_id) REFERENCES companies_oa (oa_id) ON DELETE SET NULL;

-- A's constraint only knows about two context columns. Drop it and recreate it
-- over all four so a task still belongs to at most one thing.
ALTER TABLE tasks DROP CONSTRAINT chk_single_context;
ALTER TABLE tasks ADD CONSTRAINT chk_single_context
    CHECK (num_nonnulls(assignment_id, project_id, problem_id, oa_id) <= 1);

CREATE INDEX idx_tasks_problem ON tasks (problem_id);
CREATE INDEX idx_tasks_oa      ON tasks (oa_id);
