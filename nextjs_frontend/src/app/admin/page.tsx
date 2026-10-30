// /admin: admin-only overview (the API enforces the role; the page shows
// "Admins only" when it answers 403).
// Owner: Bhooshan Deshpande (Member B)

import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-500">All users, placement funnels and system totals.</p>
      </header>
      <AdminDashboard />
    </main>
  );
}
