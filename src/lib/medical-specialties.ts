// Shared list of medical specialties (Fachrichtungen) used for
// dropdowns on the Ärzt:in profile, registration forms, and any
// future filter. Keep the list sorted alphabetically in German and
// add "Zahnmedizin" at the end so it visually separates from the
// human-medicine specialties.

export const MEDICAL_SPECIALTIES = [
  "Allgemeinmedizin",
  "Anästhesiologie",
  "Augenheilkunde",
  "Chirurgie",
  "Dermatologie",
  "Gynäkologie",
  "HNO",
  "Innere Medizin",
  "Kieferorthopädie",
  "Kinder- und Jugendmedizin",
  "MKG-Chirurgie",
  "Neurologie",
  "Orthopädie / Unfallchirurgie",
  "Phoniatrie",
  "Plastische Chirurgie",
  "Psychiatrie",
  "Radiologie",
  "Urologie",
  "Zahnmedizin",
] as const;

export type MedicalSpecialty = (typeof MEDICAL_SPECIALTIES)[number];
