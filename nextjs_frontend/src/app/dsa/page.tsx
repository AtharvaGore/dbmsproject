"use client";

// /dsa: DSA practice tracker with keyword + semantic search.
// Owner: Bhooshan Deshpande (Member B)

import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import ProblemDrawer from "@/components/dsa/ProblemDrawer";
import ProblemForm from "@/components/dsa/ProblemForm";
import ProblemTable, { NO_FILTERS, type ProblemFilters } from "@/components/dsa/ProblemTable";
import SearchConsole from "@/components/dsa/SearchConsole";
import StatsStrip from "@/components/dsa/StatsStrip";
import TopicProgress from "@/components/dsa/TopicProgress";
import { Card, Drawer, Notice, buttonClass, errorMessage, secondaryButtonClass } from "@/components/dsa/ui";
import type { DsaStats, Problem, RefreshResult, Topic, TopicProgress as TopicRow } from "@/components/dsa/types";

export default function DsaPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filters, setFilters] = useState<ProblemFilters>(NO_FILTERS);
  const [stats, setStats] = useState<DsaStats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<TopicRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const topicNames = useMemo(() => topics.map((t) => t.name), [topics]);

  const loadProblems = useCallback(async (f: ProblemFilters) => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]);
    const query = qs.toString();
    setProblems(await apiFetch<Problem[]>(`/api/dsa/problems${query ? `?${query}` : ""}`));
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [s, t, p] = await Promise.all([
        apiFetch<DsaStats>("/api/dsa/stats"),
        apiFetch<Topic[]>("/api/dsa/topics"),
        apiFetch<TopicRow[]>("/api/dsa/topics/progress"),
        loadProblems(filters),
      ]);
      setStats(s);
      setTopics(t);
      setProgress(p);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [filters, loadProblems]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const refreshEmbeddings = async () => {
    try {
      const r = await apiFetch<RefreshResult>("/api/dsa/embeddings/refresh", { method: "POST" });
      setNotice(r.processed ? `Embedded ${r.processed} problem(s): ${r.inserted} new, ${r.updated} updated.` : "All embeddings are current.");
      await loadAll();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const staleCount = problems.filter((p) => p.embedding_state !== "Current").length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">DSA practice</h1>
          <p className="text-sm text-slate-500">Problems, intuition notes, spaced revision and search.</p>
        </div>
        <div className="flex gap-2">
          <button className={secondaryButtonClass} onClick={() => void refreshEmbeddings()} title="Embed Missing / Stale problems">
            <RefreshCw size={14} /> Refresh embeddings{staleCount ? ` (${staleCount})` : ""}
          </button>
          <button className={buttonClass} onClick={() => setAdding(true)}><Plus size={15} /> Add problem</button>
        </div>
      </header>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice>{notice}</Notice>}

      <StatsStrip stats={stats} />

      <Card title="Search">
        <SearchConsole onOpen={setOpenId} />
      </Card>

      <Card title={`Problems (${problems.length})`}>
        <ProblemTable problems={problems} filters={filters} onFilters={setFilters} topicNames={topicNames} onOpen={setOpenId} />
      </Card>

      <Card title="Topic progress">
        <TopicProgress rows={progress} />
      </Card>

      <ProblemDrawer problemId={openId} topicNames={topicNames} onClose={() => setOpenId(null)}
                     onChanged={() => void loadAll()} onOpen={setOpenId} />

      <Drawer open={adding} title="Add problem" onClose={() => setAdding(false)}>
        <ProblemForm topicNames={topicNames} onCancel={() => setAdding(false)}
                     onSaved={(p) => { setAdding(false); setNotice(p.warning ?? `Added "${p.title}".`); void loadAll(); }} />
      </Drawer>
    </main>
  );
}
