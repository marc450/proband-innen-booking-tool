import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { InboxManager } from "./inbox-manager";

// The inbox breaks out of the dashboard's ml-14 px-8 py-6 padding so the
// three panes can fill the viewport edge-to-edge (minus the sidebar nav).
// We use negative margins to cancel the parent padding rather than
// restructuring the dashboard layout.
//
// Admin-only: the customerlove mailbox is shared and Nutzer:innen must
// not see cross-customer correspondence. Nav already hides this link for
// them; this server redirect enforces it against direct URL access.
export default async function InboxPage() {
  if (!(await isAdmin())) redirect("/dashboard");
  return (
    <div className="fixed top-0 bottom-0 left-14 right-0 bg-white">
      <InboxManager />
    </div>
  );
}
