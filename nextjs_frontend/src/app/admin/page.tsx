// /admin: admin-only overview. The API enforces the role (Flask require_role
// plus admin_role in the database); the page shows "Admins only" on a 403.
// Owner: Bhooshan Deshpande (Member B)

import AdminDashboard from "@/components/admin/AdminDashboard";
import { Page } from "@/components/dsa/ui";

export default function AdminPage() {
  return (
    <Page icon="🛡️" title="Admin" description="Every user, their placement funnel and DSA progress, and system totals.">
      <AdminDashboard />
    </Page>
  );
}
