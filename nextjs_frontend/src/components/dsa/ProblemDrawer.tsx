"use client";

// Problem detail: notes, review task, OAs it appeared in, similar problems,
// edit, status change, delete embedding, delete problem.
// Owner: Bhooshan Deshpande (Member B)

import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import ProblemForm from "./ProblemForm";
import { Chip, Drawer, Notice, Pill, errorMessage, formatDate, inputClass, secondaryButtonClass } from "./ui";
import { STATUSES, type ProblemDetail, type ProblemStatus } from "./types";

export default function ProblemDrawer({ problemId, topicNames, onClose, onChanged, onOpen }: {
  problemId: number | null;
  topicNames: string[];
  onClose: () => void;
  onChanged: () => void;
  onOpen: (id: number) => void;
}) {
  const [detail, setDetail] = useState<ProblemDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (id: number) => {
    try {
      setDetail(await apiFetch<ProblemDetail>(`/api/dsa/problems/${id}`));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setEditing(false);
    setNotice(null);
    if (problemId !== null) void load(problemId);
  }, [problemId, load]);

  const act = async (fn: () => Promise<unknown>, message?: string) => {
    try {
      await fn();
      setNotice(message ?? null);
      onChanged();
      if (problemId !== null) await load(problemId);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const changeStatus = (status: ProblemStatus) =>
    act(() => apiFetch(`/api/dsa/problems/${problemId}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    }), status === "Re-visit Needed" ? "Review task scheduled by the database trigger." : undefined);

  const deleteEmbedding = () =>
    act(() => apiFetch(`/api/dsa/problems/${problemId}/embedding`, { method: "DELETE" }),
        "Embedding deleted. Saving the problem again (or Refresh embeddings) re-creates it.");

  const deleteProblem = async () => {
    if (!detail || !window.confirm(`Delete "${detail.title}"? Its OA links and embedding go too.`)) return;
    try {
      await apiFetch(`/api/dsa/problems/${detail.problem_id}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Drawer open={problemId !== null} title={detail?.title ?? "Problem"} onClose={onClose}>
      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice>{notice}</Notice>}
      {!detail ? (
        !error && <p className="text-sm text-slate-500">Loading…</p>
      ) : editing ? (
        <ProblemForm initial={detail} topicNames={topicNames} onCancel={() => setEditing(false)}
                     onSaved={(p) => { setEditing(false); setNotice(p.warning ?? null); onChanged(); void load(p.problem_id); }} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={detail.difficulty} />
            <span className="text-sm text-slate-500">{detail.platform}</span>
            <Pill label={detail.embedding_state} title="Vector embedding state" />
            <select className={`${inputClass} ml-auto w-auto`} value={detail.status} aria-label="Status"
                    onChange={(e) => void changeStatus(e.target.value as ProblemStatus)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-1">{detail.topics.map((t) => <Chip key={t} label={t} />)}</div>
          {detail.intuition_notes && (
            <p className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{detail.intuition_notes}</p>
          )}
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">Last revised</dt><dd>{formatDate(detail.last_revised)}</dd>
            <dt className="text-slate-500">Review task</dt>
            <dd>{detail.review_task ? `${detail.review_task.status} · ${formatDate(detail.review_task.scheduled_date)}` : "—"}</dd>
          </dl>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-slate-800">Asked in OAs</h3>
            {detail.applications.length === 0 ? (
              <p className="text-sm text-slate-500">Not linked to any application.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {detail.applications.map((a) => (
                  <li key={a.oa_id} className="flex items-center gap-2">
                    <span className="font-medium">{a.company_name}</span>
                    <span className="text-slate-500">{a.role_title}</span>
                    <Pill label={a.stage} />
                    <span className="ml-auto text-xs">{a.solved_during_oa ? "solved in OA" : "not solved in OA"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Sparkles size={14} /> Similar problems
            </h3>
            {detail.similar.length === 0 ? (
              <p className="text-sm text-slate-500">No embedding yet, so no neighbours.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {detail.similar.map((s) => (
                  <li key={s.problem_id} className="flex cursor-pointer items-center gap-2 py-1.5 hover:bg-slate-50" onClick={() => onOpen(s.problem_id)}>
                    <span>{s.title}</span>
                    <Pill label={s.difficulty} />
                    <span className="ml-auto text-xs tabular-nums text-violet-700">{Math.round(s.similarity * 100)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button className={secondaryButtonClass} onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
            <button className={secondaryButtonClass} onClick={() => void deleteEmbedding()} disabled={detail.embedding_state === "Missing"}>
              <Sparkles size={14} /> Delete embedding
            </button>
            <button className={`${secondaryButtonClass} ml-auto text-rose-700`} onClick={() => void deleteProblem()}>
              <Trash2 size={14} /> Delete problem
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}
