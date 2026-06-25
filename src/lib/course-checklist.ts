// Kursbetreuung course checklist template.
//
// This is the single source of truth for the checklist items, their
// phase grouping and order. Edit this file to add, remove, or reword
// items. The per-session state (checked / by whom / when) lives in the
// `course_checklist_items` table, keyed by the stable `key` below.
//
// IMPORTANT: keys are stable identifiers. Reword a `label` freely, but
// never change a `key` after go-live — saved checkmarks are matched by
// key, so changing one would orphan the existing state for that item.
// Some items intentionally repeat across phases (e.g. Kompressen
// auffüllen vor und nach dem Kurs); they each get a distinct key.

export interface ChecklistItem {
  key: string;
  label: string;
}

export interface ChecklistPhase {
  phase: string;
  items: ChecklistItem[];
}

export const COURSE_CHECKLIST: ChecklistPhase[] = [
  {
    phase: "Vor Kursbeginn",
    items: [
      { key: "vor.verpflegung", label: "Verpflegung gekauft und ausgelegt" },
      { key: "vor.kompressen", label: "Kompressen und Handschuhe sind aufgefüllt" },
      { key: "vor.papier", label: "Papier- und Toilettenpapier ist vorhanden" },
      { key: "vor.liegenrollen", label: "Papierrollen für Liegen sind aufgefüllt" },
      { key: "vor.goodybags", label: "Goody Bags sind vorbereitet" },
      { key: "vor.caps", label: "Caps wurden am Tresen ausgelegt" },
      { key: "vor.tshirt", label: "Ein T-Shirt wurde beim Tresen aufgehängt" },
    ],
  },
  {
    phase: "Während dem Kurs",
    items: [
      {
        key: "waehrend.status",
        label:
          'Status der erschienenen Ärzt:innen und Proband:innen von "gebucht" auf "erschienen" gesetzt',
      },
      {
        key: "waehrend.galderma",
        label:
          "Einwilligung zur Datenübertragung an Galderma von den einzelnen (Zahn-)Ärzt:innen eingeholt",
      },
      {
        key: "waehrend.fotos",
        label: "Vorher-Nachher-Fotos von Proband:innen gemacht",
      },
      { key: "waehrend.socialmedia", label: "Social-Media-Material aufgenommen" },
    ],
  },
  {
    phase: "Nach Kursende",
    items: [
      { key: "nach.kompressen", label: "Kompressen und Handschuhe aufgefüllt" },
      { key: "nach.papier", label: "Papier- und Toilettenpapier gecheckt" },
      { key: "nach.liegenrollen", label: "Papierrollen für Liegen aufgefüllt" },
      { key: "nach.bestellblatt", label: "Bestellblatt ausgefüllt" },
      { key: "nach.kueche", label: "Küche: alles trocken und aufgeräumt" },
      { key: "nach.spuelmaschine", label: "Spülmaschine an" },
      { key: "nach.fenster", label: "Fenster geschlossen" },
      { key: "nach.lichter", label: "Lichter gelöscht" },
      { key: "nach.tuer", label: "Tür verriegelt" },
    ],
  },
];

/** Every valid item key, in order. */
export const CHECKLIST_ITEM_KEYS: string[] = COURSE_CHECKLIST.flatMap((p) =>
  p.items.map((i) => i.key),
);

/** Total number of checklist items across all phases. */
export const CHECKLIST_TOTAL = CHECKLIST_ITEM_KEYS.length;

const VALID_KEYS = new Set(CHECKLIST_ITEM_KEYS);

/** Guard for incoming item keys from the client. */
export function isValidChecklistKey(key: unknown): key is string {
  return typeof key === "string" && VALID_KEYS.has(key);
}
