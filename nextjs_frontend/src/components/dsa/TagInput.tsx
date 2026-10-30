"use client";

// Multi-select property: coloured tags inline, type + Enter (or comma) to add,
// Backspace on an empty input removes the last one.
// Owner: Bhooshan Deshpande (Member B)

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { hoverBg, tagColor, text } from "./ui";

const TAG_BG: Record<string, string> = {
  gray: "bg-[#E3E2E0]", brown: "bg-[#EEE0DA]", orange: "bg-[#FADEC9]", yellow: "bg-[#FDECC8]",
  green: "bg-[#DBEDDB]", blue: "bg-[#D3E5EF]", purple: "bg-[#E8DEEE]", pink: "bg-[#F5E0E9]",
  red: "bg-[#FFE2DD]", default: "bg-[#E3E2E080]",
};

export default function TagInput({ value, onChange, suggestions, placeholder = "Empty" }: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
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
    <div className={`flex min-h-[30px] w-full flex-wrap items-center gap-1 rounded-[4px] px-1.5 py-1 ${hoverBg} focus-within:bg-white focus-within:shadow-[0_0_0_2px_rgba(35,131,226,0.35)]`}>
      {value.map((tag) => (
        <span key={tag} className={`inline-flex h-5 items-center gap-0.5 rounded-[3px] pl-1.5 pr-0.5 text-xs text-[#32302C] ${TAG_BG[tagColor(tag)]}`}>
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} className="rounded-sm opacity-50 hover:opacity-100"
                  onClick={() => onChange(value.filter((t) => t !== tag))}>
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
        placeholder={value.length ? "" : placeholder}
        className={`min-w-[6rem] flex-1 bg-transparent text-sm ${text.primary} placeholder:text-[#9B9A97] focus:outline-none`}
      />
      <datalist id={listId}>
        {suggestions.filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}
      </datalist>
    </div>
  );
}
