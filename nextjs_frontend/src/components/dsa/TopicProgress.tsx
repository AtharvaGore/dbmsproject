// Per-topic progress from v_topic_progress.
// Owner: Bhooshan Deshpande (Member B)

import type { TopicProgress as Row } from "./types";

export default function TopicProgress({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">Tag problems with topics to see progress.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-3">Topic</th>
            <th className="py-2 pr-3">Progress</th>
            <th className="py-2 pr-3 text-right">Problems</th>
            <th className="py-2 pr-3 text-right">Mastered</th>
            <th className="py-2 pr-3 text-right">To revisit</th>
            <th className="py-2 text-right">Failed in OA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const pct = (n: number) => `${r.problems ? (100 * n) / r.problems : 0}%`;
            return (
              <tr key={r.topic_id}>
                <td className="py-2 pr-3 font-medium text-slate-900">{r.topic}</td>
                <td className="py-2 pr-3">
                  <div className="flex h-2 w-40 overflow-hidden rounded bg-slate-100" title={`${r.mastered} mastered, ${r.solved} solved, ${r.revisit_needed} to revisit`}>
                    <div className="bg-emerald-500" style={{ width: pct(r.mastered) }} />
                    <div className="bg-sky-400" style={{ width: pct(r.solved) }} />
                    <div className="bg-amber-400" style={{ width: pct(r.revisit_needed) }} />
                  </div>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.problems}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.mastered}</td>
                <td className={`py-2 pr-3 text-right tabular-nums ${r.revisit_needed ? "font-semibold text-amber-700" : ""}`}>{r.revisit_needed}</td>
                <td className="py-2 text-right tabular-nums">{r.failed_in_oa}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
