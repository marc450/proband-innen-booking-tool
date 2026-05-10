import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Deine Bewertung | EPHIA",
  description:
    "Teile Deinen Eindruck zu Deinem EPHIA-Kurs. Du bewertest mit Sternen und gibst optional ein anonymes Feedback an unser Team.",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

// Public review-submission landing. The token is the only auth: it is
// generated when the post-course email is scheduled and is single-use
// (a booking can only carry one review). We deliberately do not show
// the token in the URL anywhere else, so leaking the link is the same
// as leaking the booking's review write capability.
export default async function BewertungPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("course_bookings")
    .select(`id, course_reviews ( id )`)
    .eq("review_submit_token", token)
    .maybeSingle();

  if (!booking) {
    return <Shell>{<NotFoundCard />}</Shell>;
  }

  // booking.course_reviews is an array because of the FK direction.
  // Single review per booking is enforced by the UNIQUE constraint on
  // course_reviews.booking_id, so length 1 means already-submitted.
  const alreadySubmitted =
    Array.isArray(booking.course_reviews) && booking.course_reviews.length > 0;

  if (alreadySubmitted) {
    return <Shell>{<AlreadyDoneCard />}</Shell>;
  }

  return (
    <Shell>
      <ReviewForm token={token} />
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
        Dieser Bewertungslink ist nicht mehr gültig oder gehört zu einer
        anderen Buchung. Bitte schreibe uns kurz, dann schicken wir Dir
        einen frischen Link:{" "}
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
        Wir haben Deine Antwort bereits erhalten. Falls Du noch etwas
        ergänzen möchtest, schreib uns einfach an{" "}
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
