"use client";

// New problem, laid out like a fresh Notion page in the side peek:
// "Untitled" title, property rows, then the notes as the page body.
// Database CHECK constraints do the real validation; their messages are shown as-is.
// Owner: Bhooshan Deshpande (Member B)

import { CircleChevronDown, CircleDot, Link, List } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import TagInput from "./TagInput";
import {
  AutoTextarea, Divider, Notice, PropertyRow, SelectProperty, buttonClass, errorMessage,
  ghostButtonClass, inlineInputClass,
} from "./ui";
import { DIFFICULTIES, PLATFORMS, STATUSES, type Problem, type ProblemInput, type ProblemStatus } from "./types";

export default function ProblemForm({ topicNames, initialStatus, onSaved, onCancel }: {
  topicNames: string[];
  initialStatus?: ProblemStatus;
  onSaved: (p: Problem) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ProblemInput>({
    title: "",
    platform: "LeetCode",
    difficulty: "Medium",
    status: initialStatus ?? "Solved",
    problem_url: "",
    intuition_notes: "",
    topics: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ProblemInput>(key: K, value: ProblemInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await apiFetch<Problem>("/api/dsa/problems", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="pt-6">
      <AutoTextarea autoFocus required value={form.title} placeholder="Untitled"
                    onChange={(e) => set("title", e.target.value.replace(/\n/g, ""))}
                    className="mb-4 text-[40px] font-bold leading-tight" />
      <PropertyRow icon={CircleDot} name="Status">
        <SelectProperty label="Status" dot value={form.status} options={STATUSES} onChange={(v) => set("status", v as ProblemStatus)} />
      </PropertyRow>
      <PropertyRow icon={CircleChevronDown} name="Difficulty">
        <SelectProperty label="Difficulty" value={form.difficulty} options={DIFFICULTIES} onChange={(v) => set("difficulty", v as ProblemInput["difficulty"])} />
      </PropertyRow>
      <PropertyRow icon={CircleChevronDown} name="Platform">
        <SelectProperty label="Platform" value={form.platform} options={PLATFORMS} onChange={(v) => set("platform", v as ProblemInput["platform"])} />
      </PropertyRow>
      <PropertyRow icon={List} name="Topics">
        <TagInput value={form.topics} onChange={(t) => set("topics", t)} suggestions={topicNames} />
      </PropertyRow>
      <PropertyRow icon={Link} name="URL">
        <input type="url" className={inlineInputClass} value={form.problem_url} placeholder="Empty"
               onChange={(e) => set("problem_url", e.target.value)} />
      </PropertyRow>
      <Divider />
      <AutoTextarea value={form.intuition_notes} onChange={(e) => set("intuition_notes", e.target.value)}
                    placeholder="Write your intuition… (semantic search reads this)"
                    className="min-h-[120px] text-base leading-7" />
      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
      <div className="mt-6 flex justify-end gap-1">
        <button type="button" className={ghostButtonClass} onClick={onCancel}>Cancel</button>
        <button type="submit" className={buttonClass} disabled={saving || !form.title.trim()}>{saving ? "Creating…" : "Create"}</button>
      </div>
    </form>
  );
}
