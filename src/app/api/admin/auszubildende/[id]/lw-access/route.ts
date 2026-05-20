import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listUserProgress } from "@/lib/learnworlds";
import { enrollInLearnWorlds } from "@/lib/post-purchase";

// Each LW call can take a few seconds; the POST does up to 3 sequential
// calls (create-user, get-user fallback, enroll). Default platform timeouts
// (10s on some configs) cause the browser to see "Failed to fetch" when
// LW is slow. Bump the function timeout so the request can complete cleanly.
export const maxDuration = 60;

// Per-Auszubildende LMS-Zugriff diagnostic + repair.
//
// GET /api/admin/auszubildende/[id]/lw-access
//   Returns the set of courses this contact has bought
//   (course_bookings → course_templates) joined with what LW says they
//   can access (listUserProgress on lw_user_id). Each item carries a
//   status:
//     - "enrolled"        → LW knows about it, all good
//     - "missing"         → bought via us but LW has no enrollment
//     - "no_lw_template"  → template lacks online_course_id, can't be
//                           checked / granted automatically
//   "missing" is the actionable state: it's the duplicate-email scenario
//   (Annett bought course X under @gmx.de, logs in via @web.de and the
//   @web.de LW account doesn't have it).
//
// POST /api/admin/auszubildende/[id]/lw-access
//   Body: { lwCourseId: string }
//   Grants the contact's LW account access to the given course by
//   calling enrollInLearnWorlds(email, lwCourseId, ...). Logged in
//   admin_actions for audit. 403 unless caller is admin.

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

interface LwAccessItem {
  bookingId: string | null;
  templateId: string | null;
  templateTitle: string;
  lwCourseId: string | null;
  courseType: string | null;
  // "enrolled"        → bought via us AND LW knows about it.
  // "missing"         → bought via us but LW has no enrollment.
  // "no_lw_template"  → bought via us but template lacks an
  //                     online_course_id, can't be checked.
  // "lw_only"         → LW has the enrollment but we have no
  //                     course_bookings row. Typical for legacy
  //                     LW user imports (legacy_bookings) and for
  //                     enrollments granted directly inside LW
  //                     bypassing our flow. Informational only.
  status: "enrolled" | "missing" | "no_lw_template" | "lw_only";
  progressPct: number | null;
  boughtAt: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Read via v_auszubildende — the canonical-email column was dropped
  // from the base table in migration 063 and only lives on the view
  // (which LEFT JOINs auszubildende_emails). Without this, contact
  // came back null and the panel rendered "Kontakt nicht gefunden."
  const { data: contact } = await admin
    .from("v_auszubildende")
    .select("id, email, first_name, last_name, lw_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!contact) {
    return NextResponse.json({ error: "Kontakt nicht gefunden." }, { status: 404 });
  }

