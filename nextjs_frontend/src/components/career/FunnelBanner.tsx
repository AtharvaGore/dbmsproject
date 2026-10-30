// Placement funnel from v_my_oa_funnel (materialized view; counts the highest
// stage each application ever reached, so rejections still count).
// Owner: Bhooshan Deshpande (Member B)

import { ChevronRight } from "lucide-react";
import { border, formatDate, text } from "@/components/dsa/ui";
import type { Funnel } from "./types";

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "—");

export default function FunnelBanner({ funnel }: { funnel: Funnel | null }) {
  if (!funnel) return null;
  const steps = [
    { label: "Applied", value: funnel.total_applications },
    { label: "Got an OA", value: funnel.reached_oa },
    { label: "Cleared OA", value: funnel.cleared_oa },
    { label: "Interview", value: funnel.reached_interview },
    { label: "Offer", value: funnel.offers },
  ];
  return (
    <section>
      <div className="flex flex-wrap items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`flex w-12 flex-col items-center text-[11px] ${text.tertiary}`}>
                <span className="tabular-nums">{pct(s.value, steps[i - 1].value)}</span>
                <ChevronRight size={14} />
              </div>
            )}
            <div className={`min-w-[104px] rounded-[4px] border ${border} px-3 py-2.5`}>
              <div className={`text-xs ${text.secondary}`}>{s.label}</div>
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${text.secondary}`}>
        <span>Active <b className={text.primary}>{funnel.active}</b></span>
        <span>Rejected <b className={text.primary}>{funnel.rejections}</b></span>
        <span>Overall offer rate <b className={text.primary}>{funnel.overall_offer_rate_pct ?? "—"}%</b></span>
        {funnel.refreshed_at && <span className={`ml-auto ${text.tertiary}`}>Funnel refreshed {formatDate(funnel.refreshed_at)}</span>}
      </div>
    </section>
  );
}
