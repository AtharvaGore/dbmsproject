"use client";

// The "Problems" database block: view tabs, filter pills, sort, search, New,
// and whichever view is selected (remembered per browser).
// Owner: Bhooshan Deshpande (Member B)

import { ArrowUpDown, Columns3, LayoutGrid, List, ListFilter, RefreshCw, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { BoardView, GalleryView, ListView, TableView } from "./ProblemViews";
import {
  DatabaseHeader, FilterPill, NewButton, ToolbarSearch, ToolbarSelect, ghostButtonClass,
  usePersistentState, type ViewOption,
} from "./ui";
import { DIFFICULTIES, PLATFORMS, STATUSES, type Problem, type ProblemStatus } from "./types";

type View = "table" | "board" | "gallery" | "list";
const VIEW_IDS: readonly View[] = ["table", "board", "gallery", "list"];
const VIEWS: ViewOption<View>[] = [
  { id: "table", label: "Table", icon: Table2 },
  { id: "board", label: "Board", icon: Columns3 },
  { id: "gallery", label: "Gallery", icon: LayoutGrid },
  { id: "list", label: "List", icon: List },
];

const DIFFICULTY_RANK: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
const SORTS: Record<string, { label: string; cmp: (a: Problem, b: Problem) => number }> = {
  created: { label: "Newest first", cmp: (a, b) => b.created_at.localeCompare(a.created_at) || b.problem_id - a.problem_id },
  title: { label: "Name A → Z", cmp: (a, b) => a.title.localeCompare(b.title) },
  difficulty: { label: "Hardest first", cmp: (a, b) => DIFFICULTY_RANK[b.difficulty] - DIFFICULTY_RANK[a.difficulty] || a.title.localeCompare(b.title) },
  review: { label: "Review due soonest", cmp: (a, b) => (a.review_due ?? "9999").localeCompare(b.review_due ?? "9999") },
};

export default function ProblemsDatabase({ problems, topicNames, onOpen, onNew, onStatusChange, onRefreshEmbeddings }: {
  problems: Problem[];
  topicNames: string[];
  onOpen: (id: number) => void;
  onNew: (status?: ProblemStatus) => void;
  onStatusChange: (id: number, status: ProblemStatus) => void;
  onRefreshEmbeddings: () => void;
}) {
  const [view, setView] = usePersistentState<View>("academiaos.dsa.view", "table", VIEW_IDS);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: "", difficulty: "", platform: "", topic: "" });
  const [sort, setSort] = useState("created");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems
      .filter((p) =>
        (!filters.status || p.status === filters.status) &&
        (!filters.difficulty || p.difficulty === filters.difficulty) &&
        (!filters.platform || p.platform === filters.platform) &&
        (!filters.topic || p.topics.includes(filters.topic)) &&
        (!q || p.title.toLowerCase().includes(q)))
      .sort(SORTS[sort].cmp);
  }, [problems, filters, sort, search]);

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const notCurrent = problems.filter((p) => p.embedding_state !== "Current").length;
  const set = (key: keyof typeof filters) => (v: string) => setFilters((f) => ({ ...f, [key]: v }));

  return (
    <section>
      <DatabaseHeader title="Problems" views={VIEWS} view={view} onView={setView} toolbar={
        <>
          <button className={`${ghostButtonClass} ${activeFilters ? "text-[#2383E2]" : ""}`} onClick={() => setShowFilters((s) => !s)}>
            <ListFilter size={15} /> <span className="hidden sm:inline">Filter</span>
          </button>
          <ToolbarSelect icon={ArrowUpDown} label="Sort" value={sort} onChange={setSort}
                         options={Object.entries(SORTS).map(([value, s]) => ({ value, label: s.label }))} />
          <ToolbarSearch value={search} onChange={setSearch} placeholder="Search titles…" />
          <button className={ghostButtonClass} onClick={onRefreshEmbeddings} title="Embed problems whose vector is Missing or Stale">
            <RefreshCw size={15} /> {notCurrent > 0 && <span className="text-xs">{notCurrent}</span>}
          </button>
          <NewButton onClick={() => onNew()} />
        </>
      } />

      {(showFilters || activeFilters > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 py-2">
          <FilterPill label="Status" value={filters.status} options={STATUSES} onChange={set("status")} />
          <FilterPill label="Difficulty" value={filters.difficulty} options={DIFFICULTIES} onChange={set("difficulty")} />
          <FilterPill label="Platform" value={filters.platform} options={PLATFORMS} onChange={set("platform")} />
          <FilterPill label="Topic" value={filters.topic} options={topicNames} onChange={set("topic")} />
          {activeFilters > 0 && (
            <button className="ml-1 text-xs text-[#9B9A97] hover:text-[#37352F]"
                    onClick={() => setFilters({ status: "", difficulty: "", platform: "", topic: "" })}>
              Reset
            </button>
          )}
        </div>
      )}

      {view === "table" && <TableView problems={rows} onOpen={onOpen} onNew={onNew} />}
      {view === "board" && <BoardView problems={rows} onOpen={onOpen} onNew={onNew} onStatusChange={onStatusChange} />}
      {view === "gallery" && <GalleryView problems={rows} onOpen={onOpen} onNew={onNew} />}
      {view === "list" && <ListView problems={rows} onOpen={onOpen} onNew={onNew} />}
    </section>
  );
}
