"use client";

// "Log OA event": one call to sp_log_oa_event, which writes the application
// and every problem link in a single transaction.
// Owner: Bhooshan Deshpande (Member B)

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Notice, buttonClass, errorMessage, inputClass, secondaryButtonClass } from "@/components/dsa/ui";
import type { Problem } from "@/components/dsa/types";
import { STAGES, type OaEventInput, type OaEventResult, type Stage } from "./types";

export default function LogOAForm({ onSaved, onCancel }: { onSaved: (r: OaEventResult) => void; onCancel: () => void }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState<Stage>("OA Received");
  const [eventDate, setEventDate] = useState("");
  const [link, setLink] = useState("");
  const [picked, setPicked] = useState<Record<number, boolean>>({}); // problem_id -> solved
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Problem[]>("/api/dsa/problems").then(setProblems).catch((err) => setError(errorMessage(err)));
  }, []);

  const toggle = (id: number) =>
    setPicked((p) => {
      const next = { ...p };
      if (id in next) delete next[id];
      else next[id] = false;
      return next;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: OaEventInput = {
      company_name: company,
      role_title: role,
      stage,
      event_date: eventDate || null,
      application_link: link || null,
      problems: Object.entries(picked).map(([id, solved]) => ({ problem_id: Number(id), solved })),
    };
    try {
      onSaved(await apiFetch<OaEventResult>("/api/career/oa-event", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const visible = problems.filter((p) => p.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Company</span>
          <input required className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Role</span>
          <input required className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} /></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Stage</span>
          <select className={inputClass} value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGES.map((s) => <option key={s}>{s}</option>)}
          </select></label>
        <label className="block text-sm"><span className="mb-1 block text-slate-600">Event date</span>
          <input type="date" className={inputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
      </div>
      <label className="block text-sm"><span className="mb-1 block text-slate-600">Posting link</span>
        <input type="url" className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" /></label>

      <div className="text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-slate-600">Problems asked ({Object.keys(picked).length} selected)</span>
          <input className={`${inputClass} w-40 py-1 text-xs`} placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
          {visible.map((p) => {
            const selected = p.problem_id in picked;
            return (
              <li key={p.problem_id} className="flex items-center gap-2 px-2 py-1.5">
                <input type="checkbox" checked={selected} onChange={() => toggle(p.problem_id)} aria-label={`Select ${p.title}`} />
                <span className="flex-1">{p.title}</span>
                {selected && (
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" checked={picked[p.problem_id]}
                           onChange={(e) => setPicked((s) => ({ ...s, [p.problem_id]: e.target.checked }))} />
                    solved
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancel</button>
        <button type="submit" className={buttonClass} disabled={saving}>{saving ? "Saving…" : "Log event"}</button>
      </div>
    </form>
  );
}
