"use client";

// Notion-style building blocks shared by the DSA, career and admin pages:
// page header, database view tabs + toolbar, select tags, side peek,
// property rows, callouts. Colours are Tailwind arbitrary values so nothing
// in Atharva's tailwind.config / globals.css has to change.
// Owner: Bhooshan Deshpande (Member B)

import { ChevronDown, ChevronsRight, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

/** Any Lucide icon (or TitleIcon) used as a property / view icon. */
export type IconType = ComponentType<{ size?: number | string; className?: string }>;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

export const FONT =
  'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"';

export type TagColor = "default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red";

const TAG: Record<TagColor, string> = {
  default: "bg-[#E3E2E080] text-[#32302C]",
  gray: "bg-[#E3E2E0] text-[#32302C]",
  brown: "bg-[#EEE0DA] text-[#442A1E]",
  orange: "bg-[#FADEC9] text-[#49290E]",
  yellow: "bg-[#FDECC8] text-[#402C1B]",
  green: "bg-[#DBEDDB] text-[#1C3829]",
  blue: "bg-[#D3E5EF] text-[#183347]",
  purple: "bg-[#E8DEEE] text-[#412454]",
  pink: "bg-[#F5E0E9] text-[#4C2337]",
  red: "bg-[#FFE2DD] text-[#5D1715]",
};

const DOT: Record<TagColor, string> = {
  default: "bg-[#91918E]", gray: "bg-[#91918E]", brown: "bg-[#A27763]", orange: "bg-[#CC782F]",
  yellow: "bg-[#C29343]", green: "bg-[#548164]", blue: "bg-[#487CA5]", purple: "bg-[#8A67AB]",
  pink: "bg-[#B35488]", red: "bg-[#C4554D]",
};

// Tinted background for a board column of that colour.
export const COLUMN_BG: Record<TagColor, string> = {
  default: "bg-[#F9F9F8]", gray: "bg-[#F9F9F8]", brown: "bg-[#FAF6F5]", orange: "bg-[#FCF8F3]",
  yellow: "bg-[#FBF9F3]", green: "bg-[#F6FAF7]", blue: "bg-[#F5F9FC]", purple: "bg-[#F9F7FB]",
  pink: "bg-[#FBF6F9]", red: "bg-[#FDF6F5]",
};

// Fixed colours for the values the schema knows about.
const KNOWN: Record<string, TagColor> = {
  // problem status
  Solved: "blue", "Re-visit Needed": "orange", Mastered: "green",
  // difficulty
  Easy: "green", Medium: "yellow", Hard: "red",
  // embedding state
  Current: "green", Stale: "yellow", Missing: "gray",
  // platforms
  LeetCode: "orange", Codeforces: "blue", HackerRank: "green", Other: "gray",
  // OA stages
  Applied: "gray", "OA Received": "blue", "OA Cleared": "purple", "Technical Round": "yellow",
  "HR Round": "brown", Offer: "green", Rejected: "red",
  // roles
  Student: "blue", Admin: "purple",
};

const PALETTE: TagColor[] = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];

/** Colour for a select option: fixed for known values, stable hash otherwise (like Notion's random option colours). */
export function tagColor(label: string): TagColor {
  if (KNOWN[label]) return KNOWN[label];
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// ---------------------------------------------------------------------------
// Text / buttons / inputs
// ---------------------------------------------------------------------------

export const text = {
  primary: "text-[#37352F]",
  secondary: "text-[#787774]",
  tertiary: "text-[#9B9A97]",
};

export const hoverBg = "hover:bg-[#37352F0F]";
export const border = "border-[#E9E9E7]";

export const buttonClass =
  "inline-flex h-7 items-center gap-1 rounded-[4px] bg-[#2383E2] px-2.5 text-sm font-medium text-white shadow-[inset_0_-1px_0_rgba(15,15,15,0.1)] hover:bg-[#0077D4] disabled:opacity-50";
export const ghostButtonClass =
  `inline-flex h-7 items-center gap-1 rounded-[4px] px-2 text-sm ${text.secondary} ${hoverBg} disabled:opacity-40`;
export const secondaryButtonClass =
  `inline-flex h-7 items-center gap-1 rounded-[4px] border ${border} bg-white px-2.5 text-sm ${text.primary} ${hoverBg} disabled:opacity-50`;
export const dangerButtonClass =
  "inline-flex h-7 items-center gap-1 rounded-[4px] px-2 text-sm text-[#EB5757] hover:bg-[#FFE2DD80]";

/** Notion property value: looks like plain text until hovered / focused. */
export const inlineInputClass =
  `w-full rounded-[4px] bg-transparent px-1.5 py-1 text-sm ${text.primary} placeholder:text-[#9B9A97] ${hoverBg} focus:bg-white focus:shadow-[0_0_0_2px_rgba(35,131,226,0.35)] focus:outline-none`;

export const inputClass =
  `w-full rounded-[4px] border ${border} bg-[#FBFBFA] px-2 py-1 text-sm ${text.primary} placeholder:text-[#9B9A97] focus:border-[#2383E2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2383E2]`;

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** A select / multi-select option. `dot` gives the status-property look. */
export function Tag({ label, color, dot, title }: { label: string; color?: TagColor; dot?: boolean; title?: string }) {
  const c = color ?? tagColor(label);
  return (
    <span title={title}
          className={`inline-flex h-5 max-w-full items-center gap-1 whitespace-nowrap rounded-[3px] px-1.5 text-xs leading-5 ${TAG[c]} ${dot ? "rounded-full pl-1.5 pr-2" : ""}`}>
      {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[c]}`} />}
      <span className="truncate">{label}</span>
    </span>
  );
}

// Kept for older imports: a status pill is a Tag with a dot.
export function Pill({ label, title }: { label: string; title?: string }) {
  return <Tag label={label} dot title={title} />;
}

export function Chip({ label }: { label: string }) {
  return <Tag label={label} />;
}

// ---------------------------------------------------------------------------
// Page layout
// ---------------------------------------------------------------------------

/** A Notion page: emoji icon, big title, description, then blocks. Always white, whatever the app theme. */
export function Page({ icon, title, description, children }: {
  icon: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-white ${text.primary}`} style={{ fontFamily: FONT }}>
      <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-12 sm:px-12 sm:pt-16 lg:px-16">
        <div className="mb-2 text-[64px] leading-none" aria-hidden>{icon}</div>
        <h1 className="mb-1 text-[40px] font-bold leading-tight tracking-[-0.01em]">{title}</h1>
        {description && <p className={`mb-6 text-base ${text.secondary}`}>{description}</p>}
        <div className="space-y-8">{children}</div>
      </main>
    </div>
  );
}

