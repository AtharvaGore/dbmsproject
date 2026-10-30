"use client";

// Admin blocks: system totals, then a "Users" database (Table / Gallery) with
// each user's funnel and DSA numbers. A 403 from the API means the viewer is
// not an admin, shown as "Admins only".
// Owner: Bhooshan Deshpande (Member B)

import { AtSign, CircleDot, Gauge, Hash, LayoutGrid, RefreshCw, Table2, Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  Callout, DatabaseHeader, Notice, StatBlocks, Tag, Td, Th, TitleIcon, border, errorMessage, formatDate,
  ghostButtonClass, hoverBg, text, usePersistentState, type ViewOption,
} from "@/components/dsa/ui";
import type { AdminOverview, AdminUser, RefreshFunnelResult } from "./types";

type View = "table" | "gallery";
const VIEW_IDS: readonly View[] = ["table", "gallery"];
const VIEWS: ViewOption<View>[] = [
  { id: "table", label: "Table", icon: Table2 },
  { id: "gallery", label: "Gallery", icon: LayoutGrid },
];

const displayName = (u: AdminUser) => (typeof u.full_name === "string" && u.full_name ? u.full_name : u.email);
const initials = (u: AdminUser) => displayName(u).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [view, setView] = usePersistentState<View>("academiaos.admin.view", "table", VIEW_IDS);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, u] = await Promise.all([
        apiFetch<AdminOverview>("/api/admin/overview"),
        apiFetch<AdminUser[]>("/api/admin/users"),
      ]);
      setOverview(o);
      setUsers(u);
      setError(null);
    } catch (err) {
      const msg = errorMessage(err);
      if (/forbidden|admin|permission|403/i.test(msg)) setForbidden(true);
      else setError(msg);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await apiFetch<RefreshFunnelResult>("/api/admin/refresh-funnel", { method: "POST" });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  if (forbidden) {
    return <Callout icon="🔒" tone="red"><b>Admins only.</b> Sign in with an admin account to see this page.</Callout>;
  }

  return (
    <>
      {error && <Notice tone="error">{error}</Notice>}
      {overview && (
        <StatBlocks items={[
          { label: "Users", value: overview.users },
          { label: "Students", value: overview.students },
          { label: "Problems", value: overview.problems },
          { label: "Applications", value: overview.applications },
          { label: "Offers", value: overview.offers },
          { label: "Embeddings current", value: `${overview.embeddings.Current}/${overview.problems}`,
            hint: `${overview.embeddings.Stale} stale, ${overview.embeddings.Missing} missing` },
        ]} />
      )}

      <section>
        <DatabaseHeader title="Users" views={VIEWS} view={view} onView={setView} toolbar={
          <>
            {overview?.funnel_refreshed_at && (
              <span className={`hidden text-xs sm:inline ${text.tertiary}`}>Funnel refreshed {formatDate(overview.funnel_refreshed_at)}</span>
            )}
            <button className={ghostButtonClass} onClick={() => void refresh()} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh funnel
            </button>
          </>
        } />

        {view === "table" ? (
          <div className="overflow-x-auto">
            <table className={`w-full min-w-[860px] border-collapse border-b ${border}`}>
              <thead className={`border-b ${border}`}>
                <tr>
                  <Th icon={TitleIcon} className="w-[24%]">Name</Th>
                  <Th icon={AtSign}>Email</Th>
                  <Th icon={CircleDot}>Role</Th>
                  <Th icon={Hash}>Problems</Th>
                  <Th icon={Hash}>To revisit</Th>
                  <Th icon={Hash}>Applications</Th>
                  <Th icon={Gauge}>OA clear %</Th>
                  <Th icon={Trophy}>Offers</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className={`border-b ${border} ${hoverBg}`}>
                    <Td className="font-medium">{displayName(u)}</Td>
                    <Td className={text.secondary}>{u.email}</Td>
                    <Td><Tag label={u.role} /></Td>
                    <Td className="text-right tabular-nums">{u.dsa.problems}</Td>
                    <Td className="text-right tabular-nums">{u.dsa.revisit_needed}</Td>
                    <Td className="text-right tabular-nums">{u.funnel?.total_applications ?? ""}</Td>
                    <Td className="text-right tabular-nums">{u.funnel?.oa_clear_rate_pct != null ? `${u.funnel.oa_clear_rate_pct}%` : ""}</Td>
                    <Td className="text-right tabular-nums">{u.funnel?.offers ?? ""}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={`px-2 pt-1 text-xs ${text.tertiary}`}>COUNT <span className={text.secondary}>{users.length}</span></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <div key={u.user_id} className="overflow-hidden rounded-[4px] shadow-[0_0_0_1px_rgba(15,15,15,0.1),0_2px_4px_rgba(15,15,15,0.1)]">
                <div className={`flex h-20 items-center justify-center border-b ${border} bg-[#FBFBFA]`}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E3E2E0] text-lg font-semibold text-[#32302C]">{initials(u)}</span>
                </div>
                <div className="space-y-1.5 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">{displayName(u)} <Tag label={u.role} /></div>
                  <div className={`truncate text-xs ${text.secondary}`}>{u.email}{u.leetcode_username ? ` · LeetCode ${u.leetcode_username}` : ""}</div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Tag label={`${u.dsa.problems} problems`} color="blue" />
                    <Tag label={`${u.dsa.revisit_needed} to revisit`} color="orange" />
                    {u.funnel && <Tag label={`${u.funnel.total_applications} applications`} color="purple" />}
                    {u.funnel && u.funnel.offers > 0 && <Tag label={`${u.funnel.offers} offer${u.funnel.offers > 1 ? "s" : ""}`} color="green" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
