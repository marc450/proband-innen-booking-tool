import type { SupabaseClient } from "@supabase/supabase-js";

// Resolve a free-text instructor_name (as stored on course_sessions) back
// to a profiles.id. The original implementation in auto-create-satellite
// used a naive `[title, first_name, last_name].join(" ") === instructor_name`
// equality and additionally filtered to `is_dozent = true`, which broke in
// two real ways:
//
//   1. Doctors who were never flagged is_dozent (or got unflagged later)
//      were skipped entirely. Result: instructor_id stayed NULL on the
//      satellite even though the instructor_name was sitting right there.
//   2. Tiny title differences ("Dr." vs "Dr. med." vs "Kein Titel") made
//      the equality fail. Result: again NULL.
//
// This helper is more forgiving:
//   - No is_dozent filter — match by name across all staff profiles.
//   - Three passes from strict to loose, in order, and returns the first
//     match.

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

interface ProfileLike {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
}

export async function resolveInstructorIdFromName(
  supabase: SupabaseClient,
  instructorName: string | null | undefined,
): Promise<string | null> {
  if (!instructorName) return null;
  const supplied = normalize(instructorName);
  if (!supplied) return null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, title, first_name, last_name");

  if (!profiles) return null;

  // Pass 1: exact match including title prefix.
  for (const p of profiles as ProfileLike[]) {
    if (!p.first_name && !p.last_name) continue;
    const withTitle = normalize(
      [p.title, p.first_name, p.last_name].filter(Boolean).join(" "),
    );
    if (withTitle && withTitle === supplied) return p.id;
  }

  // Pass 2: exact match ignoring the title (covers "Dr." vs "Dr. med." vs
  // "Kein Titel" sentinels and any title drift).
  for (const p of profiles as ProfileLike[]) {
    if (!p.first_name || !p.last_name) continue;
    const noTitle = normalize(`${p.first_name} ${p.last_name}`);
    if (noTitle && noTitle === supplied) return p.id;
  }

  // Pass 3: instructor_name "ends with" first+last (anything before
  // first_name is treated as a title prefix). Catches "Dr. med. univ.
  // Sophia Wilk-Vollmann" → first_name "Sophia", last_name "Wilk-Vollmann".
  for (const p of profiles as ProfileLike[]) {
    if (!p.first_name || !p.last_name) continue;
    const noTitle = normalize(`${p.first_name} ${p.last_name}`);
    if (noTitle && supplied.endsWith(noTitle)) return p.id;
  }

  return null;
}
