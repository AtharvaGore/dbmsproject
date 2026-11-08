-- =============================================================================
-- 01_A_core_schema.sql
-- Owner: Atharva Gore (Member A)
--
-- Core relational tables: users, courses, assignments, personal_projects, tasks.
-- Runs first in db/tools/init.sql.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. users: Authentication and base profile
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    user_id       UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)              NOT NULL UNIQUE,
    email         VARCHAR(255)             NOT NULL UNIQUE,
    password_hash VARCHAR(255)             NOT NULL,
    role          VARCHAR(20)              NOT NULL DEFAULT 'Student',
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role CHECK (role IN ('Student', 'Admin')),
    CONSTRAINT chk_users_username_not_blank CHECK (length(trim(username)) >= 3),
    CONSTRAINT chk_users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE INDEX idx_users_email ON users (lower(email));
CREATE INDEX idx_users_username ON users (lower(username));
CREATE INDEX idx_users_role ON users (role);


-- -----------------------------------------------------------------------------
-- 2. courses: Academic courses tracked by each student
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS courses CASCADE;
CREATE TABLE courses (
    course_id   BIGSERIAL                PRIMARY KEY,
    user_id     UUID                     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    course_code VARCHAR(50),
    course_name VARCHAR(150)             NOT NULL,
    instructor  VARCHAR(150),
    semester    VARCHAR(50),
    credits     INT                      NOT NULL DEFAULT 3,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_courses_credits CHECK (credits >= 1 AND credits <= 10),
    CONSTRAINT chk_courses_name_not_blank CHECK (length(trim(course_name)) > 0),
    CONSTRAINT uq_courses_user_code_name UNIQUE (user_id, course_name)
);

CREATE INDEX idx_courses_user ON courses (user_id);


-- -----------------------------------------------------------------------------
-- 3. assignments: Course assignments and deliverables
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS assignments CASCADE;
CREATE TABLE assignments (
    assignment_id BIGSERIAL                PRIMARY KEY,
    user_id       UUID                     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    course_id     BIGINT                   NOT NULL REFERENCES courses (course_id) ON DELETE CASCADE,
    title         VARCHAR(200)             NOT NULL,
    description   TEXT,
    due_date      TIMESTAMP WITH TIME ZONE NOT NULL,
    status        VARCHAR(30)              NOT NULL DEFAULT 'Not Started',
    weightage     NUMERIC(5,2),
    grade         NUMERIC(5,2),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_assignments_status CHECK (status IN ('Not Started', 'In Progress', 'Submitted', 'Graded')),
    CONSTRAINT chk_assignments_weightage CHECK (weightage IS NULL OR (weightage >= 0 AND weightage <= 100)),
    CONSTRAINT chk_assignments_grade CHECK (grade IS NULL OR (grade >= 0 AND grade <= 100)),
    CONSTRAINT chk_assignments_title_not_blank CHECK (length(trim(title)) > 0)
);

CREATE INDEX idx_assignments_user_due ON assignments (user_id, due_date);
CREATE INDEX idx_assignments_course   ON assignments (course_id);
CREATE INDEX idx_assignments_status   ON assignments (user_id, status);


-- -----------------------------------------------------------------------------
-- 4. personal_projects: Portfolio and side projects
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS personal_projects CASCADE;
CREATE TABLE personal_projects (
    project_id  BIGSERIAL                PRIMARY KEY,
    user_id     UUID                     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    title       VARCHAR(200)             NOT NULL,
    description TEXT,
    status      VARCHAR(30)              NOT NULL DEFAULT 'Idea',
    tech_stack  TEXT[]                   DEFAULT '{}',
    github_url  TEXT,
    live_url    TEXT,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_projects_status CHECK (status IN ('Idea', 'In Development', 'Shipped')),
    CONSTRAINT chk_projects_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_projects_github_url CHECK (github_url IS NULL OR github_url ~* '^https?://'),
    CONSTRAINT chk_projects_live_url CHECK (live_url IS NULL OR live_url ~* '^https?://')
);

CREATE INDEX idx_personal_projects_user ON personal_projects (user_id);
CREATE INDEX idx_personal_projects_status ON personal_projects (user_id, status);


-- -----------------------------------------------------------------------------
-- 5. tasks: To-do items across coursework, projects, and later DSA/Career
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS tasks CASCADE;
CREATE TABLE tasks (
    task_id        BIGSERIAL                PRIMARY KEY,
    user_id        UUID                     NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    title          VARCHAR(200)             NOT NULL,
    category       VARCHAR(50)              NOT NULL DEFAULT 'General',
    priority       VARCHAR(20)              NOT NULL DEFAULT 'P2 - Medium',
    status         VARCHAR(30)              NOT NULL DEFAULT 'To Do',
    scheduled_date DATE,
    assignment_id  BIGINT                   CONSTRAINT fk_tasks_assignment REFERENCES assignments (assignment_id) ON DELETE SET NULL,
    project_id     BIGINT                   CONSTRAINT fk_tasks_project REFERENCES personal_projects (project_id) ON DELETE SET NULL,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_tasks_priority CHECK (priority IN ('P0 - Urgent', 'P1 - High', 'P2 - Medium', 'P3 - Low')),
    CONSTRAINT chk_tasks_status CHECK (status IN ('To Do', 'In Progress', 'Done')),
    CONSTRAINT chk_tasks_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT chk_single_context CHECK (num_nonnulls(assignment_id, project_id) <= 1)
);

CREATE INDEX idx_tasks_user_date ON tasks (user_id, scheduled_date);
CREATE INDEX idx_tasks_status    ON tasks (user_id, status);
CREATE INDEX idx_tasks_assignment ON tasks (assignment_id);
CREATE INDEX idx_tasks_project    ON tasks (project_id);
