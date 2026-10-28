-- =============================================================================
-- 04_B_seed.sql
-- Owner: Bhooshan Deshpande (Member B)
-- DEMO DATA. Every row here is sample data for the two demo students, not
-- anyone's real record. Company names are used only as realistic labels.
--
-- Depends on 03_A_seed.sql for these fixed user ids:
--   11111111-1111-1111-1111-111111111111  Atharva  (Student)
--   22222222-2222-2222-2222-222222222222  Bhooshan (Student)
--
-- Runs BEFORE the triggers in 06_B_logic.sql exist, so this file writes the
-- stage history and the review tasks itself instead of relying on triggers.
-- Embeddings are not created here; see 04b_B_embeddings.sql.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- LeetCode usernames (UPDATE on A's table, column added in file 02)
-- -----------------------------------------------------------------------------
UPDATE users SET leetcode_username = 'atharva_demo'
 WHERE user_id = '11111111-1111-1111-1111-111111111111';
UPDATE users SET leetcode_username = 'bhooshan_demo'
 WHERE user_id = '22222222-2222-2222-2222-222222222222';


-- -----------------------------------------------------------------------------
-- Topics
-- -----------------------------------------------------------------------------
INSERT INTO topics (name) VALUES
    ('Arrays'), ('Strings'), ('Hashing'), ('Two Pointers'), ('Sliding Window'),
    ('Binary Search'), ('Stack'), ('Linked List'), ('Trees'), ('Graphs'),
    ('BFS'), ('DFS'), ('Topological Sort'), ('Dynamic Programming'), ('Greedy'),
    ('Heap'), ('Backtracking'), ('Union Find'), ('Intervals'), ('Prefix Sum'),
    ('Bit Manipulation'), ('Design'), ('Sorting');


-- -----------------------------------------------------------------------------
-- DSA problems
-- last_revised is relative to the day the database is built, so the demo
-- always looks current.
-- -----------------------------------------------------------------------------
INSERT INTO dsa_problems
    (user_id, title, platform, difficulty, status, problem_url, intuition_notes, last_revised)
VALUES
-- ---- Bhooshan ----
('22222222-2222-2222-2222-222222222222', 'Two Sum', 'LeetCode', 'Easy', 'Mastered',
 'https://leetcode.com/problems/two-sum/',
 'Store each value''s index in a hashmap. For each x, check whether target - x is already in the map before inserting x. One pass, O(n) time and O(n) space.',
 current_date - 40),
('22222222-2222-2222-2222-222222222222', 'Longest Substring Without Repeating Characters', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/longest-substring-without-repeating-characters/',
 'Sliding window with a map of last-seen index per character. When a repeat appears inside the window, jump left to last_seen + 1 instead of shrinking one step at a time.',
 current_date - 12),
('22222222-2222-2222-2222-222222222222', 'Minimum Window Substring', 'LeetCode', 'Hard', 'Re-visit Needed',
 'https://leetcode.com/problems/minimum-window-substring/',
 'Expand right until the window covers every needed character count (track a formed counter), then shrink left while it stays valid and record the best window. Got the formed counter wrong twice, needs another attempt.',
 current_date - 9),
('22222222-2222-2222-2222-222222222222', 'Container With Most Water', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/container-with-most-water/',
 'Two pointers at both ends. Area is limited by the shorter wall, so always move the shorter one inward; moving the taller one can never give a bigger area.',
 current_date - 20),
('22222222-2222-2222-2222-222222222222', '3Sum', 'LeetCode', 'Medium', 'Re-visit Needed',
 'https://leetcode.com/problems/3sum/',
 'Sort, fix index i, then run two pointers on the rest looking for -nums[i]. Skip duplicate values for i and for both pointers after a match. The duplicate skipping is where I keep making mistakes.',
 current_date - 6),
('22222222-2222-2222-2222-222222222222', 'Search in Rotated Sorted Array', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
 'Binary search where one half around mid is always sorted. Check whether the target lies inside the sorted half; if yes search there, otherwise search the other half.',
 current_date - 15),
('22222222-2222-2222-2222-222222222222', 'Koko Eating Bananas', 'LeetCode', 'Medium', 'Mastered',
 'https://leetcode.com/problems/koko-eating-bananas/',
 'Binary search on the answer. Speed k ranges from 1 to max(piles); k is feasible if the sum of ceil(pile / k) is at most h. Find the smallest feasible k.',
 current_date - 30),
('22222222-2222-2222-2222-222222222222', 'Valid Parentheses', 'LeetCode', 'Easy', 'Mastered',
 'https://leetcode.com/problems/valid-parentheses/',
 'Push opening brackets on a stack; on a closing bracket the top must be its matching opener. Valid only if the stack is empty at the end.',
 current_date - 45),
('22222222-2222-2222-2222-222222222222', 'Daily Temperatures', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/daily-temperatures/',
 'Monotonic decreasing stack of indices. When a warmer day arrives, pop every colder index and record the distance to today.',
 current_date - 18),
('22222222-2222-2222-2222-222222222222', 'Largest Rectangle in Histogram', 'LeetCode', 'Hard', 'Re-visit Needed',
 'https://leetcode.com/problems/largest-rectangle-in-histogram/',
 'Monotonic increasing stack of indices. When a bar is popped, its rectangle spans from the new stack top + 1 to the current index - 1. Append a 0-height sentinel to flush the stack at the end.',
 current_date - 4),
('22222222-2222-2222-2222-222222222222', 'Reverse Linked List', 'LeetCode', 'Easy', 'Mastered',
 'https://leetcode.com/problems/reverse-linked-list/',
 'Iterate with prev, curr and next pointers, flipping curr.next to prev each step. The recursive version reverses the rest and then fixes head.next.next = head.',
 current_date - 50),
('22222222-2222-2222-2222-222222222222', 'LRU Cache', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/lru-cache/',
 'Hashmap from key to node plus a doubly linked list with dummy head and tail. Move a node to the front on get and put; evict the node before the tail when over capacity.',
 current_date - 10),
('22222222-2222-2222-2222-222222222222', 'Number of Islands', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/number-of-islands/',
 'Scan the grid; every unvisited land cell starts a DFS or BFS flood fill that marks the whole island visited. The answer is the number of flood fills started.',
 current_date - 14),
('22222222-2222-2222-2222-222222222222', 'Course Schedule', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/course-schedule/',
 'Cycle detection in a directed graph. Kahn''s algorithm: queue every node with indegree 0, remove it and decrement its neighbours. If fewer than n nodes are processed there is a cycle.',
 current_date - 8),
('22222222-2222-2222-2222-222222222222', 'Rotting Oranges', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/rotting-oranges/',
 'Multi-source BFS starting from every rotten orange at once. Each BFS level is one minute. If fresh oranges remain at the end, return -1.',
 current_date - 16),
('22222222-2222-2222-2222-222222222222', 'Coin Change', 'LeetCode', 'Medium', 'Re-visit Needed',
 'https://leetcode.com/problems/coin-change/',
 'Unbounded knapsack: dp[a] = min over coins of dp[a - c] + 1, with dp[0] = 0 and amount + 1 standing in for infinity. Mixed up the loop order with Coin Change II, which counts combinations.',
 current_date - 5),
('22222222-2222-2222-2222-222222222222', 'Longest Increasing Subsequence', 'LeetCode', 'Medium', 'Re-visit Needed',
 'https://leetcode.com/problems/longest-increasing-subsequence/',
 'O(n^2) dp works: dp[i] = 1 + max dp[j] for j < i with nums[j] < nums[i]. The O(n log n) version keeps a tails array and binary searches for the first tail >= x to replace.',
 current_date - 3),
('22222222-2222-2222-2222-222222222222', 'House Robber', 'LeetCode', 'Medium', 'Mastered',
 'https://leetcode.com/problems/house-robber/',
 'dp[i] = max(dp[i-1], dp[i-2] + nums[i]). Only the last two values are needed, so two variables are enough.',
 current_date - 35),
('22222222-2222-2222-2222-222222222222', 'Edit Distance', 'LeetCode', 'Hard', 'Re-visit Needed',
 'https://leetcode.com/problems/edit-distance/',
 '2D dp over prefixes of both strings. If characters match take the diagonal, else 1 + min(insert, delete, replace). The first row and column are just i and j.',
 current_date - 2),
('22222222-2222-2222-2222-222222222222', 'Merge Intervals', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/merge-intervals/',
 'Sort by start. Keep extending the last merged interval while the next one overlaps it, otherwise start a new interval.',
 current_date - 11),
('22222222-2222-2222-2222-222222222222', 'Kth Largest Element in an Array', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/kth-largest-element-in-an-array/',
 'Keep a min-heap of size k; after processing everything the root is the kth largest. Quickselect gives O(n) on average.',
 current_date - 13),
('22222222-2222-2222-2222-222222222222', 'Subsets', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/subsets/',
 'Backtracking: at each index choose to include or skip the element. Alternative: iterate masks from 0 to 2^n - 1 and pick the set bits.',
 current_date - 22),
('22222222-2222-2222-2222-222222222222', 'Redundant Connection', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/redundant-connection/',
 'Union-Find with path compression and union by rank. The first edge whose endpoints already have the same root closes a cycle, so it is the answer.',
 current_date - 7),
('22222222-2222-2222-2222-222222222222', 'Subarray Sum Equals K', 'LeetCode', 'Medium', 'Re-visit Needed',
 'https://leetcode.com/problems/subarray-sum-equals-k/',
 'Running prefix sum with a hashmap counting how often each prefix has appeared. At each step add count[prefix - k]. Start with count[0] = 1 or subarrays starting at index 0 are missed.',
 current_date - 1),
('22222222-2222-2222-2222-222222222222', 'Same Differences', 'Codeforces', 'Medium', 'Solved',
 'https://codeforces.com/problemset/problem/1520/D',
 'Rewrite a_j - a_i = j - i as a_j - j = a_i - i. Count equal values of a_i - i with a hashmap and add pairs as you go.',
 current_date - 19),
('22222222-2222-2222-2222-222222222222', 'Fraudulent Activity Notifications', 'HackerRank', 'Medium', 'Solved',
 'https://www.hackerrank.com/challenges/fraudulent-activity-notifications/problem',
 'Sliding window median over the last d days. Values are at most 200, so keep a counting array and walk it to find the median instead of sorting the window each day.',
 current_date - 25),

-- ---- Atharva ----
('11111111-1111-1111-1111-111111111111', 'Two Sum', 'LeetCode', 'Easy', 'Mastered',
 'https://leetcode.com/problems/two-sum/',
 'Hashmap of value to index; check for the complement before inserting the current value.',
 current_date - 28),
('11111111-1111-1111-1111-111111111111', 'Best Time to Buy and Sell Stock', 'LeetCode', 'Easy', 'Solved',
 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/',
 'Track the minimum price so far and the best profit selling today. Single pass.',
 current_date - 17),
('11111111-1111-1111-1111-111111111111', 'Climbing Stairs', 'LeetCode', 'Easy', 'Mastered',
 'https://leetcode.com/problems/climbing-stairs/',
 'Fibonacci: ways(n) = ways(n-1) + ways(n-2). Two variables are enough.',
 current_date - 33),
('11111111-1111-1111-1111-111111111111', 'Binary Tree Level Order Traversal', 'LeetCode', 'Medium', 'Solved',
 'https://leetcode.com/problems/binary-tree-level-order-traversal/',
 'BFS with a queue; process the queue length at the start of each loop as one level.',
 current_date - 9),
('11111111-1111-1111-1111-111111111111', 'Maximum Depth of Binary Tree', 'LeetCode', 'Easy', 'Mastered',
 'https://leetcode.com/problems/maximum-depth-of-binary-tree/',
 'Recursive DFS: 1 + max(depth(left), depth(right)), with 0 for an empty node.',
 current_date - 26),
('11111111-1111-1111-1111-111111111111', 'Word Search', 'LeetCode', 'Medium', 'Re-visit Needed',
 'https://leetcode.com/problems/word-search/',
 'Backtracking DFS from every cell; mark the cell visited before recursing and unmark it after. Prune as soon as a character does not match.',
 current_date - 4),
('11111111-1111-1111-1111-111111111111', 'Validate Binary Search Tree', 'LeetCode', 'Medium', 'Re-visit Needed',
 'https://leetcode.com/problems/validate-binary-search-tree/',
 'Pass lower and upper bounds down the recursion; checking only the direct children is not enough.',
 current_date - 2);


-- -----------------------------------------------------------------------------
-- Problem to topic links (M:N). Looked up by owner + title + topic name so the
-- file does not depend on generated ids.
-- -----------------------------------------------------------------------------
INSERT INTO dsa_problem_topics (problem_id, topic_id)
SELECT p.problem_id, t.topic_id
FROM (VALUES
    ('22222222-2222-2222-2222-222222222222', 'Two Sum', 'Arrays'),
    ('22222222-2222-2222-2222-222222222222', 'Two Sum', 'Hashing'),
    ('22222222-2222-2222-2222-222222222222', 'Longest Substring Without Repeating Characters', 'Strings'),
    ('22222222-2222-2222-2222-222222222222', 'Longest Substring Without Repeating Characters', 'Sliding Window'),
    ('22222222-2222-2222-2222-222222222222', 'Longest Substring Without Repeating Characters', 'Hashing'),
    ('22222222-2222-2222-2222-222222222222', 'Minimum Window Substring', 'Strings'),
    ('22222222-2222-2222-2222-222222222222', 'Minimum Window Substring', 'Sliding Window'),
    ('22222222-2222-2222-2222-222222222222', 'Minimum Window Substring', 'Hashing'),
    ('22222222-2222-2222-2222-222222222222', 'Container With Most Water', 'Arrays'),
    ('22222222-2222-2222-2222-222222222222', 'Container With Most Water', 'Two Pointers'),
    ('22222222-2222-2222-2222-222222222222', 'Container With Most Water', 'Greedy'),
    ('22222222-2222-2222-2222-222222222222', '3Sum', 'Arrays'),
    ('22222222-2222-2222-2222-222222222222', '3Sum', 'Two Pointers'),
    ('22222222-2222-2222-2222-222222222222', '3Sum', 'Sorting'),
    ('22222222-2222-2222-2222-222222222222', 'Search in Rotated Sorted Array', 'Arrays'),
    ('22222222-2222-2222-2222-222222222222', 'Search in Rotated Sorted Array', 'Binary Search'),
    ('22222222-2222-2222-2222-222222222222', 'Koko Eating Bananas', 'Binary Search'),
    ('22222222-2222-2222-2222-222222222222', 'Valid Parentheses', 'Stack'),
    ('22222222-2222-2222-2222-222222222222', 'Valid Parentheses', 'Strings'),
    ('22222222-2222-2222-2222-222222222222', 'Daily Temperatures', 'Stack'),
    ('22222222-2222-2222-2222-222222222222', 'Daily Temperatures', 'Arrays'),
    ('22222222-2222-2222-2222-222222222222', 'Largest Rectangle in Histogram', 'Stack'),
    ('22222222-2222-2222-2222-222222222222', 'Largest Rectangle in Histogram', 'Arrays'),
    ('22222222-2222-2222-2222-222222222222', 'Reverse Linked List', 'Linked List'),
    ('22222222-2222-2222-2222-222222222222', 'LRU Cache', 'Linked List'),
    ('22222222-2222-2222-2222-222222222222', 'LRU Cache', 'Hashing'),
    ('22222222-2222-2222-2222-222222222222', 'LRU Cache', 'Design'),
    ('22222222-2222-2222-2222-222222222222', 'Number of Islands', 'Graphs'),
    ('22222222-2222-2222-2222-222222222222', 'Number of Islands', 'DFS'),
    ('22222222-2222-2222-2222-222222222222', 'Number of Islands', 'BFS'),
    ('22222222-2222-2222-2222-222222222222', 'Course Schedule', 'Graphs'),
    ('22222222-2222-2222-2222-222222222222', 'Course Schedule', 'Topological Sort'),
    ('22222222-2222-2222-2222-222222222222', 'Course Schedule', 'BFS'),
    ('22222222-2222-2222-2222-222222222222', 'Rotting Oranges', 'Graphs'),
    ('22222222-2222-2222-2222-222222222222', 'Rotting Oranges', 'BFS'),
    ('22222222-2222-2222-2222-222222222222', 'Coin Change', 'Dynamic Programming'),
    ('22222222-2222-2222-2222-222222222222', 'Longest Increasing Subsequence', 'Dynamic Programming'),
    ('22222222-2222-2222-2222-222222222222', 'Longest Increasing Subsequence', 'Binary Search'),
    ('22222222-2222-2222-2222-222222222222', 'House Robber', 'Dynamic Programming'),
    ('22222222-2222-2222-2222-222222222222', 'Edit Distance', 'Dynamic Programming'),
    ('22222222-2222-2222-2222-222222222222', 'Edit Distance', 'Strings'),
    ('22222222-2222-2222-2222-222222222222', 'Merge Intervals', 'Intervals'),
    ('22222222-2222-2222-2222-222222222222', 'Merge Intervals', 'Sorting'),
    ('22222222-2222-2222-2222-222222222222', 'Kth Largest Element in an Array', 'Heap'),
    ('22222222-2222-2222-2222-222222222222', 'Kth Largest Element in an Array', 'Arrays'),
    ('22222222-2222-2222-2222-222222222222', 'Subsets', 'Backtracking'),
    ('22222222-2222-2222-2222-222222222222', 'Subsets', 'Bit Manipulation'),
    ('22222222-2222-2222-2222-222222222222', 'Redundant Connection', 'Union Find'),
    ('22222222-2222-2222-2222-222222222222', 'Redundant Connection', 'Graphs'),
    ('22222222-2222-2222-2222-222222222222', 'Subarray Sum Equals K', 'Prefix Sum'),
    ('22222222-2222-2222-2222-222222222222', 'Subarray Sum Equals K', 'Hashing'),
    ('22222222-2222-2222-2222-222222222222', 'Same Differences', 'Hashing'),
    ('22222222-2222-2222-2222-222222222222', 'Fraudulent Activity Notifications', 'Sliding Window'),
    ('22222222-2222-2222-2222-222222222222', 'Fraudulent Activity Notifications', 'Sorting'),
    ('11111111-1111-1111-1111-111111111111', 'Two Sum', 'Arrays'),
    ('11111111-1111-1111-1111-111111111111', 'Two Sum', 'Hashing'),
    ('11111111-1111-1111-1111-111111111111', 'Best Time to Buy and Sell Stock', 'Arrays'),
    ('11111111-1111-1111-1111-111111111111', 'Best Time to Buy and Sell Stock', 'Greedy'),
    ('11111111-1111-1111-1111-111111111111', 'Climbing Stairs', 'Dynamic Programming'),
    ('11111111-1111-1111-1111-111111111111', 'Binary Tree Level Order Traversal', 'Trees'),
    ('11111111-1111-1111-1111-111111111111', 'Binary Tree Level Order Traversal', 'BFS'),
    ('11111111-1111-1111-1111-111111111111', 'Maximum Depth of Binary Tree', 'Trees'),
    ('11111111-1111-1111-1111-111111111111', 'Maximum Depth of Binary Tree', 'DFS'),
    ('11111111-1111-1111-1111-111111111111', 'Word Search', 'Backtracking'),
    ('11111111-1111-1111-1111-111111111111', 'Word Search', 'DFS'),
    ('11111111-1111-1111-1111-111111111111', 'Validate Binary Search Tree', 'Trees'),
    ('11111111-1111-1111-1111-111111111111', 'Validate Binary Search Tree', 'DFS')
) AS v(user_id, title, topic)
JOIN dsa_problems p ON p.user_id = v.user_id::uuid AND p.title = v.title
JOIN topics t       ON t.name = v.topic;


-- -----------------------------------------------------------------------------
-- Applications
-- -----------------------------------------------------------------------------
INSERT INTO companies_oa
    (user_id, company_name, role_title, stage, applied_on, event_date, application_link)
VALUES
('22222222-2222-2222-2222-222222222222', 'Google',        'SWE Intern',       'Rejected',        current_date - 60, NULL,               NULL),
('22222222-2222-2222-2222-222222222222', 'Microsoft',     'SWE Intern',       'Technical Round', current_date - 45, current_date + 3,  NULL),
('22222222-2222-2222-2222-222222222222', 'Amazon',        'SDE Intern',       'OA Cleared',      current_date - 30, current_date + 10, NULL),
('22222222-2222-2222-2222-222222222222', 'Atlassian',     'SDE Intern',       'Rejected',        current_date - 40, NULL,               NULL),
('22222222-2222-2222-2222-222222222222', 'Flipkart',      'SDE Intern',       'Offer',           current_date - 70, NULL,               NULL),
('22222222-2222-2222-2222-222222222222', 'Razorpay',      'Backend Intern',   'OA Received',     current_date - 12, current_date + 2,  NULL),
('22222222-2222-2222-2222-222222222222', 'Goldman Sachs', 'Summer Analyst',   'Applied',         current_date - 5,  NULL,               NULL),
('22222222-2222-2222-2222-222222222222', 'Zomato',        'SDE Intern',       'Rejected',        current_date - 50, NULL,               NULL),
('11111111-1111-1111-1111-111111111111', 'Microsoft',     'SWE Intern',       'OA Received',     current_date - 15, current_date + 4,  NULL),
('11111111-1111-1111-1111-111111111111', 'Adobe',         'MTS Intern',       'Applied',         current_date - 7,  NULL,               NULL),
('11111111-1111-1111-1111-111111111111', 'Uber',          'SWE Intern',       'OA Cleared',      current_date - 25, current_date + 6,  NULL);


-- -----------------------------------------------------------------------------
-- Stage history: the path each application took to its current stage.
-- (days_ago, ordered). The last row for each application matches its stage.
-- -----------------------------------------------------------------------------
INSERT INTO oa_stage_history (oa_id, changed_at, stage)
SELECT o.oa_id, (current_date - v.days_ago)::timestamptz + interval '10 hours', v.stage
FROM (VALUES
    ('22222222-2222-2222-2222-222222222222', 'Google',        'Applied',         60),
    ('22222222-2222-2222-2222-222222222222', 'Google',        'OA Received',     52),
    ('22222222-2222-2222-2222-222222222222', 'Google',        'OA Cleared',      45),
    ('22222222-2222-2222-2222-222222222222', 'Google',        'Technical Round', 38),
    ('22222222-2222-2222-2222-222222222222', 'Google',        'Rejected',        33),
    ('22222222-2222-2222-2222-222222222222', 'Microsoft',     'Applied',         45),
    ('22222222-2222-2222-2222-222222222222', 'Microsoft',     'OA Received',     35),
    ('22222222-2222-2222-2222-222222222222', 'Microsoft',     'OA Cleared',      20),
    ('22222222-2222-2222-2222-222222222222', 'Microsoft',     'Technical Round', 6),
    ('22222222-2222-2222-2222-222222222222', 'Amazon',        'Applied',         30),
    ('22222222-2222-2222-2222-222222222222', 'Amazon',        'OA Received',     21),
    ('22222222-2222-2222-2222-222222222222', 'Amazon',        'OA Cleared',      8),
    ('22222222-2222-2222-2222-222222222222', 'Atlassian',     'Applied',         40),
    ('22222222-2222-2222-2222-222222222222', 'Atlassian',     'OA Received',     31),
    ('22222222-2222-2222-2222-222222222222', 'Atlassian',     'Rejected',        24),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',      'Applied',         70),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',      'OA Received',     62),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',      'OA Cleared',      55),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',      'Technical Round', 47),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',      'HR Round',        40),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',      'Offer',           36),
    ('22222222-2222-2222-2222-222222222222', 'Razorpay',      'Applied',         12),
    ('22222222-2222-2222-2222-222222222222', 'Razorpay',      'OA Received',     4),
    ('22222222-2222-2222-2222-222222222222', 'Goldman Sachs', 'Applied',         5),
    ('22222222-2222-2222-2222-222222222222', 'Zomato',        'Applied',         50),
    ('22222222-2222-2222-2222-222222222222', 'Zomato',        'Rejected',        41),
    ('11111111-1111-1111-1111-111111111111', 'Microsoft',     'Applied',         15),
    ('11111111-1111-1111-1111-111111111111', 'Microsoft',     'OA Received',     5),
    ('11111111-1111-1111-1111-111111111111', 'Adobe',         'Applied',         7),
    ('11111111-1111-1111-1111-111111111111', 'Uber',          'Applied',         25),
    ('11111111-1111-1111-1111-111111111111', 'Uber',          'OA Received',     18),
    ('11111111-1111-1111-1111-111111111111', 'Uber',          'OA Cleared',      9)
) AS v(user_id, company, stage, days_ago)
JOIN companies_oa o ON o.user_id = v.user_id::uuid AND o.company_name = v.company;


