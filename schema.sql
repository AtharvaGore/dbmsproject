-- ============================================================
-- DBMS Project Schema (PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- users: Handles Authentication and RBAC
-- ============================================================
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    user_id       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)   NOT NULL,
    role          VARCHAR(20)    NOT NULL,
    CONSTRAINT users_role_check CHECK (role IN ('Student', 'Admin'))
);

-- ============================================================
-- courses
-- ============================================================
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses (
    course_id     BIGSERIAL      PRIMARY KEY,
    course_name   VARCHAR(150)   NOT NULL,
    instructor_id UUID           REFERENCES users (user_id)
);

-- ============================================================
-- assignments
-- ============================================================
DROP TABLE IF EXISTS assignments CASCADE;
CREATE TABLE assignments (
    assignment_id BIGSERIAL      PRIMARY KEY,
    user_id       UUID           NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    course_id     BIGINT         NOT NULL REFERENCES courses (course_id) ON DELETE CASCADE,
    title         VARCHAR(200)   NOT NULL,
    due_date      TIMESTAMP      NOT NULL,
    status        VARCHAR(30)    DEFAULT 'Not Started',
    weightage     NUMERIC(5,2),
    CONSTRAINT assignments_status_check   CHECK (status IN ('Not Started', 'In Progress', 'Submitted', 'Graded')),
    CONSTRAINT assignments_weightage_check CHECK (weightage >= 0 AND weightage <= 100)
);

-- ============================================================
-- personal_projects
-- ============================================================
DROP TABLE IF EXISTS personal_projects CASCADE;
CREATE TABLE personal_projects (
    project_id BIGSERIAL    PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    status     VARCHAR(30)  DEFAULT 'Idea',
    tech_stack TEXT[],
    github_url TEXT,
    CONSTRAINT personal_projects_status_check CHECK (status IN ('Idea', 'In Development', 'Shipped'))
);

-- ============================================================
-- dsa_problems
-- ============================================================
DROP TABLE IF EXISTS dsa_problems CASCADE;
CREATE TABLE dsa_problems (
    problem_id      BIGSERIAL    PRIMARY KEY,
    user_id         UUID         NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    title           VARCHAR(200) NOT NULL,
    difficulty      VARCHAR(20),
    status          VARCHAR(30)  DEFAULT 'Solved',
    intuition_notes TEXT,
    CONSTRAINT dsa_problems_difficulty_check CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    CONSTRAINT dsa_problems_status_check     CHECK (status IN ('Solved', 'Re-visit Needed', 'Mastered'))
);

-- ============================================================
-- companies_oa
-- ============================================================
DROP TABLE IF EXISTS companies_oa CASCADE;
CREATE TABLE companies_oa (
    oa_id        BIGSERIAL    PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    stage        VARCHAR(50)  DEFAULT 'Applied',
    event_date   TIMESTAMP,
    CONSTRAINT companies_oa_stage_check CHECK (stage IN ('Applied', 'OA Received', 'Interview', 'Offer', 'Rejected'))
);

-- ============================================================
-- oa_dsa_tested: junction table (Many-to-Many)
-- ============================================================
DROP TABLE IF EXISTS oa_dsa_tested CASCADE;
CREATE TABLE oa_dsa_tested (
    oa_id      BIGINT NOT NULL REFERENCES companies_oa (oa_id)   ON DELETE CASCADE,
    problem_id BIGINT NOT NULL REFERENCES dsa_problems (problem_id) ON DELETE CASCADE,
    PRIMARY KEY (oa_id, problem_id)
);
