"use client";

// Small presentational pieces shared by the DSA, career and admin pages.
// Owner: Bhooshan Deshpande (Member B)

import { X } from "lucide-react";
import type { ReactNode } from "react";

const STATUS_STYLES: Record<string, string> = {
  Solved: "bg-sky-100 text-sky-800",
  "Re-visit Needed": "bg-amber-100 text-amber-800",
  Mastered: "bg-emerald-100 text-emerald-800",
  Easy: "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard: "bg-rose-50 text-rose-700",
  Current: "bg-emerald-50 text-emerald-700",
  Stale: "bg-amber-50 text-amber-700",
  Missing: "bg-slate-100 text-slate-600",
  Offer: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800",
};

export function Pill({ label, title }: { label: string; title?: string }) {
  const style = STATUS_STYLES[label] ?? "bg-slate-100 text-slate-700";
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

export function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600">
      {label}
    </span>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];
  return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}

export function Card({ title, actions, children }: { title?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Drawer({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close" className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl">
        <header className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="truncate font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-5 p-5">{children}</div>
      </aside>
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";
export const buttonClass =
  "inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
