"use client";

// Add / edit a problem. Database CHECK constraints are the real validation;
// their messages come back from the API and are shown as-is.
// Owner: Bhooshan Deshpande (Member B)

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import TagInput from "./TagInput";
import { Notice, buttonClass, errorMessage, inputClass, secondaryButtonClass } from "./ui";
import { DIFFICULTIES, PLATFORMS, STATUSES, type Problem, type ProblemInput } from "./types";

const EMPTY: ProblemInput = {
  title: "",
  platform: "LeetCode",
  difficulty: "Medium",
  status: "Solved",
  problem_url: "",
  intuition_notes: "",
  topics: [],
};

export default function ProblemForm({ initial, topicNames, onSaved, onCancel }: {
  initial?: Problem | null;
  topicNames: string[];
  onSaved: (p: Problem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProblemInput>(
    initial
      ? {
          title: initial.title,
          platform: initial.platform,
          difficulty: initial.difficulty,
          status: initial.status,
          problem_url: initial.problem_url ?? "",
          intuition_notes: initial.intuition_notes ?? "",
          topics: initial.topics,
        }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProblemInput>(key: K, value: ProblemInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await apiFetch<Problem>(
        initial ? `/api/dsa/problems/${initial.problem_id}` : "/api/dsa/problems",
        { method: initial ? "PUT" : "POST", body: JSON.stringify(form), headers: { "Content-Type": "application/json" } },
      );
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Title</span>
        <input required className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Platform</span>
          <select className={inputClass} value={form.platform} onChange={(e) => set("platform", e.target.value as ProblemInput["platform"])}>
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Difficulty</span>
          <select className={inputClass} value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as ProblemInput["difficulty"])}>
            {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Status</span>
          <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value as ProblemInput["status"])}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Problem URL</span>
        <input type="url" className={inputClass} value={form.problem_url} placeholder="https://leetcode.com/problems/…"
               onChange={(e) => set("problem_url", e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Topics</span>
        <TagInput value={form.topics} onChange={(t) => set("topics", t)} suggestions={topicNames} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-slate-600">Intuition notes (these are what semantic search reads)</span>
        <textarea rows={5} className={inputClass} value={form.intuition_notes}
                  onChange={(e) => set("intuition_notes", e.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className={secondaryButtonClass} onClick={onCancel}>Cancel</button>
        <button type="submit" className={buttonClass} disabled={saving}>{saving ? "Saving…" : initial ? "Save changes" : "Add problem"}</button>
      </div>
    </form>
  );
}
