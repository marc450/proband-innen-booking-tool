import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptBookingFields, decryptPatient } from "@/lib/encryption";
import { buildNachbehandlungEmail } from "@/lib/nachbehandlung-email";
import { archiveSentMessage } from "@/lib/gmail";
import { requireVerifiedStaff } from "@/lib/auth-verify";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Legt einen kostenlosen Nachbehandlungs-Termin an: dedizierter Slot
// (slot_type='nachbehandlung', Kapazität 1) + Buchung für eine:n bestehende:n
// Proband:in + Terminbestätigung per E-Mail. Staff-only (Dozent:innen + Admins).
//
// Kein Stripe, keine Blacklist-/Duplikatprüfung: die Nachbehandlung ist bewusst
// ein Folgetermin für jemanden, der:die im selben Kurs schon eine Buchung hat.
// Deshalb Direct-Insert statt create_encrypted_booking (dessen DUPLICATE-Guard
// hier fälschlich greifen würde). E2EE nutzt ausschließlich die bestehenden
// Helfer; das Verschlüsselungsschema ändert sich nicht.
export async function POST(req: NextRequest) {
  const access = await requireVerifiedStaff();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { sessionId, startTimeIso, patientId } = await req.json();

    if (!sessionId || !startTimeIso || !patientId) {
      return NextResponse.json(
        { error: "sessionId, startTimeIso und patientId sind erforderlich." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // 1. Satellite-Course (Proband:innen-Seite der Session) auflösen.
    const { data: satellite } = await admin
      .from("courses")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!satellite) {
      return NextResponse.json(
        { error: "Diese Session hat keine Proband:innen-Seite." },
        { status: 404 },
      );
    }

    // Ort für die E-Mail aus der Session.
    const { data: session } = await admin
      .from("course_sessions")
      .select("address")
      .eq("id", sessionId)
      .maybeSingle();

    // 2. Patient:in laden + entschlüsseln (Client-PII nicht vertrauen).
    const { data: patientRow } = await admin
      .from("patients")
      .select("id, encrypted_data, encrypted_key, encryption_iv")
      .eq("id", patientId)
      .maybeSingle();

    if (!patientRow) {
      return NextResponse.json(
        { error: "Proband:in nicht gefunden." },
        { status: 404 },
      );
    }

    let patient;
    try {
      patient = decryptPatient(patientRow);
    } catch {
      return NextResponse.json(
        { error: "Proband:innen-Daten konnten nicht entschlüsselt werden." },
        { status: 500 },
      );
    }

    const email = patient.email;
    const firstName = patient.first_name || "";
    const lastName = patient.last_name || "";
    if (!email) {
      return NextResponse.json(
        { error: "Diese:r Proband:in hat keine hinterlegte E-Mail-Adresse." },
        { status: 422 },
      );
    }

    // 3. Dedizierten Nachbehandlungs-Slot anlegen (Kapazität 1).
    const { data: slot, error: slotError } = await admin
      .from("slots")
      .insert({
        course_id: satellite.id,
        start_time: startTimeIso,
        capacity: 1,
        slot_type: "nachbehandlung",
      })
      .select("id")
      .single();

    if (slotError || !slot) {
      console.error("Nachbehandlung slot insert failed:", slotError);
      return NextResponse.json(
        { error: "Slot konnte nicht angelegt werden." },
        { status: 500 },
      );
    }

    // 4. Booking-Snapshot verschlüsseln.
    const bookingEncrypted = encryptBookingFields({
      name: `${firstName} ${lastName}`.trim(),
      first_name: firstName,
      last_name: lastName,
      email,
      phone: patient.phone,
    });

    // 5. Buchung direkt einfügen (bewusst ohne RPC, siehe oben).
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        slot_id: slot.id,
        email_hash: bookingEncrypted.email_hash,
        encrypted_data: bookingEncrypted.encrypted_data,
        encrypted_key: bookingEncrypted.encrypted_key,
        encryption_iv: bookingEncrypted.encryption_iv,
        status: "booked",
        booking_type: "nachbehandlung",
        patient_id: patientId,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("Nachbehandlung booking insert failed:", bookingError);
      // Verwaisten Slot wieder entfernen, damit kein leerer
      // Nachbehandlungs-Slot zurückbleibt.
      await admin.from("slots").delete().eq("id", slot.id);
      return NextResponse.json(
        { error: "Buchung konnte nicht angelegt werden." },
        { status: 500 },
      );
    }

    // 6. Terminbestätigung senden. Slots sind UTC-ISO, also in Europe/Berlin
    //    zurückformatieren, sonst verschiebt der (UTC-)Server um 1-2h.
    const dateStr = new Date(startTimeIso).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Berlin",
    });
    const timeStr = new Date(startTimeIso).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });

    if (RESEND_API_KEY) {
      const { subject, html } = buildNachbehandlungEmail({
        firstName: firstName || "",
        dateStr,
        timeStr,
        location: session?.address || "",
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EPHIA <customerlove@ephia.de>",
          to: [email],
          subject,
          html,
        }),
      });

      // In den customerlove-Gmail-Sent-Ordner spiegeln, damit das
      // Proband:innen-Profil die Bestätigung aufnimmt. Best-effort.
      try {
        await archiveSentMessage({ to: email, subject, html });
      } catch (archiveErr) {
        console.error("archiveSentMessage failed (non-fatal):", archiveErr);
      }
    }

    // 7. Slack-Notiz (best-effort).
    if (SLACK_WEBHOOK_URL) {
      try {
        const nameLine = [firstName, lastName].filter(Boolean).join(" ");
        await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: [
              "*Nachbehandlung angelegt*",
              nameLine ? `*Name:* ${nameLine}` : null,
              email ? `*E-Mail:* ${email}` : null,
              `*Datum:* ${dateStr}${timeStr ? `, ${timeStr} Uhr` : ""}`,
              session?.address ? `*Ort:* ${session.address}` : null,
            ]
              .filter(Boolean)
              .join("\n"),
          }),
        });
      } catch (slackErr) {
        console.error("Failed to send Slack notification:", slackErr);
      }
    }

    return NextResponse.json({ ok: true, bookingId: booking.id });
  } catch (err) {
    console.error("Nachbehandlung error:", err);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
