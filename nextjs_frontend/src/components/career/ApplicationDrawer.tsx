"use client";

// Application side peek, edited in place: company / role / dates / link save
// through PUT, stage through PATCH (the trigger logs history and the funnel
// refreshes). Below the properties: the stage-history timeline and the
// problems the OA tested, with a picker to link more.
// Owner: Bhooshan Deshpande (Member B)

import { AlignLeft, Calendar, CircleDot, FileText, Hash, Link as LinkIcon, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  AutoTextarea, Divider, Notice, PropertyRow, SelectProperty, SidePeek, Tag, buttonClass, dangerButtonClass,
  errorMessage, formatDate, hoverBg, inlineInputClass, inputClass, text,
} from "@/components/dsa/ui";
import type { Problem } from "@/components/dsa/types";
import { STAGES, type ApplicationDetail, type Stage } from "./types";

type Editable = Partial<Pick<ApplicationDetail, "company_name" | "role_title" | "applied_on" | "event_date" | "application_link">>;

export default function ApplicationDrawer({ oaId, onClose, onChanged }: {
  oaId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [draft, setDraft] = useState<Record<keyof Editable, string>>({ company_name: "", role_title: "", applied_on: "", event_date: "", application_link: "" });
  const [problems, setProblems] = useState<Problem[]>([]);
  const [pick, setPick] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: number) => {
    try {
      const d = await apiFetch<ApplicationDetail>(`/api/career/applications/${id}`);
      setDetail(d);
      setDraft({
        company_name: d.company_name, role_title: d.role_title, applied_on: d.applied_on,
        event_date: d.event_date ?? "", application_link: d.application_link ?? "",
      });
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setError(null);
    setPick("");
    if (oaId === null) return;
    void load(oaId);
    apiFetch<Problem[]>("/api/dsa/problems").then(setProblems).catch(() => setProblems([]));
  }, [oaId, load]);

  const run = async (fn: () => Promise<unknown>) => {
    if (oaId === null) return;
    setSaving(true);
    try {
      await fn();
      setError(null);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      await load(oaId);
      setSaving(false);
    }
  };

  const json = (method: string, body: unknown): RequestInit =>
    ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const save = (field: keyof Editable) => {
    if (!detail) return;
    const stored = (detail[field] ?? "") as string;
    if (draft[field] === stored) return;
    void run(() => apiFetch(`/api/career/applications/${oaId}`, json("PUT", { [field]: draft[field] })));
  };

  const changeStage = (stage: Stage) =>
    run(() => apiFetch(`/api/career/applications/${oaId}/stage`, json("PATCH", { stage })));

  const link = (problemId: number, solved: boolean) =>
    run(() => apiFetch(`/api/career/applications/${oaId}/problems`, json("POST", { problem_id: problemId, solved })));

  const unlink = (problemId: number) =>
    run(() => apiFetch(`/api/career/applications/${oaId}/problems/${problemId}`, { method: "DELETE" }));

  const remove = async () => {
    if (!detail || !window.confirm(`Delete the ${detail.company_name} application? Its history and problem links go too.`)) return;
    try {
      await apiFetch(`/api/career/applications/${detail.oa_id}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const linkedIds = new Set(detail?.problems.map((p) => p.problem_id));
  const available = problems.filter((p) => !linkedIds.has(p.problem_id));
  const set = (field: keyof Editable) => (value: string) => setDraft((d) => ({ ...d, [field]: value }));

  return (
    <SidePeek open={oaId !== null} onClose={onClose} header={saving ? "Saving…" : detail ? `Created ${formatDate(detail.created_at)}` : ""}>
      {!detail ? (
        error ? <div className="pt-6"><Notice tone="error">{error}</Notice></div> : <p className={`pt-6 text-sm ${text.tertiary}`}>Loading…</p>
      ) : (
        <div className="pt-6">
          <div className="mb-1 text-[48px] leading-none" aria-hidden>🏢</div>
          <AutoTextarea value={draft.company_name} onChange={(e) => set("company_name")(e.target.value.replace(/\n/g, ""))}
                        onBlur={() => save("company_name")} aria-label="Company"
                        className="mb-4 text-[40px] font-bold leading-tight" />

          <PropertyRow icon={AlignLeft} name="Role">
            <input className={inlineInputClass} value={draft.role_title} onChange={(e) => set("role_title")(e.target.value)} onBlur={() => save("role_title")} />
          </PropertyRow>
          <PropertyRow icon={CircleDot} name="Stage">
            <SelectProperty label="Stage" dot value={detail.stage} options={STAGES} onChange={(v) => void changeStage(v as Stage)} />
          </PropertyRow>
          <PropertyRow icon={Calendar} name="Applied">
            <input type="date" className={`${inlineInputClass} max-w-[180px]`} value={draft.applied_on} onChange={(e) => set("applied_on")(e.target.value)} onBlur={() => save("applied_on")} />
          </PropertyRow>
          <PropertyRow icon={Calendar} name="Next event">
            <input type="date" className={`${inlineInputClass} max-w-[180px]`} value={draft.event_date} onChange={(e) => set("event_date")(e.target.value)} onBlur={() => save("event_date")} />
          </PropertyRow>
          <PropertyRow icon={LinkIcon} name="Posting">
            <input type="url" className={inlineInputClass} value={draft.application_link} placeholder="Empty"
                   onChange={(e) => set("application_link")(e.target.value)} onBlur={() => save("application_link")} />
          </PropertyRow>
          <PropertyRow icon={Hash} name="Days in stage">
            <span className="px-1.5 text-sm tabular-nums">{detail.days_in_stage ?? 0}</span>
          </PropertyRow>

          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          <Divider />

          <h3 className="mb-2 text-lg font-semibold">Stage history</h3>
          <ol className="relative ml-1.5 border-l border-[#E9E9E7] pl-5">
            {detail.history.map((h, i) => (
              <li key={h.changed_at} className="relative pb-4 last:pb-0">
                <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                  i === detail.history.length - 1 ? "bg-[#2383E2]" : "bg-[#D3D1CB]"}`} />
                <Tag label={h.stage} dot />
                <div className={`mt-0.5 text-xs ${text.tertiary}`}>{new Date(h.changed_at).toLocaleString()}</div>
              </li>
            ))}
          </ol>

          <h3 className="mb-1 mt-8 text-lg font-semibold">Problems tested</h3>
          {detail.problems.length === 0 && <p className={`mb-2 text-sm ${text.tertiary}`}>No problems linked yet.</p>}
          {detail.problems.map((p) => (
            <div key={p.problem_id} className={`group flex items-center gap-2 rounded-[4px] px-1.5 py-1 text-sm ${hoverBg}`}>
              <FileText size={15} className={text.tertiary} />
              <span className="font-medium">{p.title}</span>
              <Tag label={p.difficulty} />
              <span className="ml-auto flex items-center gap-1">
                <button onClick={() => void link(p.problem_id, !p.solved_during_oa)} title="Toggle solved during the OA">
                  <Tag label={p.solved_during_oa ? "Solved in OA" : "Not solved"} color={p.solved_during_oa ? "green" : "red"} />
                </button>
                <button aria-label="Unlink" onClick={() => void unlink(p.problem_id)}
                        className={`rounded p-0.5 opacity-0 group-hover:opacity-100 ${text.tertiary} hover:text-[#EB5757]`}>
                  <X size={14} />
                </button>
              </span>
            </div>
          ))}
          {available.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <select className={`${inputClass} flex-1`} value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Problem to link">
                <option value="">Link a problem…</option>
                {available.map((p) => <option key={p.problem_id} value={p.problem_id}>{p.title}</option>)}
              </select>
              <button className={buttonClass} disabled={!pick} onClick={() => { void link(Number(pick), false); setPick(""); }}>
                <Plus size={14} /> Link
              </button>
            </div>
          )}

          <Divider />
          <button className={dangerButtonClass} onClick={() => void remove()}><Trash2 size={14} /> Delete application</button>
        </div>
      )}
    </SidePeek>
  );
}
