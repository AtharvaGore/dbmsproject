"use client";

// Application detail: stage-history timeline (written by a trigger) and the
// problems the OA tested.
// Owner: Bhooshan Deshpande (Member B)

import { ExternalLink, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Chip, Drawer, Notice, Pill, errorMessage, formatDate, secondaryButtonClass } from "@/components/dsa/ui";
import type { ApplicationDetail } from "./types";

export default function ApplicationDrawer({ oaId, onClose, onChanged }: {
  oaId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: number) => {
    try {
      setDetail(await apiFetch<ApplicationDetail>(`/api/career/applications/${id}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    if (oaId !== null) void load(oaId);
  }, [oaId, load]);

  const unlink = async (problemId: number) => {
    try {
      await apiFetch(`/api/career/applications/${oaId}/problems/${problemId}`, { method: "DELETE" });
      onChanged();
      if (oaId !== null) await load(oaId);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!detail || !window.confirm(`Delete the ${detail.company_name} application?`)) return;
    try {
      await apiFetch(`/api/career/applications/${detail.oa_id}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Drawer open={oaId !== null} title={detail ? `${detail.company_name} · ${detail.role_title}` : "Application"} onClose={onClose}>
      {error && <Notice tone="error">{error}</Notice>}
      {!detail ? (
        !error && <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Pill label={detail.stage} />
            <span className="text-slate-500">Applied {formatDate(detail.applied_on)}</span>
            {detail.event_date && <span className="text-slate-500">Next event {formatDate(detail.event_date)}</span>}
            {detail.application_link && (
              <a href={detail.application_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline">
                Posting <ExternalLink size={12} />
              </a>
            )}
          </div>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Stage history</h3>
            <ol className="relative ml-2 border-l border-slate-200">
              {detail.history.map((h) => (
                <li key={h.changed_at} className="mb-3 ml-4">
                  <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
                  <div className="text-sm font-medium text-slate-900">{h.stage}</div>
                  <div className="text-xs text-slate-500">{new Date(h.changed_at).toLocaleString()}</div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Problems tested</h3>
            {detail.problems.length === 0 ? (
              <p className="text-sm text-slate-500">No problems linked.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {detail.problems.map((p) => (
                  <li key={p.problem_id} className="flex flex-wrap items-center gap-2 py-1.5">
                    <span className="font-medium">{p.title}</span>
                    <Pill label={p.difficulty} />
                    {p.topics.map((t) => <Chip key={t} label={t} />)}
                    <span className={`ml-auto text-xs ${p.solved_during_oa ? "text-emerald-700" : "text-rose-700"}`}>
                      {p.solved_during_oa ? "solved" : "not solved"}
                    </span>
                    <button aria-label="Unlink" className="text-slate-400 hover:text-rose-600" onClick={() => void unlink(p.problem_id)}>
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="border-t border-slate-200 pt-4">
            <button className={`${secondaryButtonClass} text-rose-700`} onClick={() => void remove()}>
              <Trash2 size={14} /> Delete application
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}
