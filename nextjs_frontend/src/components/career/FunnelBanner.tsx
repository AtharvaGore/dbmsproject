// Placement funnel from v_my_oa_funnel (materialized view, highest stage reached).
// Owner: Bhooshan Deshpande (Member B)

import { ChevronRight } from "lucide-react";
import { formatDate } from "@/components/dsa/ui";
import type { Funnel } from "./types";

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "—");

export default function FunnelBanner({ funnel }: { funnel: Funnel | null }) {
  if (!funnel) return null;
  const steps = [
    { label: "Applied", value: funnel.total_applications },
    { label: "OA", value: funnel.reached_oa },
    { label: "OA cleared", value: funnel.cleared_oa },
    { label: "Interview", value: funnel.reached_interview },
    { label: "Offer", value: funnel.offers },
  ];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-stretch gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1">
            {i > 0 && (
              <div className="flex flex-col items-center px-1 text-xs text-slate-400">
                <ChevronRight size={16} />
                <span className="tabular-nums">{pct(s.value, steps[i - 1].value)}</span>
              </div>
            )}
            <div className="min-w-[6rem] rounded-md bg-slate-50 px-3 py-2 text-center">
              <div className="text-2xl font-semibold tabular-nums text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>Active: <b className="text-slate-700">{funnel.active}</b></span>
        <span>Rejected: <b className="text-slate-700">{funnel.rejections}</b></span>
        <span>Overall offer rate: <b className="text-slate-700">{funnel.overall_offer_rate_pct ?? "—"}%</b></span>
        <span className="ml-auto">Refreshed {formatDate(funnel.refreshed_at)}</span>
      </div>
    </div>
  );
}
