import { InboxManager } from "./inbox-manager";

// The inbox breaks out of the dashboard's ml-14 px-8 py-6 padding so the
// three panes can fill the viewport edge-to-edge (minus the sidebar nav).
// We use negative margins to cancel the parent padding rather than
// restructuring the dashboard layout.
export default function InboxPage() {
  return (
    <div className="fixed top-0 bottom-0 left-14 right-0 bg-white">
      <InboxManager />
    </div>
  );
}
