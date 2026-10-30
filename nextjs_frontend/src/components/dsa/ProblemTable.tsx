"use client";

// Problem list with filters (status, difficulty, platform, topic).
// Owner: Bhooshan Deshpande (Member B)

import { ExternalLink } from "lucide-react";
import { Chip, Pill, formatDate, inputClass } from "./ui";
import { DIFFICULTIES, PLATFORMS, STATUSES, type Problem } from "./types";

export interface ProblemFilters {
  status: string;
  difficulty: string;
  platform: string;
  topic: string;
}

export const NO_FILTERS: ProblemFilters = { status: "", difficulty: "", platform: "", topic: "" };

export default function ProblemTable({ problems, filters, onFilters, topicNames, onOpen }: {
  problems: Problem[];
  filters: ProblemFilters;
  onFilters: (f: ProblemFilters) => void;
  topicNames: string[];
  onOpen: (id: number) => void;
}) {
  const select = (key: keyof ProblemFilters, label: string, options: string[]) => (
    <select className={`${inputClass} w-auto`} value={filters[key]} aria-label={label}
            onChange={(e) => onFilters({ ...filters, [key]: e.target.value })}>
      <option value="">All {label.toLowerCase()}</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {select("status", "Statuses", STATUSES)}
        {select("difficulty", "Difficulties", DIFFICULTIES)}
        {select("platform", "Platforms", PLATFORMS)}
        {select("topic", "Topics", topicNames)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2 pr-3">Problem</th>
              <th className="py-2 pr-3">Difficulty</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Topics</th>
              <th className="py-2 pr-3">Review due</th>
              <th className="py-2">Embedding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {problems.map((p) => (
              <tr key={p.problem_id} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpen(p.problem_id)}>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5 font-medium text-slate-900">
                    {p.title}
                    {p.problem_url && (
                      <a href={p.problem_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                         className="text-slate-400 hover:text-slate-700" aria-label="Open problem">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{p.platform}</div>
                </td>
                <td className="py-2 pr-3"><Pill label={p.difficulty} /></td>
                <td className="py-2 pr-3"><Pill label={p.status} /></td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">{p.topics.map((t) => <Chip key={t} label={t} />)}</div>
                </td>
                <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{p.review_due ? formatDate(p.review_due) : "—"}</td>
                <td className="py-2"><Pill label={p.embedding_state} title="Vector embedding state" /></td>
              </tr>
            ))}
            {problems.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-slate-500">No problems match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
