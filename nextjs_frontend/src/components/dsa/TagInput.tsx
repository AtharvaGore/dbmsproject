"use client";

// Topic tag input: type and press Enter/comma, or pick a suggestion.
// Owner: Bhooshan Deshpande (Member B)

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

export default function TagInput({ value, onChange, suggestions }: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();

  const add = (raw: string) => {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (tag && !value.some((t) => t.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1.5 focus-within:border-sky-500">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? "" : "Add topics…"}
        className="min-w-[8rem] flex-1 border-none p-0.5 text-sm focus:outline-none"
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}
