import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildOnlinekursEmail,
  buildPraxiskursEmail,
  buildKombikursEmail,
  buildCommunityInviteEmail,
  buildProbandinnenInfoEmail,
  formatDateDe,
} from "@/lib/course-email-templates";
import { buildEmailHtml } from "@/lib/email-template";
import { archiveSentMessage } from "@/lib/gmail";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SLACK_WEBHOOK_URL_COURSES = process.env.SLACK_WEBHOOK_URL_COURSES;
const LEARNWORLDS_API_URL = process.env.LEARNWORLDS_API_URL;
const LEARNWORLDS_CLIENT_ID = process.env.LEARNWORLDS_CLIENT_ID;
const LEARNWORLDS_ACCESS_TOKEN = process.env.LEARNWORLDS_ACCESS_TOKEN;
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export type CourseType = "Onlinekurs" | "Praxiskurs" | "Kombikurs" | "Premium";

export interface PostPurchaseData {
  bookingId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  courseType: CourseType;
  courseKey: string;
  templateId: string;
  sessionId: string | null;
  sessionLabel: string;
  amountTotal: number;
  audienceTag: string;
  // Profile fields for HubSpot
  profileTitle?: string;
  profileGender?: string;
  profileSpecialty?: string;
}

// ── Shared email sender ──
export async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string }[]
) {
  if (!RESEND_API_KEY) return;
  const payload: Record<string, unknown> = {
    from: "EPHIA <customerlove@ephia.de>",
    to: [to],
    subject,
    html,
  };
  if (attachments?.length) {
    payload.attachments = attachments;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // Mirror into the customerlove Gmail Sent folder so the contact-profile
  // email history (which queries Gmail directly) shows the send. Best-
  // effort: a Gmail outage or missing token must never fail the actual
  // Resend send above.
  try {
    await archiveSentMessage({
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        mimeType: mimeTypeForFilename(a.filename),
      })),
    });
  } catch (err) {
    console.error("archiveSentMessage failed (non-fatal):", err);
  }
}

function mimeTypeForFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".csv")) return "text/csv";
  return "application/octet-stream";
}

// ── Compute end time from start + duration ──
function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const endM = String(totalMinutes % 60).padStart(2, "0");
  return `${endH}:${endM}`;
}

