// Response types for /api/dsa (flask_backend/routes/dsa.py).
// Owner: Bhooshan Deshpande (Member B)

export type ProblemStatus = "Solved" | "Re-visit Needed" | "Mastered";
export type Difficulty = "Easy" | "Medium" | "Hard";
export type Platform = "LeetCode" | "Codeforces" | "HackerRank" | "Other";
export type EmbeddingState = "Current" | "Stale" | "Missing";

export const STATUSES: ProblemStatus[] = ["Solved", "Re-visit Needed", "Mastered"];
export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
export const PLATFORMS: Platform[] = ["LeetCode", "Codeforces", "HackerRank", "Other"];

export interface ReviewTask {
  task_id: number;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
}

export interface Problem {
  problem_id: number;
  title: string;
  platform: Platform;
  difficulty: Difficulty;
  status: ProblemStatus;
  problem_url: string | null;
  intuition_notes: string | null;
  last_revised: string | null;
  created_at: string;
  topics: string[];
  embedding_state: EmbeddingState;
  review_due: string | null;
  warning?: string;
}

export interface SimilarProblem {
  problem_id: number;
  title: string;
  difficulty: Difficulty;
  status: ProblemStatus;
  similarity: number;
}

export interface ProblemApplication {
  oa_id: number;
  company_name: string;
  role_title: string;
  stage: string;
  solved_during_oa: boolean;
}

export interface ProblemDetail extends Problem {
  applications: ProblemApplication[];
  similar: SimilarProblem[];
  review_task: ReviewTask | null;
}

export interface ProblemInput {
  title: string;
  platform: Platform;
  difficulty: Difficulty;
  status: ProblemStatus;
  problem_url: string;
  intuition_notes: string;
  topics: string[];
}

export interface FtsResult {
  problem_id: number;
  title: string;
  platform: Platform;
  difficulty: Difficulty;
  status: ProblemStatus;
  rank: number;
  snippet: string; // contains <mark>...</mark>
}

export interface VectorResult {
  problem_id: number;
  title: string;
  platform: Platform;
  difficulty: Difficulty;
  status: ProblemStatus;
  similarity: number;
}

export interface Topic {
  topic_id: number;
  name: string;
}

export interface TopicProgress {
  topic_id: number;
  topic: string;
  problems: number;
  mastered: number;
  solved: number;
  revisit_needed: number;
  times_in_oa: number;
  failed_in_oa: number;
}

export interface DsaStats {
  total: number;
  by_status: Partial<Record<ProblemStatus, number>>;
  by_difficulty: Partial<Record<Difficulty, number>>;
  weak_topics: { topic: string; revisit_needed: number }[];
  never_in_oa: { problem_id: number; title: string; difficulty: Difficulty; status: ProblemStatus }[];
}

export interface RefreshResult {
  processed: number;
  inserted: number;
  updated: number;
  unchanged: number;
}
