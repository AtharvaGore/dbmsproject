"use client";

// /dsa: DSA practice as a Notion-style page: stats, weak-topic callout,
// search, the Problems database (table / board / gallery / list) and Topics.
// Owner: Bhooshan Deshpande (Member B)

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import ProblemDrawer from "@/components/dsa/ProblemDrawer";
import ProblemForm from "@/components/dsa/ProblemForm";
import ProblemsDatabase from "@/components/dsa/ProblemsDatabase";
import SearchConsole from "@/components/dsa/SearchConsole";
import StatsStrip from "@/components/dsa/StatsStrip";
import TopicProgress from "@/components/dsa/TopicProgress";
import { Notice, Page, SidePeek, errorMessage } from "@/components/dsa/ui";
import type {
  DsaStats, Problem, ProblemStatus, RefreshResult, Topic, TopicProgress as TopicRow,
} from "@/components/dsa/types";

export default function DsaPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [stats, setStats] = useState<DsaStats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<TopicRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState<{ status?: ProblemStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const topicNames = useMemo(() => topics.map((t) => t.name), [topics]);

  const load = useCallback(async () => {
    try {
      const [p, s, t, tp] = await Promise.all([
        apiFetch<Problem[]>("/api/dsa/problems"),
        apiFetch<DsaStats>("/api/dsa/stats"),
        apiFetch<Topic[]>("/api/dsa/topics"),
        apiFetch<TopicRow[]>("/api/dsa/topics/progress"),
      ]);
      setProblems(p);
      setStats(s);
      setTopics(t);
      setProgress(tp);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Board drag-and-drop: move the card at once, then let the API (and its trigger) confirm.
  const changeStatus = async (id: number, status: ProblemStatus) => {
    setProblems((ps) => ps.map((p) => (p.problem_id === id ? { ...p, status } : p)));
    try {
      await apiFetch(`/api/dsa/problems/${id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      if (status === "Re-visit Needed") setNotice("Moved to Re-visit Needed: the database scheduled a review task.");
    } catch (err) {
      setError(errorMessage(err));
    }
    await load();
  };

  const refreshEmbeddings = async () => {
    try {
      const r = await apiFetch<RefreshResult>("/api/dsa/embeddings/refresh", { method: "POST" });
      setNotice(r.processed ? `Embedded ${r.processed} problem(s): ${r.inserted} new, ${r.updated} updated.` : "Every embedding is already current.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Page icon="🧩" title="DSA Practice" description="Problems, intuition notes, spaced revision, and keyword + semantic search.">
      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice>{notice}</Notice>}

      <StatsStrip stats={stats} />
      <SearchConsole onOpen={setOpenId} />

      <ProblemsDatabase problems={problems} topicNames={topicNames} onOpen={setOpenId}
                        onNew={(status) => setCreating({ status })} onStatusChange={(id, s) => void changeStatus(id, s)}
                        onRefreshEmbeddings={() => void refreshEmbeddings()} />

      <TopicProgress rows={progress} />

      <ProblemDrawer problemId={openId} topicNames={topicNames} onClose={() => setOpenId(null)}
                     onChanged={() => void load()} onOpen={setOpenId} />

      <SidePeek open={creating !== null} onClose={() => setCreating(null)} header="New problem">
        {creating && (
          <ProblemForm topicNames={topicNames} initialStatus={creating.status} onCancel={() => setCreating(null)}
                       onSaved={(p) => {
                         setCreating(null);
                         setNotice(p.warning ?? null);
                         void load();
                         setOpenId(p.problem_id);
                       }} />
        )}
      </SidePeek>
    </Page>
  );
}
