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
    label: "Gesichtsverschmälerung / Masseter / Bruxismus",
    description: "Kieferbreite reduzieren, Zähneknirschen, Kieferpressen",
    min: 5,
    max: 9,
    // Masseter has its own standalone treatment card on the Proband:innen
    // overview (deep-links into this flow via ?indication=masseter), so it
    // is hidden from the in-funnel indication picker to avoid a duplicate
    // entry point. It stays a valid IndicationKey because the deep-link
    // flow and the reserved-seat merge logic are keyed on it.
    hiddenFromPicker: true,
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

// Indications surfaced in the in-funnel picker (slot-selection). Masseter
// is excluded because it has its own standalone overview card; the picker
// is then left with the long-tail indications only.
export const PICKER_INDICATIONS = INDICATIONS.filter(
  (i) => !("hiddenFromPicker" in i) || !i.hiddenFromPicker,
);

export type IndicationKey = (typeof INDICATIONS)[number]["key"];

export function indicationMeta(key: IndicationKey) {
  return INDICATIONS.find((i) => i.key === key)!;
}
