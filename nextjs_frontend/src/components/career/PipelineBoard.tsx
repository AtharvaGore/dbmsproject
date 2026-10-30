"use client";

// Applications grouped by current stage; stage changes through a dropdown.
// Owner: Bhooshan Deshpande (Member B)

import { CalendarDays } from "lucide-react";
import { formatDate, inputClass } from "@/components/dsa/ui";
import { STAGES, type Application, type Stage } from "./types";

export default function PipelineBoard({ applications, onOpen, onStage }: {
  applications: Application[];
  onOpen: (id: number) => void;
  onStage: (id: number, stage: Stage) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((stage) => {
        const items = applications.filter((a) => a.stage === stage);
        return (
          <div key={stage} className="w-60 shrink-0 rounded-lg bg-slate-100 p-2">
            <h3 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase text-slate-600">
              {stage} <span className="tabular-nums">{items.length}</span>
            </h3>
            <div className="space-y-2">
              {items.map((a) => (
                <div key={a.oa_id} className="rounded-md border border-slate-200 bg-white p-2.5 shadow-sm">
                  <button className="block w-full text-left" onClick={() => onOpen(a.oa_id)}>
                    <div className="font-medium text-slate-900">{a.company_name}</div>
                    <div className="text-xs text-slate-500">{a.role_title}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      {a.event_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{formatDate(a.event_date)}</span>}
                      <span>{a.days_in_stage ?? 0}d in stage</span>
                      {a.problems_tested > 0 && <span>{a.problems_tested} problems</span>}
                    </div>
                  </button>
                  <select className={`${inputClass} mt-2 py-1 text-xs`} value={a.stage} aria-label="Move to stage"
                          onChange={(e) => onStage(a.oa_id, e.target.value as Stage)}>
                    {STAGES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
