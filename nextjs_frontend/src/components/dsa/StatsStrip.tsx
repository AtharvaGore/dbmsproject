// Totals by status (GROUP BY) and the weak-topics callout (GROUP BY / HAVING),
// from /api/dsa/stats.
// Owner: Bhooshan Deshpande (Member B)

import { Callout, StatBlocks, Tag } from "./ui";
import type { DsaStats } from "./types";

export default function StatsStrip({ stats }: { stats: DsaStats | null }) {
  if (!stats) return null;
  return (
    <div className="space-y-3">
      <StatBlocks items={[
        { label: "Problems", value: stats.total },
        { label: "Solved", value: stats.by_status.Solved ?? 0 },
        { label: "Re-visit needed", value: stats.by_status["Re-visit Needed"] ?? 0 },
        { label: "Mastered", value: stats.by_status.Mastered ?? 0 },
        { label: "Hard", value: stats.by_difficulty.Hard ?? 0 },
        { label: "Never asked in an OA", value: stats.never_in_oa.length, hint: "Problems with no OA link (NOT EXISTS)" },
      ]} />
      {stats.weak_topics.length > 0 && (
        <Callout icon="🎯" tone="yellow">
          <span className="font-semibold">Weak topics.</span>{" "}
          These have three or more problems still marked Re-visit Needed:
          <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
            {stats.weak_topics.map((w) => <Tag key={w.topic} label={`${w.topic} · ${w.revisit_needed}`} />)}
          </span>
        </Callout>
      )}
    </div>
  );
}
