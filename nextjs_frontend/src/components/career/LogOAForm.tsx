"use client";

// "Log OA event" as a new Notion page: company as the title, properties,
// then a to-do style checklist of the problems that were asked. Submitting
// makes one call to sp_log_oa_event, which writes the application and every
// problem link in a single transaction (all or nothing).
// Owner: Bhooshan Deshpande (Member B)

import { AlignLeft, Calendar, CircleDot, Link as LinkIcon, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import {
  AutoTextarea, Divider, Notice, PropertyRow, SelectProperty, Tag, border, buttonClass, errorMessage,
  ghostButtonClass, hoverBg, inlineInputClass, text,
} from "@/components/dsa/ui";
import type { Problem } from "@/components/dsa/types";
import { STAGES, type OaEventInput, type OaEventResult, type Stage } from "./types";

export default function LogOAForm({ onSaved, onCancel }: { onSaved: (r: OaEventResult) => void; onCancel: () => void }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState<Stage>("OA Received");
  const [eventDate, setEventDate] = useState("");
  const [link, setLink] = useState("");
  const [picked, setPicked] = useState<Record<number, boolean>>({}); // problem_id -> solved during the OA
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
  const count = Object.keys(picked).length;

  return (
    <form onSubmit={submit} className="pt-6">
      <div className="mb-1 text-[48px] leading-none" aria-hidden>🏢</div>
      <AutoTextarea autoFocus required value={company} placeholder="Company"
                    onChange={(e) => setCompany(e.target.value.replace(/\n/g, ""))}
                    className="mb-4 text-[40px] font-bold leading-tight" />
      <PropertyRow icon={AlignLeft} name="Role">
        <input required className={inlineInputClass} value={role} placeholder="e.g. SDE Intern" onChange={(e) => setRole(e.target.value)} />
      </PropertyRow>
      <PropertyRow icon={CircleDot} name="Stage">
        <SelectProperty label="Stage" dot value={stage} options={STAGES} onChange={(v) => setStage(v as Stage)} />
      </PropertyRow>
      <PropertyRow icon={Calendar} name="Event date">
        <input type="date" className={inlineInputClass} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </PropertyRow>
      <PropertyRow icon={LinkIcon} name="Posting">
        <input type="url" className={inlineInputClass} value={link} placeholder="Empty" onChange={(e) => setLink(e.target.value)} />
      </PropertyRow>

      <Divider />
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Problems asked {count > 0 && <span className={`text-sm font-normal ${text.tertiary}`}>· {count}</span>}</h3>
        <label className={`flex items-center gap-1 rounded-[4px] px-1.5 ${hoverBg}`}>
          <Search size={14} className={text.tertiary} />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…"
                 className="h-7 w-32 bg-transparent text-sm placeholder:text-[#9B9A97] focus:outline-none" />
        </label>
      </div>
      <div className={`max-h-72 overflow-y-auto rounded-[4px] border ${border} p-1`}>
        {visible.map((p) => {
          const selected = p.problem_id in picked;
          return (
            <div key={p.problem_id} className={`flex items-center gap-2 rounded-[3px] px-1.5 py-1 ${hoverBg}`}>
              <input type="checkbox" checked={selected} onChange={() => toggle(p.problem_id)} aria-label={`Asked: ${p.title}`}
                     className="h-4 w-4 accent-[#2383E2]" />
              <span className={`flex-1 text-sm ${selected ? "" : text.secondary}`}>{p.title}</span>
              <Tag label={p.difficulty} />
              {selected && (
                <button type="button" onClick={() => setPicked((s) => ({ ...s, [p.problem_id]: !s[p.problem_id] }))}>
                  <Tag label={picked[p.problem_id] ? "Solved" : "Not solved"} color={picked[p.problem_id] ? "green" : "red"} />
                </button>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className={`px-1.5 py-2 text-sm ${text.tertiary}`}>No problems match.</p>}
      </div>

      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      <div className="mt-6 flex justify-end gap-1">
        <button type="button" className={ghostButtonClass} onClick={onCancel}>Cancel</button>
        <button type="submit" className={buttonClass} disabled={saving || !company.trim() || !role.trim()}>
          {saving ? "Saving…" : "Log event"}
        </button>
      </div>
    </form>
  );
}