// ── LearnWorlds enrollment ──
// Returns the LW user_id on success (whether the user was just created or
// already existed and we just enrolled them), null if env is missing or the
// call failed. Callers can persist the returned id to
// `auszubildende.lw_user_id` so the LMS-Zugriff panel can verify the
// enrollment without waiting for the user to log in via SSO.
//
// Each LW fetch has a 15s timeout: if LW hangs we'd otherwise block the
// caller for the entire serverless function lifetime, which surfaces to the
// browser as "Failed to fetch" when the platform proxy gives up.
export async function enrollInLearnWorlds(
  email: string,
  courseId: string,
  firstName?: string,
  lastName?: string,
): Promise<string | null> {
  if (!LEARNWORLDS_API_URL || !LEARNWORLDS_CLIENT_ID || !LEARNWORLDS_ACCESS_TOKEN) {
    console.warn("LearnWorlds env vars not configured, skipping enrollment");
    return null;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${LEARNWORLDS_ACCESS_TOKEN}`,
    "Lw-Client": LEARNWORLDS_CLIENT_ID,
  };
  const baseUrl = LEARNWORLDS_API_URL.replace(/\/$/, "");
  const timeout = () => AbortSignal.timeout(15000);

  try {
    const createBody: Record<string, unknown> = { email, username: email };
    if (firstName) createBody.first_name = firstName;
    if (lastName) createBody.last_name = lastName;

    const createRes = await fetch(`${baseUrl}/v2/users`, {
      method: "POST",
      headers,
      body: JSON.stringify(createBody),
      signal: timeout(),
    });
    const createText = await createRes.text();

    let lwUserId: string | null = null;
    if (createRes.ok) {
      try { lwUserId = JSON.parse(createText)?.id ?? null; } catch { /* ignore */ }
    }
    if (!lwUserId) {
      const getRes = await fetch(`${baseUrl}/v2/users/${encodeURIComponent(email)}`, {
        headers,
        signal: timeout(),
      });
      const getText = await getRes.text();
      try { lwUserId = JSON.parse(getText)?.id ?? null; } catch { /* ignore */ }
    }
    if (!lwUserId) {
      console.error("LearnWorlds: could not determine user ID, skipping enrollment");
      return null;
    }

    const enrollRes = await fetch(`${baseUrl}/v2/users/${lwUserId}/enrollment`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId: courseId, productType: "course", price: 0 }),
      signal: timeout(),
    });
    const enrollText = await enrollRes.text();
    if (!enrollRes.ok) {
      console.error(`LearnWorlds enrollment error: ${enrollRes.status} ${enrollText}`);
      // Even if enrollment failed (e.g. "already enrolled"), the user_id is
      // valid — return it so we can still pin it on auszubildende.
      return lwUserId;
    }
    console.log(`LearnWorlds: enrolled ${email} (${lwUserId}) in course ${courseId} — ${enrollText}`);
    return lwUserId;
  } catch (err) {
    console.error("LearnWorlds enrollment failed:", err);
    return null;
  }
}

// Persist a freshly-resolved LW user_id back to the auszubildende row, but
// only if it doesn't already have one (so we don't clobber a previously
// linked LW account in duplicate-email scenarios — the merge flow handles
// those explicitly).
export async function persistLwUserIdForBooking(bookingId: string, lwUserId: string) {
  if (!lwUserId) return;
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("course_bookings")
    .select("auszubildende_id")
    .eq("id", bookingId)
    .maybeSingle();
  const auszId = booking?.auszubildende_id;
  if (!auszId) return;
  const { data: ausz } = await admin
    .from("auszubildende")
    .select("lw_user_id")
    .eq("id", auszId)
    .maybeSingle();
  if (ausz?.lw_user_id) return; // already linked
  await admin
    .from("auszubildende")
    .update({ lw_user_id: lwUserId })
    .eq("id", auszId)
    .is("lw_user_id", null);
}

// ── Run the full post-purchase flow ──
export async function runPostPurchaseFlow(
  data: PostPurchaseData,
  options?: {
    skipSlack?: boolean;
    // For multi-course checkouts (e.g. a multi-course invite) the flow runs
    // once per course, but these two emails are doctor-level, not
    // course-level. Skip them on all but one course so the doctor doesn't
    // receive duplicate community invites / Proband:innen-Infos.
    skipCommunityInvite?: boolean;
    skipProbandInfo?: boolean;
  },
) {
  const supabase = createAdminClient();

  // Fetch template
  const { data: template } = await supabase
    .from("course_templates")
    .select("*")
    .eq("id", data.templateId)
    .single();

  const courseLabelDe = template?.course_label_de || template?.title || "Kurs";

  // 1. Send confirmation email
  if (data.email) {
    try {
      let emailHtml: string;
      let emailSubject: string;

      if (data.courseType === "Onlinekurs") {
        const courseName = template?.name_online || courseLabelDe;
        emailSubject = `Buchungsbestätigung: ${courseName}`;
        emailHtml = buildOnlinekursEmail(data.firstName, courseName);
      } else if (data.courseType === "Praxiskurs") {
        const courseName = template?.name_praxis || courseLabelDe;
        emailSubject = `Buchungsbestätigung: ${courseName}`;
        let praxisInfo = { address: "", dateFormatted: data.sessionLabel, startTime: "", endTime: "", instructor: "" };
        if (data.sessionId) {
          const { data: sess } = await supabase.from("course_sessions").select("*").eq("id", data.sessionId).single();
          if (sess) {
            praxisInfo = {
              address: sess.address || "",
              dateFormatted: sess.date_iso ? formatDateDe(sess.date_iso) : sess.label_de || "",
              startTime: sess.start_time || "",
              endTime: sess.start_time && sess.duration_minutes ? computeEndTime(sess.start_time, sess.duration_minutes) : "",
              instructor: sess.instructor_name || "",
            };
          }
        }
        emailHtml = buildPraxiskursEmail(data.firstName, courseName, praxisInfo, { hasOnlineCourse: !!template?.online_course_id });
      } else {
        const courseName = data.courseType === "Premium" ? "Komplettpaket" : (template?.name_kombi || courseLabelDe);
        emailSubject = `Buchungsbestätigung: ${courseName}`;
        let praxisInfo = { address: "", dateFormatted: data.sessionLabel, startTime: "", endTime: "", instructor: "" };
        if (data.sessionId) {
          const { data: sess } = await supabase.from("course_sessions").select("*").eq("id", data.sessionId).single();
          if (sess) {
            praxisInfo = {
              address: sess.address || "",
              dateFormatted: sess.date_iso ? formatDateDe(sess.date_iso) : sess.label_de || "",
              startTime: sess.start_time || "",
              endTime: sess.start_time && sess.duration_minutes ? computeEndTime(sess.start_time, sess.duration_minutes) : "",
              instructor: sess.instructor_name || "",
            };
          }
        }
        emailHtml = buildKombikursEmail(data.firstName, courseName, praxisInfo, { hasOnlineCourse: !!template?.online_course_id });
      }

      await sendEmailViaResend(data.email, emailSubject, emailHtml);
    } catch (emailErr) {
      console.error("Failed to send course confirmation email:", emailErr);
    }

    // Community invite
    if (!options?.skipCommunityInvite) {
      try {
        await sendEmailViaResend(data.email, "Willkommen in der EPHIA-Community!", buildCommunityInviteEmail(data.firstName));
      } catch (inviteErr) {
        console.error("Failed to send community invite email:", inviteErr);
      }
    }

    // Proband:innen-Info — second transactional email for any booking
    // that includes a praxis component (Praxiskurs, Kombikurs, or the
    // Premium Komplettpaket which is built on a Kombikurs). Pure
    // Onlinekurs purchases skip this since there's no in-person session.
    if (
      !options?.skipProbandInfo &&
      (data.courseType === "Praxiskurs" ||
        data.courseType === "Kombikurs" ||
        data.courseType === "Premium")
    ) {
      try {
        await sendEmailViaResend(
          data.email,
          "Wichtig für Deinen Praxiskurs: Bring Deine:n Proband:in mit",
          buildProbandinnenInfoEmail(data.firstName),
        );
      } catch (probandErr) {
        console.error("Failed to send Proband:innen info email:", probandErr);
      }
    }
  }

  // 2. LearnWorlds enrollment
  // We collect the first non-null LW user_id from any enrollment in this
  // flow and pin it on the auszubildende row. Without that, the LMS-Zugriff
  // panel can't verify enrollment until the customer logs in via SSO.
  let resolvedLwUserId: string | null = null;
  if (data.email && (data.courseType === "Onlinekurs" || data.courseType === "Kombikurs")) {
    const onlineCourseId = template?.online_course_id;
    if (onlineCourseId) {
      try {
        const lwUserId = await enrollInLearnWorlds(data.email, onlineCourseId, data.firstName, data.lastName);
        if (lwUserId) resolvedLwUserId = lwUserId;
      } catch (lwErr) { console.error("LearnWorlds enrollment error:", lwErr); }
    }
  }

  if (data.email && data.courseType === "Premium") {
    const isDentist = data.courseKey === "grundkurs_botulinum_zahnmedizin";
    const isDermalfiller = data.courseKey === "grundkurs_dermalfiller";
    const isLippen = data.courseKey === "aufbaukurs_lippen";
    const isTherapeutischeIndikationen =
      data.courseKey === "aufbaukurs_therapeutische_indikationen_botulinum";
    const premiumCourseIds = isDentist
      ? [
          // Zahnmedizin Komplettpaket: Botulinum Zahnmedizin + Hautpflege
          template?.online_course_id, // Zahnmedizin Botulinum online course
          "grundkurs-medizinische-hautpflege",
        ].filter(Boolean) as string[]
      : isDermalfiller
        ? [
            // Dermalfiller Komplettpaket: Dermalfiller online + Hautpflege + Lippen
            template?.online_course_id, // Grundkurs Dermalfiller online course
            "grundkurs-medizinische-hautpflege",
            "aufbaukurs-lippen-online",
          ].filter(Boolean) as string[]
        : isLippen
          ? [
              // Lippen Komplettpaket: Lippen online + Dermalfiller + Hautpflege + Periorale Zone
              template?.online_course_id, // Aufbaukurs Lippen online course
              "grundkurs-dermalfiller-online",
              "grundkurs-medizinische-hautpflege",
              "aufbaukurs-botulinum-periorale-zone",
            ].filter(Boolean) as string[]
          : isTherapeutischeIndikationen
            ? [
                // Therapeutische Indikationen Komplettpaket:
                // Therapeutische Indikationen online + Grundkurs Botulinum online + Hautpflege
                template?.online_course_id, // Aufbaukurs Therapeutische Indikationen online course
                "grundkurs-botulinum-online",
                "grundkurs-medizinische-hautpflege",
              ].filter(Boolean) as string[]
            : [
                // Humanmedizin Komplettpaket: 4 Onlinekurse
                "grundkurs-botulinum-online",
                "aufbaukurs-botulinum-periorale-zone",
                "aufbaukurs-medizinische-indikation-fuer-botulinum-online",
                "grundkurs-medizinische-hautpflege",
              ];
    for (const lwCourseId of premiumCourseIds) {
      try {
        const lwUserId = await enrollInLearnWorlds(data.email, lwCourseId, data.firstName, data.lastName);
        if (lwUserId && !resolvedLwUserId) resolvedLwUserId = lwUserId;
      }
      catch (lwErr) { console.error(`LearnWorlds Premium enrollment error (${lwCourseId}):`, lwErr); }
    }
  }

  // Persist LW user_id to auszubildende so the LMS-Zugriff panel can verify
  // enrollment immediately, before the customer logs in via SSO.
  if (resolvedLwUserId) {
    try { await persistLwUserIdForBooking(data.bookingId, resolvedLwUserId); }
    catch (persistErr) { console.error("persistLwUserIdForBooking failed:", persistErr); }
  }

  // 3. Slack notification (skipped when called from profile completion)
  if (SLACK_WEBHOOK_URL_COURSES && !options?.skipSlack) {
    try {
      let seatsInfo = "";
      if (data.sessionId) {
        const { data: updatedSession } = await supabase.from("course_sessions").select("booked_seats, max_seats").eq("id", data.sessionId).single();
        if (updatedSession) seatsInfo = `${updatedSession.booked_seats}/${updatedSession.max_seats}`;
      }
      const betrag = data.amountTotal ? `€${(data.amountTotal / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}` : null;

      await fetch(SLACK_WEBHOOK_URL_COURSES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // *Typ:* lives on the first line so the same Slack app can
          // post Kursbuchungen and Merch-Käufe to the same channel and
          // still be distinguishable at a glance. The course-package
          // level (Onlinekurs / Kombikurs / Komplettpaket) is moved to
          // *Paket:* so it doesn't collide with the event-level type.
          text: [
            `*Typ:* Kursbuchung`,
            `*Name:* ${data.fullName}`,
            `*Paket:* ${data.courseType === "Premium" ? "Komplettpaket" : data.courseType}`,
            `*Kurs:* ${courseLabelDe}`,
            data.sessionLabel ? `*Datum:* ${data.sessionLabel}` : null,
            seatsInfo ? `*Plätze:* ${seatsInfo}` : null,
            betrag ? `*Betrag:* ${betrag}` : null,
          ].filter(Boolean).join("\n"),
        }),
      });
    } catch (slackErr) {
      console.error("Failed to send Slack notification:", slackErr);
    }
  }

  // 4. HubSpot contact
  if (HUBSPOT_ACCESS_TOKEN && data.email) {
    try {
      const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: data.email }] }],
        }),
      });
      const searchData = await searchRes.json();

      const properties: Record<string, string> = {
        email: data.email,
        firstname: data.firstName,
        lastname: data.lastName,
        contact_type: "Doctor - Customer",
      };
      if (data.phone) properties.phone = data.phone;
      if (data.profileSpecialty) properties.fachrichtung = data.profileSpecialty;

      if (searchData.total === 0) {
        await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
          body: JSON.stringify({ properties }),
        });
      } else {
        const contactId = searchData.results[0]?.id;
        if (contactId) {
          await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` },
            body: JSON.stringify({ properties }),
          });
        }
      }
    } catch (hsErr) {
      console.error("HubSpot error:", hsErr);
    }
  }

  // 5. Mark booking as profile_complete. Propagate to every booking
  // belonging to the same contact so siblings (e.g. earlier Aufbau
  // online bookings) don't keep showing the "Profil unvollständig"
  // badge in the dashboard once the profile is filled in.
  const { data: bookingRow } = await supabase
    .from("course_bookings")
    .select("auszubildende_id, email")
    .eq("id", data.bookingId)
    .single();

  if (bookingRow?.auszubildende_id) {
    await supabase
      .from("course_bookings")
      .update({ profile_complete: true })
      .eq("auszubildende_id", bookingRow.auszubildende_id);
  } else {
    await supabase
      .from("course_bookings")
      .update({ profile_complete: true })
      .eq("id", data.bookingId);
  }

  console.log(`Post-purchase flow completed for booking ${data.bookingId}`);
}

