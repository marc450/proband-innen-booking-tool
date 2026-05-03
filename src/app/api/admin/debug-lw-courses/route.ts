import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listUserProgress, lwFetchRaw } from "@/lib/learnworlds";

// Admin-only diagnostic that dumps the raw LearnWorlds response for a
// single contact's enrollments. Used when /mein-konto progress bars
// aren't appearing — the response shape tells us which field on each
// course we should match against course_templates (id vs course_id vs
// slug etc.). Read-only, no destructive calls, no persistent state.
//
// Usage: GET /api/admin/debug-lw-courses?email=foo@bar.de
//   - Returns { contact, courses }, or { contact, error } on LW failure.
//   - 403 unless the caller has profiles.role = 'admin'.
//   - 404 if no auszubildende row matches the email.

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return user;
  return null;
}

export async function GET(req: NextRequest) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "?email= required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Look up via primary email first, then aliases.
  let contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    lw_user_id: string | null;
  } | null = null;

  const { data: byPrimary } = await admin
    .from("auszubildende")
    .select("id, first_name, last_name, email, lw_user_id")
    .ilike("email", email)
    .maybeSingle();
  contact = byPrimary;

  if (!contact) {
    const { data: byAlias } = await admin
      .from("auszubildende_emails")
      .select("auszubildende:auszubildende_id(id, first_name, last_name, email, lw_user_id)")
      .eq("email", email)
      .maybeSingle<{
        auszubildende: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          lw_user_id: string | null;
        } | null;
      }>();
    contact = byAlias?.auszubildende ?? null;
  }

  if (!contact) {
    return NextResponse.json({ error: "No contact for that email" }, { status: 404 });
  }

  if (!contact.lw_user_id) {
    return NextResponse.json({
      contact,
      note: "No lw_user_id set on this contact. /mein-konto can't fetch progress without it.",
    });
  }

  // Pull the enrollment list. We then probe two additional shapes so
  // we can see where progress data actually lives:
  //   - GET /v2/users/{id}/courses/{course_id}  (detail of a single
  //     enrollment — most LMSes attach progress here)
  //   - GET /v2/users/{id}/progress              (aggregate, may 404)
  // Each probe is wrapped so a single 404 doesn't fail the whole
  // diagnostic.
  // Both probes are read-only and survive 404s. The progress endpoint
  // is what /mein-konto consumes; the courses endpoint is included
  // for parity in case anyone wants to inspect enrollments.
  const courses = await probeRaw(
    `/v2/users/${encodeURIComponent(contact.lw_user_id)}/courses`,
  );

  let progress: unknown = null;
  let progressError: string | null = null;
  try {
    progress = await listUserProgress(contact.lw_user_id);
  } catch (err) {
    progressError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    contact,
    courses,
    progress,
    progressError,
  });
}

// Tiny inline fetcher used only for probing — bypasses the typed
// listUserCourses helper so we can see whatever LW actually returns,
// 404 included. Still goes through lwFetch so the destructive-call
// guards are in force (they only fire on DELETE; this is GET-only).
async function probeRaw(path: string | null): Promise<unknown> {
  if (!path) return { skipped: true, reason: "no path" };
  try {
    return await lwFetchRaw(path);
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
