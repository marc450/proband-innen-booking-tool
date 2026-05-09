// Free Botox Tutorial CTA. Used to be a lead-capture dialog with
// firstName/lastName/email + LearnWorlds SSO follow-up; now just
// links straight to the in-house LMS reader since the tutorial is
// fully open and lives on study.ephia.de. Keeping the same exported
// shape (label / size / variant) so call sites don't need updates.
import Link from "next/link";

const COURSE_URL = "https://study.ephia.de/kostenloser-botox-kurs";

export function SignupCta({
  label = "Jetzt kostenlos starten",
  size = "default",
  variant = "primary",
}: {
  label?: string;
  /** "hero" makes the button bigger, "default" matches inline CTAs. */
  size?: "default" | "hero";
  /** "inverse" swaps to white bg / blue text for use on the blue CTA banner. */
  variant?: "primary" | "inverse";
}) {
  const padding =
    size === "hero"
      ? "px-7 py-4 text-base md:text-lg"
      : "px-6 py-3 text-sm md:text-base";
  const colors =
    variant === "inverse"
      ? "bg-white text-[#0066FF] hover:bg-white/90"
      : "bg-[#0066FF] text-white hover:bg-[#0055DD]";
  const buttonClasses = `inline-block font-bold rounded-[10px] transition-colors ${padding} ${colors}`;

  return (
    <Link href={COURSE_URL} className={buttonClasses}>
      {label}
    </Link>
  );
}
