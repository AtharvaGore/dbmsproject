"use client";

// Admin view: system totals, every user's funnel and DSA numbers, funnel refresh.
// A 403 from the API (non-admin) is shown as "Admins only".
// Owner: Bhooshan Deshpande (Member B)

import { RefreshCw, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Card, Notice, Pill, errorMessage, formatDate, secondaryButtonClass } from "@/components/dsa/ui";
import type { AdminOverview, AdminUser, RefreshFunnelResult } from "./types";

export default function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
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
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-slate-500">
        <ShieldAlert size={32} />
        <p className="text-lg font-medium text-slate-700">Admins only</p>
        <p className="text-sm">Sign in with an admin account to see this page.</p>
      </div>
    );
  }

  const tiles = overview ? [
    { label: "Users", value: overview.users },
    { label: "Students", value: overview.students },
    { label: "Problems", value: overview.problems },
    { label: "Applications", value: overview.applications },
    { label: "Offers", value: overview.offers },
    { label: "Embeddings current", value: `${overview.embeddings.Current}/${overview.problems}` },
  ] : [];

  return (
    <div className="space-y-6">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="text-2xl font-semibold tabular-nums text-slate-900">{t.value}</div>
          </div>
        ))}
      </div>

      <Card title="Users" actions={
        <div className="flex items-center gap-3 text-xs text-slate-500">
          Funnel refreshed {formatDate(overview?.funnel_refreshed_at)}
          <button className={secondaryButtonClass} onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh funnel
          </button>
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3 text-right">Problems</th>
                <th className="py-2 pr-3 text-right">To revisit</th>
                <th className="py-2 pr-3 text-right">Mastered</th>
                <th className="py-2 pr-3 text-right">Applications</th>
                <th className="py-2 pr-3 text-right">OA clear %</th>
                <th className="py-2 text-right">Offers</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-slate-900">{typeof u.full_name === "string" ? u.full_name : u.email}</div>
                    <div className="text-xs text-slate-500">{u.email}{u.leetcode_username ? ` · LC ${u.leetcode_username}` : ""}</div>
                  </td>
                  <td className="py-2 pr-3"><Pill label={u.role} /></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{u.dsa.problems}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{u.dsa.revisit_needed}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{u.dsa.mastered}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{u.funnel?.total_applications ?? "—"}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{u.funnel?.oa_clear_rate_pct ?? "—"}</td>
                  <td className="py-2 text-right tabular-nums">{u.funnel?.offers ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
