// Response types for /api/career (flask_backend/routes/career.py).
// Owner: Bhooshan Deshpande (Member B)

export type Stage =
  | "Applied"
  | "OA Received"
  | "OA Cleared"
  | "Technical Round"
  | "HR Round"
  | "Offer"
  | "Rejected";

// Same order as the oa_stage domain in 02_B_dsa_career_schema.sql.
export const STAGES: Stage[] = [
  "Applied",
  "OA Received",
  "OA Cleared",
  "Technical Round",
  "HR Round",
  "Offer",
  "Rejected",
];

export interface Application {
  oa_id: number;
  company_name: string;
  role_title: string;
  stage: Stage;
  applied_on: string;
  event_date: string | null;
  application_link: string | null;
  created_at: string;
  days_in_stage: number | null;
  problems_tested: number;
}

export interface StageChange {
  stage: Stage;
  changed_at: string;
}

export interface TestedProblem {
  problem_id: number;
  title: string;
  difficulty: string;
  status: string;
  solved_during_oa: boolean;
  topics: string[];
}

export interface ApplicationDetail extends Application {
  history: StageChange[];
  problems: TestedProblem[];
}

export interface OaEventInput {
  company_name: string;
  role_title: string;
  stage: Stage;
  event_date: string | null;
  application_link: string | null;
  problems: { problem_id: number; solved: boolean }[];
}

export interface OaEventResult {
  oa_id: number;
  application: ApplicationDetail;
}

export interface Funnel {
  total_applications: number;
  reached_oa: number;
  cleared_oa: number;
  reached_interview: number;
  offers: number;
  rejections: number;
  active: number;
  oa_clear_rate_pct: number | null;
  interview_to_offer_pct: number | null;
  overall_offer_rate_pct: number | null;
  refreshed_at: string | null;
}
