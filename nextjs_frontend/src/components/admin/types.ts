// Response types for /api/admin (flask_backend/routes/admin.py).
// Owner: Bhooshan Deshpande (Member B)

import type { Funnel } from "@/components/career/types";

export interface AdminUser {
  user_id: string;
  email: string;
  role: "Student" | "Admin";
  leetcode_username: string | null;
  // Other profile columns from Atharva's users table pass through as-is.
  [column: string]: unknown;
  funnel: Funnel | null;
  dsa: { problems: number; solved: number; revisit_needed: number; mastered: number };
}

export interface AdminOverview {
  users: number;
  students: number;
  problems: number;
  applications: number;
  offers: number;
  funnel_refreshed_at: string | null;
  embeddings: { Current: number; Stale: number; Missing: number };
}

export interface RefreshFunnelResult {
  refreshed_at: string | null;
}
