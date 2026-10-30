"use client";

// Views of the Applications database: Board (drag to change stage), Table,
// Calendar (by next event date) and List.
// Owner: Bhooshan Deshpande (Member B)

import {
  AlignLeft, Calendar, ChevronLeft, ChevronRight, CircleDot, Hash, Link as LinkIcon,
} from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";
import {
  AddRow, COLUMN_BG, Tag, Td, Th, TitleIcon, border, formatDate, ghostButtonClass, hoverBg, tagColor, text,
} from "@/components/dsa/ui";
import { STAGES, type Application, type Stage } from "./types";

export interface ViewProps {
  applications: Application[];
  onOpen: (id: number) => void;
  onNew: () => void;
}

const cardShadow = "shadow-[0_0_0_1px_rgba(15,15,15,0.07),0_2px_4px_rgba(15,15,15,0.05)]";

// ---------------------------------------------------------------------------
// Board
// ---------------------------------------------------------------------------

export function BoardView({ applications, onOpen, onNew, onStageChange }: ViewProps & {
  onStageChange: (id: number, stage: Stage) => void;
}) {
  const [over, setOver] = useState<Stage | null>(null);

  const drop = (stage: Stage) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    const app = applications.find((a) => a.oa_id === id);
    if (app && app.stage !== stage) onStageChange(id, stage);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 pt-2">
      {STAGES.map((stage) => {
        const items = applications.filter((a) => a.stage === stage);
        return (
          <div key={stage}
               onDragOver={(e) => { e.preventDefault(); setOver(stage); }}
               onDragLeave={() => setOver((s) => (s === stage ? null : s))}
               onDrop={drop(stage)}
               className={`w-[240px] shrink-0 rounded-[6px] p-2 ${COLUMN_BG[tagColor(stage)]} ${over === stage ? "ring-2 ring-[#2383E259]" : ""}`}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <Tag label={stage} dot />
              <span className={`text-sm ${text.tertiary}`}>{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <div key={a.oa_id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.oa_id))}
                     onClick={() => onOpen(a.oa_id)}
                     className={`cursor-pointer rounded-[4px] bg-white p-2.5 ${cardShadow} hover:bg-[#FBFBFA]`}>
                  <div className="text-sm font-medium leading-5">{a.company_name}</div>
                  <div className={`text-xs ${text.secondary}`}>{a.role_title}</div>
                  <div className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${text.secondary}`}>
                    {a.event_date && <span className="inline-flex items-center gap-1"><Calendar size={12} />{formatDate(a.event_date)}</span>}
                    {a.problems_tested > 0 && <Tag label={`${a.problems_tested} problems`} color="gray" />}
                  </div>
                </div>
              ))}
            </div>
            {stage === "Applied" && <AddRow onClick={onNew} />}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function TableView({ applications, onOpen, onNew }: ViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-[900px] border-collapse border-b ${border}`}>
        <thead className={`border-b ${border}`}>
          <tr>
            <Th icon={TitleIcon} className="w-[20%]">Company</Th>
            <Th icon={AlignLeft}>Role</Th>
            <Th icon={CircleDot}>Stage</Th>
            <Th icon={Calendar}>Applied</Th>
            <Th icon={Calendar}>Next event</Th>
            <Th icon={Hash}>Days in stage</Th>
            <Th icon={Hash}>Problems</Th>
            <Th icon={LinkIcon}>Link</Th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.oa_id} className={`group border-b ${border} ${hoverBg}`}>
              <Td>
                <div className="flex items-center gap-2">
                  <button onClick={() => onOpen(a.oa_id)} className="truncate text-left font-medium hover:underline">{a.company_name}</button>
                  <button onClick={() => onOpen(a.oa_id)}
                          className={`ml-auto hidden shrink-0 rounded-[4px] border ${border} bg-white px-1.5 text-[11px] font-medium uppercase tracking-wide ${text.secondary} shadow-sm group-hover:inline`}>
                    Open
                  </button>
                </div>
              </Td>
              <Td className={text.secondary}>{a.role_title}</Td>
              <Td><Tag label={a.stage} dot /></Td>
              <Td className="whitespace-nowrap">{formatDate(a.applied_on)}</Td>
              <Td className="whitespace-nowrap">{formatDate(a.event_date)}</Td>
              <Td className="text-right tabular-nums">{a.days_in_stage ?? ""}</Td>
              <Td className="text-right tabular-nums">{a.problems_tested}</Td>
              <Td>
                {a.application_link && (
                  <a href={a.application_link} target="_blank" rel="noreferrer"
                     className="block max-w-[160px] truncate text-[#37352FA6] underline decoration-[#37352F33]">
                    {a.application_link.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      <AddRow onClick={onNew} />
      <div className={`px-2 text-xs ${text.tertiary}`}>COUNT <span className={text.secondary}>{applications.length}</span></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar (by event_date)
// ---------------------------------------------------------------------------

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView({ applications, onOpen }: ViewProps) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Application[]>();
    for (const a of applications) {
      if (!a.event_date) continue;
      const list = map.get(a.event_date) ?? [];
      list.push(a);
      map.set(a.event_date, list);
    }
    return map;
  }, [applications]);

  // 6 rows x 7 days, starting on the Sunday on or before the 1st.
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const todayKey = dayKey(new Date());
  const undated = applications.filter((a) => !a.event_date && a.stage !== "Offer" && a.stage !== "Rejected");

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="pt-2">
      <div className="mb-2 flex items-center gap-1">
        <h3 className="mr-auto text-base font-semibold">
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h3>
        <button className={ghostButtonClass} onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={16} /></button>
        <button className={ghostButtonClass} onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
        <button className={ghostButtonClass} onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
      <div className={`grid grid-cols-7 border-l border-t ${border}`}>
        {WEEKDAYS.map((d) => (
          <div key={d} className={`border-b border-r ${border} px-2 py-1 text-xs ${text.secondary}`}>{d}</div>
        ))}
        {days.map((d) => {
          const key = dayKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const items = byDay.get(key) ?? [];
          return (
            <div key={key} className={`min-h-[96px] border-b border-r ${border} p-1 ${inMonth ? "" : "bg-[#FBFBFA]"}`}>
              <div className="mb-1 flex justify-end">
                <span className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 text-sm ${
                  key === todayKey ? "bg-[#EB5757] text-white" : inMonth ? text.primary : text.tertiary}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {items.map((a) => (
                  <button key={a.oa_id} onClick={() => onOpen(a.oa_id)}
                          className={`block w-full rounded-[3px] bg-white px-1.5 py-1 text-left text-xs ${cardShadow} hover:bg-[#FBFBFA]`}>
                    <div className="truncate font-medium">{a.company_name}</div>
                    <Tag label={a.stage} dot />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {undated.length > 0 && (
        <p className={`mt-2 text-xs ${text.tertiary}`}>
          {undated.length} active application(s) have no event date: {undated.map((a) => a.company_name).join(", ")}.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function ListView({ applications, onOpen, onNew }: ViewProps) {
  return (
    <div className="pt-1">
      {applications.map((a) => (
        <button key={a.oa_id} onClick={() => onOpen(a.oa_id)}
                className={`flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-sm ${hoverBg}`}>
          <span aria-hidden>🏢</span>
          <span className="font-medium underline decoration-[#37352F33] underline-offset-2">{a.company_name}</span>
          <span className={`truncate ${text.secondary}`}>{a.role_title}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <Tag label={a.stage} dot />
            <span className={`w-32 text-right text-xs ${text.secondary}`}>{formatDate(a.event_date)}</span>
          </span>
        </button>
      ))}
      <AddRow onClick={onNew} />
    </div>
  );
}
