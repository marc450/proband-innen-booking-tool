import { redirect } from "next/navigation";

// The dashboard landing page now redirects to the Kurstermine view
// (Auszubildende course sessions). The old Behandlungstermine content
// moved to /dashboard/behandlungstermine.
export default function DashboardPage() {
  redirect("/dashboard/auszubildende");
}
