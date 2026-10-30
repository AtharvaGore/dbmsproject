"use client";

// The four views of the Problems database: Table, Board, Gallery, List.
// All views get the already filtered + sorted rows from ProblemsDatabase.
// Owner: Bhooshan Deshpande (Member B)

import { Calendar, CircleChevronDown, CircleDot, FileText, List, Sparkles } from "lucide-react";
import { useState, type DragEvent } from "react";
import {
  AddRow, COLUMN_BG, Tag, Td, Th, TitleIcon, border, formatDate, hoverBg, tagColor, text,
} from "./ui";
import { STATUSES, type Problem, type ProblemStatus } from "./types";

export interface ViewProps {
  problems: Problem[];
  onOpen: (id: number) => void;
  onNew: (status?: ProblemStatus) => void;
}

function Topics({ topics, max = 3, wrap = true }: { topics: string[]; max?: number; wrap?: boolean }) {
  return (
    <span className={`flex gap-1 ${wrap ? "flex-wrap" : "flex-nowrap overflow-hidden"}`}>
      {topics.slice(0, max).map((t) => <Tag key={t} label={t} />)}
      {topics.length > max && <span className={`text-xs ${text.tertiary}`}>+{topics.length - max}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function TableView({ problems, onOpen, onNew }: ViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-[860px] border-collapse border-b ${border}`}>
        <thead className={`border-b ${border}`}>
          <tr>
            <Th icon={TitleIcon} className="w-[28%]">Name</Th>
            <Th icon={CircleDot}>Status</Th>
            <Th icon={CircleChevronDown}>Difficulty</Th>
            <Th icon={List}>Topics</Th>
            <Th icon={CircleChevronDown}>Platform</Th>
            <Th icon={Calendar}>Review due</Th>
            <Th icon={Sparkles}>Embedding</Th>
          </tr>
        </thead>
        <tbody>
          {problems.map((p) => (
            <tr key={p.problem_id} className={`group border-b ${border} ${hoverBg}`}>
              <Td>
                <div className="flex items-center gap-2">
                  <button onClick={() => onOpen(p.problem_id)} className="truncate text-left font-medium underline-offset-2 hover:underline">
                    {p.title}
                  </button>
                  <button onClick={() => onOpen(p.problem_id)}
                          className={`ml-auto hidden shrink-0 rounded-[4px] border ${border} bg-white px-1.5 text-[11px] font-medium uppercase tracking-wide ${text.secondary} shadow-sm group-hover:inline`}>
                    Open
                  </button>
                </div>
              </Td>
              <Td><Tag label={p.status} dot /></Td>
              <Td><Tag label={p.difficulty} /></Td>
              <Td><Topics topics={p.topics} max={2} wrap={false} /></Td>
              <Td><Tag label={p.platform} /></Td>
              <Td className={`whitespace-nowrap ${text.secondary}`}>{formatDate(p.review_due)}</Td>
              <Td><Tag label={p.embedding_state} title="Vector embedding state" /></Td>
            </tr>
          ))}
        </tbody>
      </table>
      <AddRow onClick={() => onNew()} />
      <div className={`px-2 text-xs ${text.tertiary}`}>COUNT <span className={text.secondary}>{problems.length}</span></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board (grouped by status, drag a card to change it)
// ---------------------------------------------------------------------------

export function BoardView({ problems, onOpen, onNew, onStatusChange }: ViewProps & {
  onStatusChange: (id: number, status: ProblemStatus) => void;
}) {
  const [over, setOver] = useState<ProblemStatus | null>(null);

  const drop = (status: ProblemStatus) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    const p = problems.find((x) => x.problem_id === id);
    if (p && p.status !== status) onStatusChange(id, status);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 pt-2">
      {STATUSES.map((status) => {
        const items = problems.filter((p) => p.status === status);
        const color = tagColor(status);
        return (
          <div key={status}
               onDragOver={(e) => { e.preventDefault(); setOver(status); }}
               onDragLeave={() => setOver((s) => (s === status ? null : s))}
               onDrop={drop(status)}
               className={`w-[260px] shrink-0 rounded-[6px] p-2 ${COLUMN_BG[color]} ${over === status ? "ring-2 ring-[#2383E259]" : ""}`}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <Tag label={status} dot />
              <span className={`text-sm ${text.tertiary}`}>{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <div key={p.problem_id} draggable
                     onDragStart={(e) => e.dataTransfer.setData("text/plain", String(p.problem_id))}
                     onClick={() => onOpen(p.problem_id)}
                     className="cursor-pointer rounded-[4px] bg-white p-2.5 shadow-[0_0_0_1px_rgba(15,15,15,0.07),0_2px_4px_rgba(15,15,15,0.05)] hover:bg-[#FBFBFA]">
                  <div className="mb-1.5 text-sm font-medium leading-5">{p.title}</div>
                  <div className="flex flex-wrap gap-1">
                    <Tag label={p.difficulty} />
                    {p.topics.slice(0, 2).map((t) => <Tag key={t} label={t} />)}
                  </div>
                  {p.review_due && (
                    <div className={`mt-1.5 flex items-center gap-1 text-xs ${text.secondary}`}>
                      <Calendar size={12} /> Review {formatDate(p.review_due)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <AddRow onClick={() => onNew(status)} />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery (card preview = intuition notes)
// ---------------------------------------------------------------------------

export function GalleryView({ problems, onOpen, onNew }: ViewProps) {
  return (
    <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
      {problems.map((p) => (
        <button key={p.problem_id} onClick={() => onOpen(p.problem_id)}
                className="overflow-hidden rounded-[4px] bg-white text-left shadow-[0_0_0_1px_rgba(15,15,15,0.1),0_2px_4px_rgba(15,15,15,0.1)] transition-colors hover:bg-[#FBFBFA]">
          <div className={`h-[120px] overflow-hidden border-b ${border} bg-[#FBFBFA] px-3 pt-3 text-[11px] leading-4 ${text.secondary}`}>
            {p.intuition_notes || <span className={text.tertiary}>No notes yet.</span>}
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <FileText size={15} className={text.tertiary} /> <span className="truncate">{p.title}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <Tag label={p.status} dot />
              <Tag label={p.difficulty} />
            </div>
            <Topics topics={p.topics} max={3} />
          </div>
        </button>
      ))}
      <button onClick={() => onNew()}
              className={`flex min-h-[200px] items-center justify-center rounded-[4px] border border-dashed ${border} text-sm ${text.tertiary} ${hoverBg}`}>
        + New
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function ListView({ problems, onOpen, onNew }: ViewProps) {
  return (
    <div className="pt-1">
      {problems.map((p) => (
        <button key={p.problem_id} onClick={() => onOpen(p.problem_id)}
                className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left ${hoverBg}`}>
          <FileText size={16} className={`shrink-0 ${text.tertiary}`} />
          <span className="truncate text-sm font-medium underline decoration-[#37352F33] underline-offset-2">{p.title}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="hidden md:flex"><Topics topics={p.topics} max={2} /></span>
            <Tag label={p.difficulty} />
            <Tag label={p.status} dot />
            {p.review_due && <span className={`w-28 text-right text-xs ${text.secondary}`}>{formatDate(p.review_due)}</span>}
          </span>
        </button>
      ))}
      <AddRow onClick={() => onNew()} />
    </div>
  );
}
