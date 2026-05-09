import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listUserProgress } from "@/lib/learnworlds";
import { enrollInLearnWorlds } from "@/lib/post-purchase";

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
  templateId: string;
  templateTitle: string;
  lwCourseId: string | null;
  courseType: string | null;
  status: "enrolled" | "missing" | "no_lw_template";
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

  const { data: contact } = await admin
    .from("auszubildende")
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

  const items: LwAccessItem[] = (bookings ?? []).map((b) => {
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
    return {
      bookingId: b.id,
      templateId: b.template_id,
      templateTitle: template?.title ?? "—",
      lwCourseId,
      courseType: b.course_type ?? null,
      status,
      progressPct: lwCourseId ? (progressByCourse.get(lwCourseId) ?? null) : null,
      boughtAt: b.created_at,
    };
  });

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
  const { data: contact } = await admin
    .from("auszubildende")
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

  try {
    await enrollInLearnWorlds(
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

  await admin.from("admin_actions").insert({
    actor_id: caller.id,
    action_type: "lw_grant_access",
    target_table: "auszubildende",
    target_id: id,
    metadata: {
      email: contact.email,
      lw_course_id: lwCourseId,
    },
  });

  return NextResponse.json({ ok: true });
}