  // Bookings this contact has, with the template's online_course_id so
  // we know which LW course the booking corresponds to.
  const { data: bookings } = await admin
    .from("course_bookings")
    .select(
      "id, course_type, status, created_at, template_id, course_templates(title, online_course_id)",
    )
    .eq("auszubildende_id", id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  // LW-side enrollments via the user_id we have on the row. If we don't
  // have an lw_user_id, the user has never been bridged into LW so all
  // bookings register as "missing" (action: enroll, which will also
  // create the LW user account on first call).
  let lwCourseIds = new Set<string>();
  let progressByCourse = new Map<string, number>();
  if (contact.lw_user_id) {
    try {
      const progress = await listUserProgress(contact.lw_user_id);
      for (const p of progress) {
        if (p.course_id) {
          lwCourseIds.add(p.course_id);
          const raw = p.progress_rate;
          const pct =
            typeof raw === "number"
              ? raw
              : typeof raw === "string"
                ? Number(raw)
                : NaN;
          if (Number.isFinite(pct)) {
            progressByCourse.set(p.course_id, Math.max(0, Math.min(100, pct)));
          }
        }
      }
    } catch (err) {
      // LW misbehaving — return what we have on the DB side, mark
      // every item as "missing" so the UI can still show the action
      // buttons.
      console.error("LW listUserProgress failed:", err);
      lwCourseIds = new Set();
      progressByCourse = new Map();
    }
  }

  const items: LwAccessItem[] = [];
  // Track which LW course_ids are "claimed" by a booking row, so we
  // can later list anything LW knows about that we don't.
  const claimedLwCourseIds = new Set<string>();

  for (const b of bookings ?? []) {
    // Supabase nests selected related rows; courses_template can come
    // back as object or array depending on the FK relation.
    const template = Array.isArray(b.course_templates)
      ? b.course_templates[0]
      : b.course_templates;
    const lwCourseId = template?.online_course_id ?? null;
    const status: LwAccessItem["status"] = !lwCourseId
      ? "no_lw_template"
      : lwCourseIds.has(lwCourseId)
        ? "enrolled"
        : "missing";
    if (lwCourseId) claimedLwCourseIds.add(lwCourseId);
    items.push({
      bookingId: b.id,
      templateId: b.template_id,
      templateTitle: template?.title ?? "—",
      lwCourseId,
      courseType: b.course_type ?? null,
      status,
      progressPct: lwCourseId ? (progressByCourse.get(lwCourseId) ?? null) : null,
      boughtAt: b.created_at,
    });
  }

  // LW-only enrollments: courses LW reports the user is enrolled in
  // that aren't matched by any booking row. Typical for legacy LW
  // user imports (we stored those in legacy_bookings, not
  // course_bookings) or for enrollments Marc granted directly inside
  // LW. We still want to surface them so the panel reflects the FULL
  // LMS picture — Annett's case has the Grundkurs here after the
  // merge moved her newer Aufbaukurs booking.
  const orphanLwIds = [...lwCourseIds].filter(
    (id) => !claimedLwCourseIds.has(id),
  );
  if (orphanLwIds.length > 0) {
    const { data: orphanTemplates } = await admin
      .from("course_templates")
      .select("id, title, online_course_id")
      .in("online_course_id", orphanLwIds);
    const titleByLwId = new Map<string, { templateId: string; title: string }>();
    for (const t of orphanTemplates ?? []) {
      if (t.online_course_id) {
        titleByLwId.set(t.online_course_id, {
          templateId: t.id,
          title: t.title,
        });
      }
    }
    for (const lwCourseId of orphanLwIds) {
      const tmpl = titleByLwId.get(lwCourseId);
      items.push({
        bookingId: null,
        templateId: tmpl?.templateId ?? null,
        templateTitle: tmpl?.title ?? lwCourseId,
        lwCourseId,
        courseType: null,
        status: "lw_only",
        progressPct: progressByCourse.get(lwCourseId) ?? null,
        boughtAt: null,
      });
    }
  }

  return NextResponse.json({
    email: contact.email,
    lwUserId: contact.lw_user_id,
    items,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  let lwCourseId: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.lwCourseId === "string") lwCourseId = body.lwCourseId.trim();
  } catch {
    // ignore — handled below
  }
  if (!lwCourseId) {
    return NextResponse.json({ error: "lwCourseId fehlt." }, { status: 400 });
  }

  const admin = createAdminClient();
  // v_auszubildende for the read — see GET handler for reasoning.
  const { data: contact } = await admin
    .from("v_auszubildende")
    .select("id, email, first_name, last_name")
    .eq("id", id)
    .maybeSingle();
  if (!contact) {
    return NextResponse.json({ error: "Kontakt nicht gefunden." }, { status: 404 });
  }
  if (!contact.email) {
    return NextResponse.json(
      { error: "Kontakt hat keine E-Mail-Adresse." },
      { status: 400 },
    );
  }

  let lwUserId: string | null = null;
  try {
    lwUserId = await enrollInLearnWorlds(
      contact.email,
      lwCourseId,
      contact.first_name ?? undefined,
      contact.last_name ?? undefined,
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "LW-Enrollment fehlgeschlagen.",
      },
      { status: 500 },
    );
  }

  if (!lwUserId) {
    return NextResponse.json(
      {
        error:
          "LW-Enrollment fehlgeschlagen. LearnWorlds hat keine User-ID zurueckgegeben. Bitte Logs pruefen.",
      },
      { status: 500 },
    );
  }

  // Pin the LW user_id on the auszubildende row so the panel can verify
  // enrollment on the next refresh without waiting for SSO login. Only
  // writes if currently null — duplicate-email scenarios may already have
  // a different LW account linked which we don't want to clobber.
  await admin
    .from("auszubildende")
    .update({ lw_user_id: lwUserId })
    .eq("id", id)
    .is("lw_user_id", null);

  await admin.from("admin_actions").insert({
    actor_id: caller.id,
    action_type: "lw_grant_access",
    target_table: "auszubildende",
    target_id: id,
    metadata: {
      email: contact.email,
      lw_course_id: lwCourseId,
      lw_user_id: lwUserId,
    },
  });

  return NextResponse.json({ ok: true, lwUserId });
}