export function Callout({ icon = "💡", tone = "gray", children }: {
  icon?: string;
  tone?: "gray" | "yellow" | "red" | "blue";
  children: ReactNode;
}) {
  const bg = { gray: "bg-[#F1F1EF]", yellow: "bg-[#FBF3DB]", red: "bg-[#FDEBEC]", blue: "bg-[#E7F3F8]" }[tone];
  return (
    <div className={`flex gap-3 rounded-[4px] px-4 py-3 text-sm ${bg}`}>
      <span className="text-lg leading-5" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1 leading-5">{children}</div>
    </div>
  );
}

/** Errors and notices, as callouts. */
export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  const map = { info: ["ℹ️", "blue"], warn: ["⚠️", "yellow"], error: ["⛔", "red"] } as const;
  return <Callout icon={map[tone][0]} tone={map[tone][1]}>{children}</Callout>;
}

/** Heading for a section that is not a database. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className={`mb-2 flex items-center justify-between border-b ${border} pb-1.5`}>
      <h2 className="text-xl font-semibold">{children}</h2>
      {right}
    </div>
  );
}

// Kept for older imports.
export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section>
      {title && <SectionTitle right={actions}>{title}</SectionTitle>}
      {children}
    </section>
  );
}

/** Row of small number blocks (Notion has no stat widget, so these mimic callouts). */
export function StatBlocks({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((s) => (
        <div key={s.label} title={s.hint} className={`rounded-[4px] border ${border} px-3 py-2.5`}>
          <div className={`text-xs ${text.secondary}`}>{s.label}</div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Database block: title, view tabs, toolbar
// ---------------------------------------------------------------------------

export interface ViewOption<V extends string> {
  id: V;
  label: string;
  icon: IconType;
}

export function DatabaseHeader<V extends string>({ title, views, view, onView, toolbar }: {
  title: string;
  views: ViewOption<V>[];
  view: V;
  onView: (v: V) => void;
  toolbar?: ReactNode;
}) {
  return (
    <div className="mb-1">
      <h2 className="mb-2 text-2xl font-bold">{title}</h2>
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b ${border}`}>
        <div className="-mb-px flex items-center gap-0.5" role="tablist">
          {views.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={view === id} onClick={() => onView(id)}
                    className={`flex items-center gap-1.5 border-b-2 px-2 pb-1.5 pt-1 text-sm ${
                      view === id ? `border-[#37352F] ${text.primary}` : `border-transparent ${text.secondary} hover:text-[#37352F]`}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5 pb-1">{toolbar}</div>
      </div>
    </div>
  );
}

/** Search box that expands from an icon, as in a Notion database toolbar. */
export function ToolbarSearch({ value, onChange, placeholder = "Type to search…" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(Boolean(value));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  if (!open) {
    return <button className={ghostButtonClass} onClick={() => setOpen(true)} aria-label="Search"><Search size={15} /></button>;
  }
  return (
    <div className="flex h-7 items-center gap-1 px-1.5">
      <Search size={15} className={text.tertiary} />
      <input ref={ref} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
             onBlur={() => !value && setOpen(false)}
             className="w-36 bg-transparent text-sm placeholder:text-[#9B9A97] focus:outline-none" />
      {value && <button onClick={() => onChange("")} aria-label="Clear search" className={text.tertiary}><X size={13} /></button>}
    </div>
  );
}

/** A native select dressed as a toolbar button ("Sort", "Group" …). */
export function ToolbarSelect({ icon: Icon, label, value, options, onChange }: {
  icon: IconType;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className={`${ghostButtonClass} relative cursor-pointer`}>
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
              className="absolute inset-0 cursor-pointer opacity-0">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Notion's filter pill: "Status: Solved ▾"; blue when active. */
export function FilterPill({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const active = value !== "";
  return (
    <label className={`relative inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-xs ${
      active ? "border-[#2383E259] bg-[#2383E212] text-[#2383E2]" : `${border} ${text.secondary} ${hoverBg}`}`}>
      {label}{active ? `: ${value}` : ""}
      <ChevronDown size={12} />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={`Filter by ${label}`}
              className="absolute inset-0 cursor-pointer opacity-0">
        <option value="">Any {label.toLowerCase()}</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function NewButton({ onClick, label = "New" }: { onClick: () => void; label?: string }) {
  return <button className={`${buttonClass} ml-1`} onClick={onClick}>{label}</button>;
}

/** The faint "+ New" row at the bottom of tables and board columns. */
export function AddRow({ onClick, label = "New" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-sm ${text.tertiary} ${hoverBg}`}>
      <Plus size={15} /> {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Table primitives
// ---------------------------------------------------------------------------

export function Th({ icon: Icon, children, className = "" }: {
  icon?: IconType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={`h-8 whitespace-nowrap border-r ${border} px-2 text-left text-sm font-normal ${text.secondary} last:border-r-0 ${className}`}>
      <span className="inline-flex items-center gap-1.5">{Icon && <Icon size={14} className={text.tertiary} />}{children}</span>
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`h-9 whitespace-nowrap border-r ${border} px-2 align-middle text-sm last:border-r-0 ${className}`}>{children}</td>;
}

/** The "Aa" icon Notion uses for title columns. */
export function TitleIcon({ className = "" }: { size?: number | string; className?: string }) {
  return <span className={`text-[11px] font-semibold ${className}`}>Aa</span>;
}

// ---------------------------------------------------------------------------
// Side peek + properties
// ---------------------------------------------------------------------------

/** Notion's side peek: page opens in a panel on the right. */
export function SidePeek({ open, onClose, children, header }: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  // Portal to <body> so parent layout (e.g. space-y margins, transforms) can never offset the overlay.
  return createPortal(
    <div className="fixed inset-0 z-40 flex justify-end" style={{ fontFamily: FONT }}>
      <div aria-hidden className="absolute inset-0 bg-[#0F0F0F14]" onClick={onClose} />
      <aside className={`relative z-50 flex h-full w-full max-w-[680px] flex-col bg-white ${text.primary} shadow-[0_0_0_1px_rgba(15,15,15,0.05),0_3px_6px_rgba(15,15,15,0.1),0_9px_24px_rgba(15,15,15,0.2)]`}>
        <div className="flex h-11 shrink-0 items-center gap-1 px-3">
          <button onClick={onClose} className={ghostButtonClass} aria-label="Close side peek" title="Close (Esc)">
            <ChevronsRight size={18} />
          </button>
          <div className={`ml-auto flex items-center gap-1 text-xs ${text.tertiary}`}>{header}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-16 sm:px-12">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

// Kept for older imports: a Drawer is a side peek with a title.
export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <SidePeek open={open} onClose={onClose}>
      <h1 className="mb-4 mt-2 text-[32px] font-bold leading-tight">{title}</h1>
      <div className="space-y-4">{children}</div>
    </SidePeek>
  );
}

/** One property line: icon + name on the left, value on the right. */
export function PropertyRow({ icon: Icon, name, children }: {
  icon: IconType;
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[34px] items-start">
      <div className={`flex w-40 shrink-0 items-center gap-1.5 px-1.5 py-[7px] text-sm ${text.secondary}`}>
        <Icon size={15} className={text.tertiary} /> {name}
      </div>
      <div className="flex min-h-[34px] min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}

/** A property value shown as a tag with an invisible native select on top. */
export function SelectProperty({ value, options, onChange, dot, label, placeholder = "Empty" }: {
  value: string;
  label?: string;
  options: readonly string[];
  onChange: (v: string) => void;
  dot?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={`relative flex min-h-[30px] w-full cursor-pointer items-center rounded-[4px] px-1.5 ${hoverBg}`}>
      {value ? <Tag label={value} dot={dot} /> : <span className={`text-sm ${text.tertiary}`}>{placeholder}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
              className="absolute inset-0 cursor-pointer opacity-0">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

/** Textarea that grows with its content (page titles, notes). */
export function AutoTextarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props}
                   className={`w-full resize-none overflow-hidden bg-transparent placeholder:text-[#9B9A97] focus:outline-none ${className}`} />;
}

export function Divider() {
  return <hr className={`my-4 ${border}`} />;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** useState that remembers its value per browser (e.g. the chosen view). Falls back silently without storage. */
export function usePersistentState<T extends string>(key: string, initial: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key) as T | null;
      if (saved && allowed.includes(saved)) setValue(saved);
    } catch { /* storage blocked: keep the default */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const update = (v: T) => {
    setValue(v);
    try { window.localStorage.setItem(key, v); } catch { /* ignore */ }
  };
  return [value, update];
}
