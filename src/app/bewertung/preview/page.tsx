import { ReviewForm } from "../[token]/review-form";

export const dynamic = "force-static";
export const metadata = {
  title: "Bewertungs-Vorschau | EPHIA",
  // No-index so Google doesn't surface a fake preview review page.
  robots: { index: false, follow: false },
};

// Public preview of the bewertung form. Identical UI to the live
// /bewertung/[token] route, but submissions are short-circuited via
// previewMode so nothing lands in course_reviews. Used for screenshotting,
// stakeholder demos, and visual QA without minting a real token.
export default function BewertungPreviewPage() {
  return (
    <main
      className="min-h-screen w-full flex items-start sm:items-center justify-center px-4 py-10 sm:py-16"
      style={{ backgroundColor: "#FAEBE1" }}
    >
      <div className="w-full max-w-xl space-y-4">
        <div
          className="rounded-[10px] px-4 py-3 text-sm font-semibold"
          style={{ backgroundColor: "#0066FF", color: "#ffffff" }}
        >
          Vorschau, keine Bewertung wird gespeichert.
        </div>
        <ReviewForm
          token="preview"
          defaultFirstName="Anna"
          previewMode
        />
      </div>
    </main>
  );
}
