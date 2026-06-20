import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildConsentPdf } from "@/lib/partner-consent-pdf";
import { sendConsentConfirmationEmail } from "@/lib/partner-galderma-emails";
import {
  GALDERMA_PARTNER,
  CONSENT_TEXT_VERSION,
  isGaldermaEligible,
} from "@/lib/partner-galderma";

const CONSENT_BUCKET = "partner-consents";
// A staff correction window for typos: within this window the consent can
// be reset and re-collected. After it (or once exported) the record is
// locked to preserve the proof trail.
const CORRECTION_WINDOW_MS = 30 * 60 * 1000;

type StaffRole = "admin" | "nutzer";

// Verified staff gate (getUser + DB role lookup), not the forgeable
// x-user-role cookie. This route writes consent records and PII.
async function assertStaff(): Promise<{ id: string; role: StaffRole } | null> {
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
  if (profile?.role === "admin" || profile?.role === "nutzer") {
    return { id: user.id, role: profile.role as StaffRole };
  }
  return null;
}

function formatCourseDate(dateIso: string): string {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

function formatBerlinTimestamp(d: Date): string {
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function decodeDataUrlPng(dataUrl: string | null | undefined): Uint8Array | null {
  if (!dataUrl) return null;
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl.trim());
  const b64 = m ? m[1] : dataUrl.trim();
  try {
    return new Uint8Array(Buffer.from(b64, "base64"));
  } catch {
    return null;
  }
}

// Compose the auszubildende address columns into one display string.
function composeAddress(row: {
  address_line1: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_country: string | null;
} | null): string | null {
  if (!row) return null;
  const cityLine = [row.address_postal_code, row.address_city]
    .filter(Boolean)
    .join(" ");
  const parts = [row.address_line1, cityLine, row.address_country].filter(
    (p) => p && p.trim(),
  );
  return parts.length ? parts.join(", ") : null;
}

export async function POST(req: NextRequest) {
  try {
    const staff = await assertStaff();
    if (!staff) {
      return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const bookingId: string | undefined = body?.bookingId;
    const signatureDataUrl: string | undefined = body?.signaturePng;
    // The Kursbetreuung can confirm/correct phone + address on the tablet
    // before signing; those become the snapshot we actually send.
    const phoneOverride: string | null = body?.phone ?? null;
    const addressOverride: string | null = body?.address ?? null;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId fehlt" }, { status: 400 });
    }
    const signatureBytes = decodeDataUrlPng(signatureDataUrl);
    if (!signatureBytes || signatureBytes.length < 100) {
      return NextResponse.json(
        { error: "Keine gültige Unterschrift übergeben." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Load the booking + course + session for eligibility and content.
    type BookingRow = {
      id: string;
      session_id: string | null;
      course_type: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      auszubildende_id: string | null;
      course_templates: { title: string | null; course_label_de: string | null } | null;
      course_sessions: { date_iso: string | null; betreuer_name: string | null } | null;
    };
    const { data: bookingData } = await admin
      .from("course_bookings")
      .select(
        "id, session_id, course_type, first_name, last_name, email, phone, auszubildende_id, " +
          "course_templates:template_id(title, course_label_de), " +
          "course_sessions:session_id(date_iso, betreuer_name)",
      )
      .eq("id", bookingId)
      .maybeSingle();
    const booking = bookingData as BookingRow | null;

    if (!booking) {
      return NextResponse.json({ error: "Buchung nicht gefunden" }, { status: 404 });
    }
    if (!isGaldermaEligible({ course_type: booking.course_type, session_id: booking.session_id })) {
      return NextResponse.json(
        { error: "Diese Buchung ist nicht für die Galderma-Datenweitergabe vorgesehen." },
        { status: 400 },
      );
    }
    if (!booking.email) {
      return NextResponse.json(
        { error: "Diese Buchung hat keine E-Mail-Adresse, Einwilligung nicht möglich." },
        { status: 400 },
      );
    }

    // Guard against a duplicate active consent.
    const { data: existing } = await admin
      .from("partner_data_consents")
      .select("id, consented_at, revoked_at")
      .eq("course_booking_id", bookingId)
      .eq("partner", GALDERMA_PARTNER)
      .maybeSingle();
    if (existing && existing.consented_at && !existing.revoked_at) {
      return NextResponse.json(
        { error: "Für diese Buchung liegt bereits eine aktive Einwilligung vor." },
        { status: 409 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tmpl = booking.course_templates as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sess = booking.course_sessions as any;
    const courseTitle: string = tmpl?.course_label_de || tmpl?.title || "EPHIA-Kurs";
    const dateIso: string | null = sess?.date_iso ?? null;
    const courseDate = dateIso ? formatCourseDate(dateIso) : "";
    const betreuerName: string | null = sess?.betreuer_name ?? null;

    // Resolve phone + address: prefer the values confirmed on the tablet,
    // fall back to what we have on file (auszubildende, then booking).
    let onFileAddress: string | null = null;
    let onFilePhone: string | null = booking.phone ?? null;
    if (booking.auszubildende_id) {
      const { data: azubi } = await admin
        .from("v_auszubildende")
        .select("phone, address_line1, address_postal_code, address_city, address_country")
        .eq("id", booking.auszubildende_id)
        .maybeSingle();
      if (azubi) {
        onFileAddress = composeAddress(azubi);
        onFilePhone = (azubi.phone as string | null) ?? onFilePhone;
      }
    }
    const phone = (phoneOverride ?? "").trim() || onFilePhone;
    const address = (addressOverride ?? "").trim() || onFileAddress;

    const signedAt = new Date();
    const firstName = booking.first_name ?? "";
    const lastName = booking.last_name ?? "";

    // Render + upload the signed PDF.
    const pdfBytes = await buildConsentPdf({
      firstName,
      lastName,
      email: booking.email,
      phone,
      address,
      courseTitle,
      courseDate,
      betreuerName,
      signedAtBerlin: formatBerlinTimestamp(signedAt),
      consentTextVersion: CONSENT_TEXT_VERSION,
      signaturePngBytes: signatureBytes,
    });

    const storagePath = `${GALDERMA_PARTNER}/${bookingId}/${randomUUID()}.pdf`;
    const { error: uploadErr } = await admin.storage
      .from(CONSENT_BUCKET)
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadErr) {
      console.error("Consent PDF upload failed:", uploadErr);
      return NextResponse.json(
        { error: "Unterschrift konnte nicht gespeichert werden." },
        { status: 500 },
      );
    }

    const withdrawalToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
    const signedPayload = {
      first_name: firstName,
      last_name: lastName,
      email: booking.email,
      phone,
      address,
      course_title: courseTitle,
      course_date: courseDate,
      date_iso: dateIso,
    };

    // Upsert the consent row (re-collect after a reset reuses the unique row).
    const { error: upsertErr } = await admin
      .from("partner_data_consents")
      .upsert(
        {
          course_booking_id: bookingId,
          partner: GALDERMA_PARTNER,
          consented_at: signedAt.toISOString(),
          revoked_at: null,
          exported_at: null,
          withdrawal_forwarded_at: null,
          consent_text_version: CONSENT_TEXT_VERSION,
          source: "kursbetreuung_in_room",
          consented_by_staff_id: staff.id,
          signature_storage_path: storagePath,
          signed_payload: signedPayload,
          withdrawal_token: withdrawalToken,
        },
        { onConflict: "course_booking_id,partner" },
      );
    if (upsertErr) {
      console.error("Consent upsert failed:", upsertErr);
      // Clean up the orphaned PDF so we don't leave a file with no record.
      await admin.storage.from(CONSENT_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: "Einwilligung konnte nicht gespeichert werden." },
        { status: 500 },
      );
    }

    // Confirmation email (Art. 7 proof pillar). Non-fatal on failure; the
    // consent itself is recorded. We surface the email outcome to the UI.
    const emailResult = await sendConsentConfirmationEmail({
      to: booking.email,
      firstName,
      courseTitle,
      courseDate,
      betreuerName,
      withdrawalToken,
    });

    return NextResponse.json({
      success: true,
      consentedAt: signedAt.toISOString(),
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? undefined : emailResult.error,
    });
  } catch (err) {
    console.error("partner-consent/record error:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Staff correction: remove a not-yet-exported consent within the window so
// it can be re-collected. Deletes the stored PDF too.
export async function DELETE(req: NextRequest) {
  try {
    const staff = await assertStaff();
    if (!staff) {
      return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    const bookingId: string | undefined = body?.bookingId;
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId fehlt" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: row } = await admin
      .from("partner_data_consents")
      .select("id, consented_at, exported_at, signature_storage_path")
      .eq("course_booking_id", bookingId)
      .eq("partner", GALDERMA_PARTNER)
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ error: "Keine Einwilligung gefunden" }, { status: 404 });
    }
    if (row.exported_at) {
      return NextResponse.json(
        { error: "Bereits an Galderma exportiert, kann nicht mehr zurückgesetzt werden." },
        { status: 400 },
      );
    }
    const consentedAt = row.consented_at ? new Date(row.consented_at).getTime() : 0;
    if (consentedAt && Date.now() - consentedAt > CORRECTION_WINDOW_MS) {
      return NextResponse.json(
        { error: "Die 30-minütige Korrekturfrist ist abgelaufen." },
        { status: 400 },
      );
    }

    if (row.signature_storage_path) {
      await admin.storage.from(CONSENT_BUCKET).remove([row.signature_storage_path as string]);
    }
    await admin.from("partner_data_consents").delete().eq("id", row.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("partner-consent/record DELETE error:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
