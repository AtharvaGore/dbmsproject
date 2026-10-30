"use client";

// The "Applications" database block: Board / Table / Calendar / List views,
// stage filter, sort, search, New.
// Owner: Bhooshan Deshpande (Member B)

import { ArrowUpDown, CalendarDays, Columns3, List, ListFilter, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DatabaseHeader, FilterPill, NewButton, ToolbarSearch, ToolbarSelect, ghostButtonClass,
  usePersistentState, type ViewOption,
} from "@/components/dsa/ui";
import { BoardView, CalendarView, ListView, TableView } from "./ApplicationViews";
import { STAGES, type Application, type Stage } from "./types";

type View = "board" | "table" | "calendar" | "list";
const VIEW_IDS: readonly View[] = ["board", "table", "calendar", "list"];
const VIEWS: ViewOption<View>[] = [
  { id: "board", label: "Pipeline", icon: Columns3 },
  { id: "table", label: "Table", icon: Table2 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "list", label: "List", icon: List },
];

const SORTS: Record<string, { label: string; cmp: (a: Application, b: Application) => number }> = {
  upcoming: { label: "Next event first", cmp: (a, b) => (a.event_date ?? "9999").localeCompare(b.event_date ?? "9999") },
  applied: { label: "Recently applied", cmp: (a, b) => b.applied_on.localeCompare(a.applied_on) },
  company: { label: "Company A → Z", cmp: (a, b) => a.company_name.localeCompare(b.company_name) },
  stale: { label: "Longest in stage", cmp: (a, b) => (b.days_in_stage ?? 0) - (a.days_in_stage ?? 0) },
};

export default function ApplicationsDatabase({ applications, onOpen, onNew, onStageChange }: {
  applications: Application[];
  onOpen: (id: number) => void;
  onNew: () => void;
  onStageChange: (id: number, stage: Stage) => void;
}) {
  const [view, setView] = usePersistentState<View>("academiaos.career.view", "board", VIEW_IDS);
  const [showFilters, setShowFilters] = useState(false);
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState("upcoming");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications
      .filter((a) => (!stage || a.stage === stage) &&
        (!q || a.company_name.toLowerCase().includes(q) || a.role_title.toLowerCase().includes(q)))
      .sort(SORTS[sort].cmp);
  }, [applications, stage, sort, search]);

  return (
    <section>
      <DatabaseHeader title="Applications" views={VIEWS} view={view} onView={setView} toolbar={
        <>
          <button className={`${ghostButtonClass} ${stage ? "text-[#2383E2]" : ""}`} onClick={() => setShowFilters((s) => !s)}>
            <ListFilter size={15} /> <span className="hidden sm:inline">Filter</span>
          </button>
          <ToolbarSelect icon={ArrowUpDown} label="Sort" value={sort} onChange={setSort}
                         options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))} />
          <ToolbarSearch value={search} onChange={setSearch} placeholder="Company or role…" />
          <NewButton onClick={onNew} label="Log OA" />
        </>
      } />
      {(showFilters || stage) && (
        <div className="flex items-center gap-1.5 py-2">
          <FilterPill label="Stage" value={stage} options={STAGES} onChange={setStage} />
        </div>
      )}
      {view === "board" && <BoardView applications={rows} onOpen={onOpen} onNew={onNew} onStageChange={onStageChange} />}
      {view === "table" && <TableView applications={rows} onOpen={onOpen} onNew={onNew} />}
      {view === "calendar" && <CalendarView applications={rows} onOpen={onOpen} onNew={onNew} />}
      {view === "list" && <ListView applications={rows} onOpen={onOpen} onNew={onNew} />}
    </section>
  );
}
