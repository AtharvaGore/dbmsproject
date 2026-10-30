"use client";

// Search block, styled like Notion's search: one input, Keyword | Semantic
// switch, results as page links. Keyword = full-text (GIN); Semantic =
// pgvector cosine search (HNSW).
// Owner: Bhooshan Deshpande (Member B)

import { FileText, Search, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import Highlight from "./Highlight";
import { Notice, Tag, border, errorMessage, hoverBg, text } from "./ui";
import type { FtsResult, VectorResult } from "./types";

type Mode = "keyword" | "semantic";

const HINTS: Record<Mode, string> = {
  keyword: 'Search notes and titles: sliding window, "two pointers", dp -knapsack',
  semantic: "Describe the idea: pick the fewest coins that add up to a total",
};

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
        setVector(await apiFetch<VectorResult[]>("/api/dsa/search/vector", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, limit: 8 }),
        }));
        setFts(null);
        setSemanticDown(false);
      }
    } catch (err) {
      const msg = errorMessage(err);
      // The API answers 503 "…try keyword search" when the embedding model is unavailable.
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

  const switchMode = (m: Mode) => {
    setMode(m);
    setSemanticDown(false);
    if (query.trim()) void run(m);
  };

  const hasResults = fts !== null || vector !== null;

  return (
    <div className="overflow-hidden rounded-[6px] shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1)]">
      <form onSubmit={submit} className={`flex items-center gap-2 px-3 ${hasResults ? `border-b ${border}` : ""}`}>
        <Search size={18} className={text.tertiary} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={HINTS[mode]}
               className="h-12 min-w-0 flex-1 bg-transparent text-base placeholder:text-[#9B9A97] focus:outline-none" />
        {loading && <span className={`text-xs ${text.tertiary}`}>Searching…</span>}
        <div className="flex shrink-0 rounded-[4px] bg-[#37352F0F] p-0.5 text-xs">
          {(["keyword", "semantic"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)}
                    className={`flex items-center gap-1 rounded-[3px] px-2 py-1 capitalize ${
                      mode === m ? "bg-white font-medium text-[#37352F] shadow-sm" : text.secondary}`}>
              {m === "semantic" && <Sparkles size={12} />} {m}
            </button>
          ))}
        </div>
      </form>

      {(semanticDown || error) && (
        <div className="p-3">
          {semanticDown ? (
            <Notice tone="warn">
              Semantic search is unavailable right now because the embedding model could not load.{" "}
              <button className="font-medium underline" onClick={() => switchMode("keyword")}>Search by keyword instead</button>
            </Notice>
          ) : <Notice tone="error">{error}</Notice>}
        </div>
      )}

      {hasResults && (
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          <div className={`px-2 pb-1 pt-1.5 text-xs font-medium ${text.secondary}`}>
            {mode === "keyword" ? "Best matches (ts_rank_cd)" : "Closest in meaning (cosine similarity)"}
          </div>
          {fts?.length === 0 || vector?.length === 0 ? (
            <p className={`px-2 py-3 text-sm ${text.tertiary}`}>No results.</p>
          ) : null}
          {fts?.map((r) => (
            <button key={r.problem_id} onClick={() => onOpen(r.problem_id)}
                    className={`flex w-full gap-2.5 rounded-[4px] px-2 py-1.5 text-left ${hoverBg}`}>
              <FileText size={18} className={`mt-0.5 shrink-0 ${text.tertiary}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {r.title} <Tag label={r.difficulty} />
                  <span className={`ml-auto text-xs tabular-nums ${text.tertiary}`}>{r.rank.toFixed(3)}</span>
                </span>
                {r.snippet && <span className={`mt-0.5 block text-xs leading-5 ${text.secondary}`}><Highlight html={r.snippet} /></span>}
              </span>
            </button>
          ))}
          {vector?.map((r) => (
            <button key={r.problem_id} onClick={() => onOpen(r.problem_id)}
                    className={`flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-left text-sm ${hoverBg}`}>
              <FileText size={18} className={`shrink-0 ${text.tertiary}`} />
              <span className="font-medium">{r.title}</span>
              <Tag label={r.difficulty} />
              <Tag label={r.status} dot />
              <span className="ml-auto"><Tag label={`${Math.round(r.similarity * 100)}% similar`} color="purple" /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
