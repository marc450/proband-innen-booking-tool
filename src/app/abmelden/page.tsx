import { parseContactKey, loadContact } from "@/lib/unsubscribe";
import { AbmeldenForm } from "./abmelden-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Abmelden | EPHIA",
  robots: { index: false, follow: false },
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#FAEBE1] flex items-center justify-center px-5 py-12">
    <div className="max-w-lg w-full bg-white rounded-[10px] shadow-sm p-8 md:p-10">
      {children}
    </div>
  </div>
);

export default async function AbmeldenPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const key = parseContactKey(id);

  if (!key) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3 text-center">Link ungültig</h1>
        <p className="text-sm text-black/70 text-center">
          Dieser Abmelde-Link ist nicht gültig. Bei Fragen schreib uns
          unter{" "}
          <a
            href="mailto:customerlove@ephia.de"
            className="text-[#0066FF] underline"
          >
            customerlove@ephia.de
          </a>
          .
        </p>
      </Shell>
    );
  }

  const contact = await loadContact(key);

  if (!contact) {
    // Unknown ID. Don't reveal whether it existed and was deleted vs
    // never existed.
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3 text-center">
          Link nicht gefunden
        </h1>
        <p className="text-sm text-black/70 text-center">
          Wir konnten Dich nicht zuordnen. Bei Fragen schreib uns unter{" "}
          <a
            href="mailto:customerlove@ephia.de"
            className="text-[#0066FF] underline"
          >
            customerlove@ephia.de
          </a>
          .
        </p>
      </Shell>
    );
  }

  // Self-opt-out via the link sets unsubscribed_at. Manual deactivation
  // by staff would leave unsubscribed_at null even with status=inactive.
  const alreadyOptedOut =
    contact.status === "inactive" && contact.unsubscribedAt != null;

  return (
    <Shell>
      <AbmeldenForm
        contactId={`${key.kind}-${key.id}`}
        firstName={contact.firstName}
        initialOptedOut={alreadyOptedOut}
      />
    </Shell>
  );
}