// ── Send "complete your profile" reminder email ──
//
// `baseUrl` is accepted for backwards compatibility but ignored: the
// profile-completion page is doctor-facing and now always rendered
// from ephia.de. Old proband-innen.ephia.de links keep working via a
// 308 in middleware.ts.
export async function sendProfileReminderEmail(email: string, firstName: string, bookingId: string, _baseUrl?: string) {
  void _baseUrl;
  const profileUrl = `https://ephia.de/courses/success?booking_id=${bookingId}&email=${encodeURIComponent(email)}`;

  const html = buildEmailHtml({
    firstName,
    intro: "Vielen Dank für Deine Buchung! Wir benötigen noch ein paar Angaben von Dir, damit wir Deinen Kurs freischalten können.",
    infoRows: [],
    closing: `<a href="${profileUrl}" style="display:inline-block;color:#0066FF;font-weight:600;font-size:14px;text-decoration:underline;">Profil vervollständigen →</a>`,
  });

  await sendEmailViaResend(email, "Bitte vervollständige Dein Profil", html);
}

// ── Send the profile link as a face-to-face handover ──
//
// Triggered manually by the Kursbetreuung from the dashboard when an
// Auszubildende:r is on-site at the course with an incomplete profile.
// Distinct from the 5-minute automated reminder above: this email
// assumes the recipient was just spoken to in person and frames the
// urgency around CME points + Zertifikat.
export async function sendInPersonProfileLinkEmail(
  email: string,
  firstName: string,
  bookingId: string,
) {
  const profileUrl = `https://ephia.de/courses/success?booking_id=${bookingId}&email=${encodeURIComponent(email)}`;

  const html = buildEmailHtml({
    firstName,
    intro:
      "hier ist der Link mit dem Du Dein Profil vervollständigen kannst, damit wir Deine CME-Punkte zuordnen und Dein Zertifikat ausstellen können.",
    buttons: [{ label: "Profil vervollständigen →", url: profileUrl }],
  });

  await sendEmailViaResend(email, "Profil vervollständigen", html);
}