-- -----------------------------------------------------------------------------
-- Problems asked in each OA (M:N with a relationship attribute)
-- -----------------------------------------------------------------------------
INSERT INTO oa_dsa_tested (oa_id, problem_id, solved_during_oa)
SELECT o.oa_id, p.problem_id, v.solved
FROM (VALUES
    ('22222222-2222-2222-2222-222222222222', 'Google',    'Minimum Window Substring',          false),
    ('22222222-2222-2222-2222-222222222222', 'Google',    'Course Schedule',                   true),
    ('22222222-2222-2222-2222-222222222222', 'Microsoft', 'LRU Cache',                         true),
    ('22222222-2222-2222-2222-222222222222', 'Microsoft', 'Number of Islands',                 true),
    ('22222222-2222-2222-2222-222222222222', 'Amazon',    'Merge Intervals',                   true),
    ('22222222-2222-2222-2222-222222222222', 'Amazon',    'Kth Largest Element in an Array',   true),
    ('22222222-2222-2222-2222-222222222222', 'Atlassian', 'Edit Distance',                     false),
    ('22222222-2222-2222-2222-222222222222', 'Atlassian', 'Coin Change',                       false),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',  '3Sum',                              true),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',  'Daily Temperatures',                true),
    ('22222222-2222-2222-2222-222222222222', 'Flipkart',  'Rotting Oranges',                   true),
    ('11111111-1111-1111-1111-111111111111', 'Uber',      'Word Search',                       false),
    ('11111111-1111-1111-1111-111111111111', 'Uber',      'Binary Tree Level Order Traversal', true)
) AS v(user_id, company, title, solved)
JOIN companies_oa o ON o.user_id = v.user_id::uuid AND o.company_name = v.company
JOIN dsa_problems p ON p.user_id = v.user_id::uuid AND p.title = v.title;


-- -----------------------------------------------------------------------------
-- Tasks in A's to-do list that belong to B's data.
-- 1) A review task for every Re-visit Needed problem (what trg_dsa_revisit_task
--    would have created had it existed when these rows were inserted).
-- 2) Prep tasks for upcoming OA / interview dates.
-- -----------------------------------------------------------------------------
INSERT INTO tasks (user_id, title, category, priority, status, scheduled_date, problem_id)
SELECT p.user_id,
       'Revisit: ' || p.title,
       'DSA', 'P1 - High', 'To Do',
       p.last_revised + 5,
       p.problem_id
FROM dsa_problems p
WHERE p.status = 'Re-visit Needed';

INSERT INTO tasks (user_id, title, category, priority, status, scheduled_date, oa_id)
SELECT o.user_id,
       'Prepare for ' || o.company_name || ' (' || o.stage || ')',
       'Career', 'P1 - High', 'To Do',
       o.event_date - 1,
       o.oa_id
FROM companies_oa o
WHERE o.event_date IS NOT NULL
  AND o.stage NOT IN ('Offer', 'Rejected');
