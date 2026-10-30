// Totals by status and the weak topics (GROUP BY / HAVING) from /api/dsa/stats.
// Owner: Bhooshan Deshpande (Member B)

import { AlertTriangle } from "lucide-react";
import type { DsaStats } from "./types";

export default function StatsStrip({ stats }: { stats: DsaStats | null }) {
  if (!stats) return null;
  const tiles = [
    { label: "Total", value: stats.total },
    { label: "Solved", value: stats.by_status.Solved ?? 0 },
    { label: "Re-visit Needed", value: stats.by_status["Re-visit Needed"] ?? 0 },
    { label: "Mastered", value: stats.by_status.Mastered ?? 0 },
    { label: "Never asked in an OA", value: stats.never_in_oa.length },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="text-2xl font-semibold tabular-nums text-slate-900">{t.value}</div>
          </div>
        ))}
      </div>
      {stats.weak_topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle size={16} />
          <span className="font-medium">Weak topics:</span>
          {stats.weak_topics.map((w) => (
            <span key={w.topic} className="rounded bg-white/70 px-1.5 py-0.5">
              {w.topic} ({w.revisit_needed} to revisit)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
