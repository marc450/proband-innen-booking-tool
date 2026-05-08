import { redirect } from "next/navigation";

// Default dashboard route lands on the unified Kurse table — the merge
// of the old Auszubildende sessions overview and Behandlungstermine.
export default function DashboardPage() {
  redirect("/dashboard/kurse");
}
