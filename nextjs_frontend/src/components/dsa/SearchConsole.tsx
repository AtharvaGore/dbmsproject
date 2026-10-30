"use client";

// Keyword (full-text, GIN) vs Semantic (pgvector, HNSW) search over my problems.
// Owner: Bhooshan Deshpande (Member B)

import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import Highlight from "./Highlight";
import { Notice, Pill, buttonClass, errorMessage, inputClass } from "./ui";
import type { FtsResult, VectorResult } from "./types";

type Mode = "keyword" | "semantic";

export default function SearchConsole({ onOpen }: { onOpen: (id: number) => void }) {
  const [mode, setMode] = useState<Mode>("keyword");
  const [query, setQuery] = useState("");
  const [fts, setFts] = useState<FtsResult[] | null>(null);
  const [vector, setVector] = useState<VectorResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [semanticDown, setSemanticDown] = useState(false);

  const run = async (m: Mode) => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      if (m === "keyword") {
        setFts(await apiFetch<FtsResult[]>(`/api/dsa/search/fts?q=${encodeURIComponent(q)}&limit=10`));
        setVector(null);
      } else {
        const rows = await apiFetch<VectorResult[]>("/api/dsa/search/vector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, limit: 8 }),
        });
        setVector(rows);
        setFts(null);
        setSemanticDown(false);
      }
    } catch (err) {
      const msg = errorMessage(err);
      // The API answers 503 with a "try keyword search" message when the model is unavailable.
      if (m === "semantic" && /unavailable|keyword/i.test(msg)) setSemanticDown(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(mode);
  };

  const switchToKeyword = () => {
    setMode("keyword");
    setSemanticDown(false);
    void run("keyword");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
          {(["keyword", "semantic"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
                    className={`px-3 py-1.5 capitalize ${mode === m ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
              {m}
            </button>
          ))}
        </div>
        <input className={`${inputClass} min-w-[14rem] flex-1`} value={query} onChange={(e) => setQuery(e.target.value)}
               placeholder={mode === "keyword" ? 'e.g. sliding window, "two pointers", dp -knapsack' : "e.g. pick the fewest coins to reach a total"} />
        <button type="submit" className={buttonClass} disabled={loading}>
          <Search size={15} /> {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {mode === "semantic" && semanticDown && (
        <Notice tone="warn">
          Semantic search is unavailable right now (the embedding model could not load).{" "}
          <button className="font-medium underline" onClick={switchToKeyword}>Use keyword search instead</button>
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      {fts && (
        <ul className="divide-y divide-slate-100">
          {fts.length === 0 && <li className="py-3 text-sm text-slate-500">No keyword matches.</li>}
          {fts.map((r) => (
            <li key={r.problem_id} className="cursor-pointer py-2 hover:bg-slate-50" onClick={() => onOpen(r.problem_id)}>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{r.title}</span>
                <Pill label={r.difficulty} />
                <span className="ml-auto text-xs tabular-nums text-slate-500">rank {r.rank.toFixed(3)}</span>
              </div>
              {r.snippet && <p className="mt-0.5 text-sm text-slate-600"><Highlight html={r.snippet} /></p>}
            </li>
          ))}
        </ul>
      )}

      {vector && (
        <ul className="divide-y divide-slate-100">
          {vector.length === 0 && <li className="py-3 text-sm text-slate-500">No similar problems (are your embeddings Missing?).</li>}
          {vector.map((r) => (
            <li key={r.problem_id} className="flex cursor-pointer items-center gap-2 py-2 hover:bg-slate-50" onClick={() => onOpen(r.problem_id)}>
              <span className="font-medium text-slate-900">{r.title}</span>
              <Pill label={r.difficulty} />
              <Pill label={r.status} />
              <span className="ml-auto rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-violet-800">
                {Math.round(r.similarity * 100)}% similar
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
