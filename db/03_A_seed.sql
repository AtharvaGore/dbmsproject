-- =============================================================================
-- 03_A_seed.sql
-- Owner: Atharva Gore (Member A)
--
-- Seed data for users, courses, assignments, personal_projects, tasks.
-- Runs before 04_B_seed.sql in db/tools/init.sql.
-- =============================================================================

-- Password is 'Demo@123' for all demo users (scrypt hash recognized by Werkzeug)
\set demo_pw_hash 'scrypt:32768:8:1$Z2pR9SIzQNnsg0lo$08a37b36e6454d03ee2c77feef37873105b5ec7726021edbb7843805b4a0248e686b636db66c152942638d9cf9e485ddaed2e76919298767c5fecf5135fbe30b'

-- -----------------------------------------------------------------------------
-- 1. Demo users
-- -----------------------------------------------------------------------------
INSERT INTO users (user_id, username, email, password_hash, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'atharva',  'atharva@academiaos.internal',  :'demo_pw_hash', 'Student'),
    ('22222222-2222-2222-2222-222222222222', 'bhooshan', 'bhooshan@academiaos.internal', :'demo_pw_hash', 'Student'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin',    'admin@academiaos.internal',    :'demo_pw_hash', 'Admin')
ON CONFLICT (user_id) DO UPDATE
SET username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;


-- -----------------------------------------------------------------------------
-- 2. Courses
-- -----------------------------------------------------------------------------
INSERT INTO courses (user_id, course_code, course_name, instructor, semester, credits)
VALUES
    -- Atharva's courses
    ('11111111-1111-1111-1111-111111111111', 'CS301', 'Database Management Systems', 'Prof. Sharma', 'Fall 2026', 4),
    ('11111111-1111-1111-1111-111111111111', 'CS302', 'Operating Systems',            'Prof. Kulkarni', 'Fall 2026', 4),
    ('11111111-1111-1111-1111-111111111111', 'CS303', 'Computer Networks',            'Prof. Iyer', 'Fall 2026', 3),
    ('11111111-1111-1111-1111-111111111111', 'MA205', 'Linear Algebra & Statistics',  'Prof. Deshmukh', 'Fall 2026', 3),

    -- Bhooshan's courses
    ('22222222-2222-2222-2222-222222222222', 'CS301', 'Database Management Systems', 'Prof. Sharma', 'Fall 2026', 4),
    ('22222222-2222-2222-2222-222222222222', 'CS304', 'Design & Analysis of Algo',   'Prof. Sen', 'Fall 2026', 4),
    ('22222222-2222-2222-2222-222222222222', 'CS305', 'Machine Learning',             'Prof. Gupta', 'Fall 2026', 3);


-- -----------------------------------------------------------------------------
-- 3. Assignments
-- -----------------------------------------------------------------------------
INSERT INTO assignments (user_id, course_id, title, description, due_date, status, weightage, grade)
SELECT c.user_id, c.course_id, a.title, a.description,
       current_date + a.days_offset, a.status, a.weightage, a.grade
FROM courses c
JOIN (VALUES
    -- Atharva
    ('11111111-1111-1111-1111-111111111111', 'CS301', 'ER Modeling & Relational Schema', 'Convert entity diagram to 3NF tables', -14, 'Graded', 15.00, 96.00),
    ('11111111-1111-1111-1111-111111111111', 'CS301', 'Relational Algebra & SQL Quiz',   'Online MCQ and query writing quiz', -10, 'Graded', 10.00, 92.00),
    ('11111111-1111-1111-1111-111111111111', 'CS301', 'Triggers, Procedures & Views',      'Build audit triggers and analytical views', 3, 'In Progress', 25.00, NULL),
    ('11111111-1111-1111-1111-111111111111', 'CS301', 'Query Optimization & EXPLAIN Plan', 'Benchmark B-tree vs GIN vs HNSW indices', 18, 'Not Started', 20.00, NULL),
    ('11111111-1111-1111-1111-111111111111', 'CS302', 'Virtual Memory Simulator',          'Implement LRU and Clock page replacement in C', -3, 'Submitted', 20.00, NULL),
    ('11111111-1111-1111-1111-111111111111', 'CS302', 'Pthreads Dining Philosophers',       'Deadlock-free thread synchronization', 7, 'In Progress', 20.00, NULL),
    ('11111111-1111-1111-1111-111111111111', 'CS303', 'Socket Chat Protocol',               'Multi-client async TCP chat with heartbeats', 12, 'Not Started', 25.00, NULL),
    ('11111111-1111-1111-1111-111111111111', 'MA205', 'Matrix Decompositions Lab',         'PCA and SVD implementations in Python NumPy', -7, 'Graded', 20.00, 88.50),

    -- Bhooshan
    ('22222222-2222-2222-2222-222222222222', 'CS301', 'Database RLS & Security Policies',  'Row-level security enforcement for RBAC', -10, 'Graded', 20.00, 94.00),
    ('22222222-2222-2222-2222-222222222222', 'CS301', 'Vector Similarity Search Module',   'Pgvector embeddings and cosine distance', 4, 'In Progress', 25.00, NULL),
    ('22222222-2222-2222-2222-222222222222', 'CS304', 'Dynamic Programming Problem Set',    'Memoization and tabulation for knapsack variations', -2, 'Submitted', 15.00, NULL),
    ('22222222-2222-2222-2222-222222222222', 'CS304', 'Graph Flow & Cut Algorithms',        'Ford-Fulkerson and Edmonds-Karp implementations', 10, 'Not Started', 20.00, NULL),
    ('22222222-2222-2222-2222-222222222222', 'CS305', 'Logistic Regression from Scratch',  'Gradient descent optimization and decision boundary', -12, 'Graded', 20.00, 91.00),
    ('22222222-2222-2222-2222-222222222222', 'CS305', 'Transformer Fine-tuning Lab',        'Fine-tune MiniLM on sentence classification', 8, 'In Progress', 25.00, NULL)
) AS a(user_id, course_code, title, description, days_offset, status, weightage, grade)
ON c.user_id = a.user_id::uuid AND c.course_code = a.course_code;


-- -----------------------------------------------------------------------------
-- 4. Personal Projects
-- -----------------------------------------------------------------------------
INSERT INTO personal_projects (user_id, title, description, status, tech_stack, github_url, live_url)
VALUES
    -- Atharva
    ('11111111-1111-1111-1111-111111111111', 'AcademiaOS Platform',
     'All-in-one student workspace combining coursework, DSA practice, and placement tracking',
     'In Development', ARRAY['PostgreSQL', 'Flask', 'Next.js', 'TypeScript', 'Tailwind'],
     'https://github.com/atharva/academiaos', 'https://academiaos.internal'),

    ('11111111-1111-1111-1111-111111111111', 'Distributed KV Store with Raft',
     'Consensus-backed in-memory key-value store with leader election and log replication',
     'Idea', ARRAY['Go', 'Raft', 'gRPC', 'Protobuf'],
     'https://github.com/atharva/distributed-kv', NULL),

    ('11111111-1111-1111-1111-111111111111', 'Mini-C Optimizing Compiler',
     'Bytecode compiler and AST optimizer for an imperative subset of C',
     'Shipped', ARRAY['C', 'Flex', 'Bison', 'LLVM'],
     'https://github.com/atharva/mini-c-compiler', NULL),

    -- Bhooshan
    ('22222222-2222-2222-2222-222222222222', 'PgVector Neural Search Engine',
     'Semantic code & problem lookup engine using sentence-transformers and HNSW indexes',
     'In Development', ARRAY['PostgreSQL', 'pgvector', 'Python', 'PyTorch'],
     'https://github.com/bhooshan/neural-search', NULL),

    ('22222222-2222-2222-2222-222222222222', 'Rust Multi-threaded Raytracer',
     'Physically based raytracer supporting bounding volume hierarchies and BVH acceleration',
     'Shipped', ARRAY['Rust', 'Rayon', 'Linear Algebra'],
     'https://github.com/bhooshan/rust-raytracer', 'https://raytracer.internal');


-- -----------------------------------------------------------------------------
-- 5. Tasks (Coursework, Projects, and General Tasks)
-- -----------------------------------------------------------------------------
INSERT INTO tasks (user_id, title, category, priority, status, scheduled_date, assignment_id, project_id)
SELECT c.user_id, 'Submit: ' || a.title, 'Coursework',
       CASE WHEN a.due_date < current_date + 3 THEN 'P0 - Urgent' ELSE 'P1 - High' END,
       CASE WHEN a.status IN ('Submitted', 'Graded') THEN 'Done' ELSE 'To Do' END,
       a.due_date::date, a.assignment_id, NULL
FROM assignments a
JOIN courses c ON c.course_id = a.course_id;

-- Project Milestone Tasks
INSERT INTO tasks (user_id, title, category, priority, status, scheduled_date, project_id)
SELECT p.user_id, 'Milestone: Complete core features for ' || p.title, 'Project',
       CASE WHEN p.title LIKE 'AcademiaOS%' THEN 'P1 - High' ELSE 'P2 - Medium' END,
       CASE WHEN p.status = 'Shipped' THEN 'Done' ELSE 'To Do' END,
       current_date + 14, p.project_id
FROM personal_projects p;

-- General Academic & Life Tasks
INSERT INTO tasks (user_id, title, category, priority, status, scheduled_date)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Read Chapter 4 of OS Dinosaur Book (Threads)', 'Coursework', 'P2 - Medium', 'To Do', current_date + 2),
    ('11111111-1111-1111-1111-111111111111', 'Update resume with AcademiaOS project details', 'Career', 'P1 - High', 'To Do', current_date + 5),
    ('11111111-1111-1111-1111-111111111111', 'Renew college library book on Distributed Systems', 'General', 'P3 - Low', 'To Do', current_date + 6),

    ('22222222-2222-2222-2222-222222222222', 'Review Dynamic Programming notes on Interval DP', 'DSA', 'P1 - High', 'To Do', current_date + 1),
    ('22222222-2222-2222-2222-222222222222', 'Clean up GitHub README for rust-raytracer', 'Project', 'P3 - Low', 'Done', current_date - 1);
