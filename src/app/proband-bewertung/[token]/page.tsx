import { createAdminClient } from "@/lib/supabase/admin";
import { ProbandReviewForm } from "./review-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Deine Bewertung | EPHIA",
  description:
    "Teile Deinen Eindruck zu Deiner Behandlung als Proband:in bei EPHIA. Du bewertest mit Sternen und schreibst ein paar Worte zu Deiner Erfahrung.",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

// Public review-submission landing for Proband:innen. The token is the only
// auth: it is minted for the one-time review-request pass and lives on the
// patient (single review per proband, enforced by the UNIQUE constraint on
// proband_reviews.patient_id).
export default async function ProbandBewertungPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: patient } = await supabase
    .from("patients")
    .select(`id, proband_reviews ( id )`)
    .eq("review_submit_token", token)
    .maybeSingle();

  if (!patient) {
    return <Shell>{<NotFoundCard />}</Shell>;
  }

  const alreadySubmitted =
    Array.isArray(patient.proband_reviews) && patient.proband_reviews.length > 0;

  if (alreadySubmitted) {
    return <Shell>{<AlreadyDoneCard />}</Shell>;
  }

  return (
    <Shell>
      <ProbandReviewForm token={token} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-screen w-full flex items-start sm:items-center justify-center px-4 py-10 sm:py-16"
      style={{ backgroundColor: "#FAEBE1" }}
    >
      <div className="w-full max-w-xl">{children}</div>
    </main>
  );
}

function NotFoundCard() {
  return (
    <div className="bg-white rounded-[10px] shadow-sm p-8 text-left">
      <h1 className="text-2xl font-bold mb-3">Link ungültig</h1>
      <p className="text-base leading-relaxed text-gray-700">
        Dieser Bewertungslink ist nicht mehr gültig. Bitte schreibe uns kurz,
        dann schicken wir Dir einen frischen Link:{" "}
        <a
          href="mailto:customerlove@ephia.de"
          className="font-semibold"
          style={{ color: "#0066FF" }}
        >
          customerlove@ephia.de
        </a>
      </p>
    </div>
  );
}

function AlreadyDoneCard() {
  return (
    <div className="bg-white rounded-[10px] shadow-sm p-8 text-left">
      <h1 className="text-2xl font-bold mb-3">Danke, Deine Bewertung ist da</h1>
      <p className="text-base leading-relaxed text-gray-700">
        Wir haben Deine Antwort bereits erhalten. Falls Du noch etwas ergänzen
        möchtest, schreib uns einfach an{" "}
        <a
          href="mailto:customerlove@ephia.de"
          className="font-semibold"
          style={{ color: "#0066FF" }}
        >
          customerlove@ephia.de
        </a>
        .
      </p>
    </div>
  );
}
