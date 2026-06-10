// Static content for the standalone Masseter card shown on both the public
// Proband:innen overview (kurse/_components/sections/treatment-list.tsx) and
// the private referral overview (book/privat/courses-overview.tsx). Price and
// image come from the Therap. Indikationen course at render time so they stay
// in sync; only the masseter-specific copy lives here. Both overviews deep-link
// into the Therap. Indikationen flow with ?indication=masseter so the masseter
// indication is pre-selected and the picker is skipped.
export const MASSETER_CARD = {
  title: "__masseter__",
  treatmentTitle: "Gesichtsverschmälerung / Masseter / Bruxismus",
  // Dedicated card image, stored in the public Supabase `treatment-images`
  // bucket (next.config remotePatterns already allows that host + path).
  // To swap it, overwrite this file in the bucket or change the URL here.
  imageUrl:
    "https://hqjgugcehqfeempxvwkd.supabase.co/storage/v1/object/public/treatment-images/fleur-kaan-PG6Em2m7Ar4-unsplash.jpg",
  serviceDescription:
    "Im Rahmen dieses Kurses kannst Du eine Behandlung des Musculus masseter mit Botulinum durch eine:n approbierte:n Ärzt:in erhalten. Behandelt werden, je nach Ausgangssituation, Beschwerden wie Bruxismus (Zähneknirschen) und Kieferpressen oder eine Verschmälerung der Gesichtskontur. Ob eine Behandlung medizinisch sinnvoll ist, wird im Aufklärungsgespräch mit unseren Dozent:innen geprüft und in einem individuellen Behandlungsplan festgehalten. Das Ergebnis soll natürlich und harmonisch wirken. In vielen Praxen liegen die Preise für eine entsprechende Behandlung deutlich über unserem Richtpreis.",
  zones: {
    label: "Behandelbare Indikationen",
    items: [
      "Kieferbreite reduzieren (Gesichtsverschmälerung)",
      "Bruxismus / Zähneknirschen",
      "Kieferpressen",
    ],
  },
};
