"use client";

// Problem side peek, edited in place like a Notion page: title and notes save
// on blur, selects and topics save on change. Status goes through PATCH so
// the review-task trigger fires; everything else through PUT (which
// re-embeds when the title or notes changed).
// Owner: Bhooshan Deshpande (Member B)

import {
  Calendar, CircleChevronDown, CircleDot, Clock, ExternalLink, FileText, Link, List, Sparkles, Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import TagInput from "./TagInput";
import {
  AutoTextarea, Divider, Notice, PropertyRow, SelectProperty, SidePeek, Tag, dangerButtonClass,
  errorMessage, formatDate, ghostButtonClass, hoverBg, inlineInputClass, text,
} from "./ui";
import {
  DIFFICULTIES, PLATFORMS, STATUSES, type Problem, type ProblemDetail, type ProblemStatus, type RefreshResult,
} from "./types";

type Editable = Partial<Pick<Problem, "title" | "platform" | "difficulty" | "problem_url" | "intuition_notes" | "topics">>;

export default function ProblemDrawer({ problemId, topicNames, onClose, onChanged, onOpen }: {
  problemId: number | null;
  topicNames: string[];
  onClose: () => void;
  onChanged: () => void;
  onOpen: (id: number) => void;
}) {
  const [detail, setDetail] = useState<ProblemDetail | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (id: number) => {
    try {
      const d = await apiFetch<ProblemDetail>(`/api/dsa/problems/${id}`);
      setDetail(d);
      setTitle(d.title);
      setNotes(d.intuition_notes ?? "");
      setUrl(d.problem_url ?? "");
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setNotice(null);
    setError(null);
    if (problemId !== null) void load(problemId);
  }, [problemId, load]);

  const run = async (fn: () => Promise<unknown>, message?: string) => {
    if (problemId === null) return;
    setSaving(true);
    try {
      const result = await fn();
      const warning = (result as { warning?: string } | undefined)?.warning;
      setNotice(warning ?? message ?? null);
      setError(null);
      onChanged();
      await load(problemId);
    } catch (err) {
      setError(errorMessage(err));
      await load(problemId); // put the stored values back
    } finally {
      setSaving(false);
    }
  };

  const save = (fields: Editable) =>
    run(() => apiFetch<Problem>(`/api/dsa/problems/${problemId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields),
    }));

  const changeStatus = (status: ProblemStatus) =>
    run(() => apiFetch(`/api/dsa/problems/${problemId}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    }), status === "Re-visit Needed" ? "A review task was scheduled by the database trigger." : undefined);

  const deleteEmbedding = () =>
    run(() => apiFetch(`/api/dsa/problems/${problemId}/embedding`, { method: "DELETE" }), "Embedding deleted.");

  const embedNow = () =>
    run(() => apiFetch<RefreshResult>("/api/dsa/embeddings/refresh", { method: "POST" }), "Embedding created.");

  const deleteProblem = async () => {
    if (!detail || !window.confirm(`Delete "${detail.title}"? Its OA links and embedding are deleted too.`)) return;
    try {
      await apiFetch(`/api/dsa/problems/${detail.problem_id}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const header = saving ? "Saving…" : detail ? `Created ${formatDate(detail.created_at)}` : "";

  return (
    <SidePeek open={problemId !== null} onClose={onClose} header={header}>
      {!detail ? (
        error ? <div className="pt-6"><Notice tone="error">{error}</Notice></div> : <p className={`pt-6 text-sm ${text.tertiary}`}>Loading…</p>
      ) : (
        <div className="pt-6">
          <AutoTextarea value={title} onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
                        onBlur={() => title.trim() && title !== detail.title && void save({ title })}
                        className="mb-4 text-[40px] font-bold leading-tight" aria-label="Title" />

          <PropertyRow icon={CircleDot} name="Status">
            <SelectProperty label="Status" dot value={detail.status} options={STATUSES} onChange={(v) => void changeStatus(v as ProblemStatus)} />
          </PropertyRow>
          <PropertyRow icon={CircleChevronDown} name="Difficulty">
            <SelectProperty label="Difficulty" value={detail.difficulty} options={DIFFICULTIES} onChange={(v) => void save({ difficulty: v as Problem["difficulty"] })} />
          </PropertyRow>
          <PropertyRow icon={CircleChevronDown} name="Platform">
            <SelectProperty label="Platform" value={detail.platform} options={PLATFORMS} onChange={(v) => void save({ platform: v as Problem["platform"] })} />
          </PropertyRow>
          <PropertyRow icon={List} name="Topics">
            <TagInput value={detail.topics} suggestions={topicNames} onChange={(topics) => void save({ topics })} />
          </PropertyRow>
          <PropertyRow icon={Link} name="URL">
            <input type="url" className={inlineInputClass} value={url} placeholder="Empty"
                   onChange={(e) => setUrl(e.target.value)}
                   onBlur={() => url !== (detail.problem_url ?? "") && void save({ problem_url: url })} />
            {detail.problem_url && (
              <a href={detail.problem_url} target="_blank" rel="noreferrer" className={`${ghostButtonClass} shrink-0`} aria-label="Open link">
                <ExternalLink size={14} />
              </a>
            )}
          </PropertyRow>
          <PropertyRow icon={Calendar} name="Last revised">
            <span className="px-1.5 text-sm">{formatDate(detail.last_revised) || <span className={text.tertiary}>Empty</span>}</span>
          </PropertyRow>
          <PropertyRow icon={Clock} name="Review task">
            {detail.review_task ? (
              <span className="flex items-center gap-2 px-1.5 text-sm">
                <Tag label={detail.review_task.status} color={detail.review_task.status === "Done" ? "green" : "orange"} dot />
                {formatDate(detail.review_task.scheduled_date)}
              </span>
            ) : <span className={`px-1.5 text-sm ${text.tertiary}`}>Empty</span>}
          </PropertyRow>
          <PropertyRow icon={Sparkles} name="Embedding">
            <span className="flex items-center gap-1 px-1.5">
              <Tag label={detail.embedding_state} />
              {detail.embedding_state === "Missing" || detail.embedding_state === "Stale" ? (
                <button className={ghostButtonClass} onClick={() => void embedNow()}>Embed now</button>
              ) : (
                <button className={ghostButtonClass} onClick={() => void deleteEmbedding()}>Delete vector</button>
              )}
            </span>
          </PropertyRow>

          {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
          {notice && <div className="mt-3"><Notice>{notice}</Notice></div>}

          <Divider />
          <AutoTextarea value={notes} onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => notes !== (detail.intuition_notes ?? "") && void save({ intuition_notes: notes })}
                        placeholder="Write your intuition…" aria-label="Intuition notes"
                        className="min-h-[96px] text-base leading-7" />

          <h3 className="mb-1 mt-8 text-lg font-semibold">Asked in OAs</h3>
          {detail.applications.length === 0 ? (
            <p className={`text-sm ${text.tertiary}`}>Not linked to any application yet.</p>
          ) : detail.applications.map((a) => (
            <div key={a.oa_id} className={`flex items-center gap-2 rounded-[4px] px-1.5 py-1 text-sm ${hoverBg}`}>
              <span aria-hidden>🏢</span>
              <span className="font-medium">{a.company_name}</span>
              <span className={text.secondary}>{a.role_title}</span>
              <span className="ml-auto flex gap-1">
                <Tag label={a.stage} dot />
                <Tag label={a.solved_during_oa ? "Solved in OA" : "Not solved"} color={a.solved_during_oa ? "green" : "red"} />
              </span>
            </div>
          ))}

          <h3 className="mb-1 mt-8 flex items-center gap-1.5 text-lg font-semibold">Similar problems</h3>
          {detail.similar.length === 0 ? (
            <p className={`text-sm ${text.tertiary}`}>No embedding yet, so there are no neighbours to show.</p>
          ) : detail.similar.map((s) => (
            <button key={s.problem_id} onClick={() => onOpen(s.problem_id)}
                    className={`flex w-full items-center gap-2 rounded-[4px] px-1.5 py-1 text-left text-sm ${hoverBg}`}>
              <FileText size={15} className={text.tertiary} />
              <span className="underline decoration-[#37352F33] underline-offset-2">{s.title}</span>
              <Tag label={s.difficulty} />
              <span className="ml-auto"><Tag label={`${Math.round(s.similarity * 100)}%`} color="purple" /></span>
            </button>
          ))}

          <Divider />
          <button className={dangerButtonClass} onClick={() => void deleteProblem()}><Trash2 size={14} /> Delete problem</button>
        </div>
      )}
    </SidePeek>
  );
}
