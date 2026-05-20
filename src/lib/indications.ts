// Therapeutic indications for the "Aufbaukurs Botulinum - Therap.
// Indikationen" booking flow. Each indication has its own (min, max)
// quota per course: `max` is the hard cap surfaced to probands as
// "X von max. N Plätzen frei", `min` is the pedagogical floor staff
// use to decide whether a course is viable. Values are intentionally
// asymmetric since masseter draws far more demand than the other
// indications.

export const INDICATIONS = [
  {
    key: "masseter",
    label: "Masseter / Bruxismus / Gesichtsverschmälerung",
    description: "Kieferbreite reduzieren, Zähneknirschen, Kieferpressen",
    min: 5,
    max: 9,
  },
  {
    key: "migraene",
    label: "Kopfschmerzen",
    description: "Chronische Migräne, Spannungskopfschmerz",
    min: 1,
    max: 3,
  },
  {
    key: "hyperhidrose",
    label: "Hyperhidrose",
    description: "Schwitzen unter den Achseln reduzieren",
    min: 1,
    max: 3,
  },
] as const;

export type IndicationKey = (typeof INDICATIONS)[number]["key"];

export function indicationMeta(key: IndicationKey) {
  return INDICATIONS.find((i) => i.key === key)!;
}
