/**
 * Small uppercase kicker that sits above a section H1/H2.
 *
 * Inspired by the "ALTERNATIVE · 2-SPALTEN" preview label on the old
 * Unsere Kurse mock. Uses wide letter-spacing + muted color to feel
 * editorial without stealing attention from the real heading.
 *
 * Place ONE of these per section, directly above the heading.
 */
export function SectionEyebrow({
  children,
  tone = "dark",
  className = "",
}: {
  children: React.ReactNode;
  /** `light` = on dark/blue backgrounds, `dark` = on cream/white backgrounds. */
  tone?: "light" | "dark";
  className?: string;
}) {
  const color = tone === "light" ? "text-white/60" : "text-[#0066FF]/70";
  return (
    <p
      className={`text-xs font-semibold tracking-[0.3em] uppercase ${color} mb-3 ${className}`}
    >
      {children}
    </p>
  );
}
