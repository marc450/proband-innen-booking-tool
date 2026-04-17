import { createAdminClient } from "@/lib/supabase/admin";
import { EinladungCheckout } from "./checkout-client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "EPHIA Einladung",
  robots: { index: false, follow: false },
};

export default async function EinladungPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("booking_invites")
    .select(
      "token, template_id, session_id, course_type, recipient_email, recipient_name, expires_at, revoked, used_count, max_uses, course_templates(title, course_key, course_label_de), course_sessions(label_de, date_iso)",
    )
    .eq("token", token)
    .maybeSingle();

  // Tiny shared outer wrapper
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#FAEBE1] flex items-center justify-center px-5 py-12">
      <div className="max-w-lg w-full bg-white rounded-[10px] shadow-sm p-8 md:p-10 text-center">
        {children}
      </div>
    </div>
  );

  if (!invite) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung nicht gefunden</h1>
        <p className="text-sm text-black/70">
          Der Link ist ungültig oder wurde entfernt. Schreib uns gerne unter{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }

  if (invite.revoked) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung widerrufen</h1>
        <p className="text-sm text-black/70">
          Diese Einladung ist nicht mehr gültig. Bitte wende Dich an{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung abgelaufen</h1>
        <p className="text-sm text-black/70">
          Der Einlösezeitraum ist vorbei. Bitte wende Dich an{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }
  if (invite.used_count >= invite.max_uses) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-3">Einladung bereits eingelöst</h1>
        <p className="text-sm text-black/70">
          Diese Einladung wurde bereits genutzt. Bei Fragen schreib uns unter{" "}
          <a href="mailto:customerlove@ephia.de" className="text-[#0066FF] underline">customerlove@ephia.de</a>.
        </p>
      </Shell>
    );
  }

  // The `course_templates(...)` / `course_sessions(...)` joins come back
  // as arrays from the type generator; the runtime shape is a single row.
  // Cast defensively so the render is happy on both ends.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tmpl = (invite.course_templates as any) ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sess = (invite.course_sessions as any) ?? null;

  const courseLabel = tmpl?.course_label_de || tmpl?.title || "EPHIA Kurs";
  const courseKey = tmpl?.course_key || "";
  const sessionLabel = sess?.label_de || sess?.date_iso || null;

  const variantLabel =
    invite.course_type === "Premium"
      ? "Komplettpaket"
      : invite.course_type;

  return (
    <Shell>
      <h1 className="text-2xl md:text-3xl font-bold mb-2">
        {invite.recipient_name ? `Hi ${invite.recipient_name}!` : "Deine Einladung"}
      </h1>
      <p className="text-sm text-black/70 mb-6">
        Wir freuen uns, Dich im folgenden Kurs begrüßen zu dürfen:
      </p>

      <div className="bg-[#FAEBE1] rounded-[10px] p-5 text-left mb-6 space-y-1.5 text-sm">
        <p><span className="font-semibold">Kurs:</span> {courseLabel}</p>
        <p><span className="font-semibold">Variante:</span> {variantLabel}</p>
        {sessionLabel && (
          <p><span className="font-semibold">Termin:</span> {sessionLabel}</p>
        )}
      </div>

      <EinladungCheckout
        token={invite.token}
        courseKey={courseKey}
        courseType={invite.course_type}
        sessionId={invite.session_id}
      />

      <p className="text-xs text-black/50 mt-4">
        Nach dem Klick wirst Du zur sicheren Stripe-Kasse weitergeleitet.
      </p>
    </Shell>
  );
}
