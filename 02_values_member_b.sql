-- ============================================================
-- SYNTHETIC SEED DATA (placeholder values for testing only).
-- Attaches everything to the first row in `users` -> register a user first.
-- Safe to re-run. Seeded problems have NO embeddings:
--   run `python backfill_embeddings.py` from flask_backend/ to vectorize them.
-- ============================================================
WITH u AS (SELECT user_id FROM users LIMIT 1)
INSERT INTO dsa_problems (user_id, title, platform, topic_tags, difficulty, status, intuition_notes)
SELECT u.user_id, v.title, v.platform, v.tags, v.difficulty, v.status, v.notes
FROM u, (VALUES
  ('Min Cost to Connect All Points', 'LeetCode', ARRAY['Graphs','Minimum Spanning Tree','Disjoint Set'], 'Medium', 'Re-visit Needed',
   'Use Prim or Kruskal. Edge weight is Manhattan distance between points.'),
  ('Network Delay Time', 'LeetCode', ARRAY['Graphs','Shortest Path','Heap'], 'Medium', 'Solved',
   'Dijkstra with a priority queue for single-source shortest path.'),
  ('Daily Temperatures', 'LeetCode', ARRAY['Stack','Monotonic Stack'], 'Medium', 'Mastered',
   'Maintain a decreasing monotonic stack of indices.'),
  ('Trapping Rain Water', 'LeetCode', ARRAY['Two Pointers','Stack','Dynamic Programming'], 'Hard', 'Re-visit Needed',
   'Water at i is min(maxLeft, maxRight) - height[i]. Two pointers gives O(1) space.'),
  ('Longest Increasing Subsequence', 'LeetCode', ARRAY['Dynamic Programming','Binary Search'], 'Medium', 'Solved',
   'Patience sorting: keep tails array and binary search for the insertion point.'),
  ('Number of Islands', 'LeetCode', ARRAY['Graphs','DFS','BFS','Union Find'], 'Medium', 'Mastered',
   'Flood fill from each unvisited land cell and count the components.'),
  ('Two Sum', 'LeetCode', ARRAY['Array','Hash Map'], 'Easy', 'Mastered',
   'Store value to index in a hash map and look up target - x.'),
  ('Word Ladder', 'LeetCode', ARRAY['Graphs','BFS','String'], 'Hard', 'Solved',
   'BFS over words; generate neighbours with wildcard patterns like h*t.')
) AS v(title, platform, tags, difficulty, status, notes)
ON CONFLICT (user_id, title, platform) DO NOTHING;

WITH u AS (SELECT user_id FROM users LIMIT 1)
INSERT INTO companies_oa (user_id, company_name, role, stage, event_date)
SELECT u.user_id, v.company, v.role, v.stage, v.event_date
FROM u, (VALUES
  ('Google',    'SDE Intern', 'OA Received',     now() + interval '5 days'),
  ('Microsoft', 'SDE Intern', 'Technical Round', now() + interval '9 days'),
  ('Atlassian', 'SDE Intern', 'Applied',         NULL::timestamptz),
  ('Amazon',    'SDE Intern', 'Rejected',        now() - interval '12 days'),
  ('Uber',      'SDE Intern', 'OA Cleared',      now() + interval '2 days')
) AS v(company, role, stage, event_date)
WHERE NOT EXISTS (SELECT 1 FROM companies_oa c
                  WHERE c.user_id = u.user_id AND c.company_name = v.company AND c.role = v.role);

INSERT INTO oa_dsa_tested (oa_id, problem_id)
SELECT o.oa_id, p.problem_id
FROM companies_oa o
JOIN dsa_problems p ON p.user_id = o.user_id
JOIN (VALUES
  ('Google',    'Min Cost to Connect All Points'),
  ('Google',    'Daily Temperatures'),
  ('Microsoft', 'Number of Islands'),
  ('Uber',      'Network Delay Time')
) AS v(company, title) ON v.company = o.company_name AND v.title = p.title
ON CONFLICT DO NOTHING;

-- Review tasks for 'Re-visit Needed' problems (the trigger only fires on new changes,
-- and is skipped if 05_triggers ran after this file, hence the NOT EXISTS guard)
INSERT INTO tasks (user_id, title, priority, scheduled_date, category, problem_id)
SELECT dp.user_id, 'Review DSA Problem: ' || dp.title, 'P2 - Medium', CURRENT_DATE + 2, 'DSA', dp.problem_id
FROM dsa_problems dp
WHERE dp.status = 'Re-visit Needed'
  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.problem_id = dp.problem_id AND t.status <> 'Done');

INSERT INTO tasks (user_id, title, priority, scheduled_date, category, oa_id)
SELECT o.user_id, 'Prep for ' || o.company_name || ' ' || o.role || ' (' || o.stage || ')',
       'P1 - High', COALESCE(o.event_date::date - 1, CURRENT_DATE), 'Career', o.oa_id
FROM companies_oa o
WHERE o.stage IN ('OA Received', 'Technical Round')
  AND NOT EXISTS (SELECT 1 FROM tasks t WHERE t.oa_id = o.oa_id);
