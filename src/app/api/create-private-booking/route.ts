import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPatientFields, encryptBookingFields, hashEmail, hashPhone } from "@/lib/encryption";
import { buildEmailHtml, PATIENT_PREPARATION_BLOCK } from "@/lib/email-template";
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export async function POST(req: NextRequest) {
  try {
    const { slotId, firstName, lastName, email, phone, referringDoctor } = await req.json();

    if (!slotId || !firstName || !lastName || !email || !phone || !referringDoctor) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const emailHash = hashEmail(email);
    const phoneHash = hashPhone(phone);

    // Get slot + course info
    const { data: slot } = await supabase
      .from("available_slots")
      .select("id, course_id, start_time, end_time, course_title, course_date, remaining_capacity")
      .eq("id", slotId)
      .single();

    if (!slot) {
      return NextResponse.json({ error: "Zeitfenster nicht gefunden." }, { status: 404 });
    }

    // Fetch treatment_title (public-facing "Behandlungsname") alongside
    // location. Falls back to the internal course title when empty.
    const { data: course } = await supabase
      .from("courses")
      .select("location, treatment_title")
      .eq("id", slot.course_id)
      .single();

    const displayTreatment = course?.treatment_title || slot.course_title || "EPHIA Kurs";

    // Check blacklist
    const { data: blacklisted } = await supabase
      .from("patients")
      .select("id, patient_status")
      .or(`email_hash.eq.${emailHash},phone_hash.eq.${phoneHash}`)
      .eq("patient_status", "blacklist");

    if (blacklisted && blacklisted.length > 0) {
      return NextResponse.json({ error: "Eine Buchung ist mit diesen Daten leider nicht möglich." }, { status: 403 });
    }

    // Check same-course duplicate
    const { data: courseSlots } = await supabase
      .from("slots")
      .select("id")
      .eq("course_id", slot.course_id);

    const courseSlotIds = (courseSlots || []).map(s => s.id);
    if (courseSlotIds.length > 0) {
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select("id")
        .eq("email_hash", emailHash)
        .in("slot_id", courseSlotIds)
        .in("status", ["booked", "attended"]);

      if (existingBookings && existingBookings.length > 0) {
        return NextResponse.json({ error: "Du hast für diesen Kurs bereits einen Termin gebucht." }, { status: 409 });
      }
    }

    // Encrypt patient data
    const patientEncrypted = encryptPatientFields({
      email,
      first_name: firstName,
      last_name: lastName,
      phone,
    });

    // Upsert patient
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("email_hash", emailHash)
      .maybeSingle();

    let patientId: string;

    if (existingPatient) {
      patientId = existingPatient.id;
      await supabase
        .from("patients")
        .update({
          encrypted_data: patientEncrypted.encrypted_data,
          encrypted_key: patientEncrypted.encrypted_key,
          encryption_iv: patientEncrypted.encryption_iv,
          phone_hash: patientEncrypted.phone_hash,
        })
        .eq("id", patientId);
    } else {
      const { data: newPatient } = await supabase
        .from("patients")
        .insert({
          encrypted_data: patientEncrypted.encrypted_data,
          encrypted_key: patientEncrypted.encrypted_key,
          encryption_iv: patientEncrypted.encryption_iv,
          email_hash: patientEncrypted.email_hash,
          phone_hash: patientEncrypted.phone_hash,
          patient_status: "active",
        })
        .select("id")
        .single();
      patientId = newPatient!.id;
    }

    // Encrypt booking data
    const bookingEncrypted = encryptBookingFields({
      name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
    });

    // Create booking via RPC
    const { data: bookingId, error: rpcError } = await supabase.rpc("create_encrypted_booking", {
      p_slot_id: slotId,
      p_email_hash: bookingEncrypted.email_hash,
      p_encrypted_data: bookingEncrypted.encrypted_data,
      p_encrypted_key: bookingEncrypted.encrypted_key,
      p_encryption_iv: bookingEncrypted.encryption_iv,
      p_stripe_checkout_session_id: null,
      p_booking_type: "private",
      p_referring_doctor: referringDoctor,
    });

    if (rpcError) {
      const msg = rpcError.message || "";
      if (msg.includes("SLOT_FULL")) {
        return NextResponse.json({ error: "Dieses Zeitfenster ist leider bereits voll." }, { status: 409 });
      }
      if (msg.includes("DUPLICATE_BOOKING")) {
        return NextResponse.json({ error: "Du hast dieses Zeitfenster bereits gebucht." }, { status: 409 });
      }
      return NextResponse.json({ error: "Buchung fehlgeschlagen." }, { status: 500 });
    }

    // Link booking to patient
    if (bookingId) {
      await supabase
        .from("bookings")
        .update({ patient_id: patientId })
        .eq("id", bookingId);
    }

    // Send confirmation email
    if (RESEND_API_KEY) {
      // Slots are stored as UTC ISO timestamps (derived client-side from
      // Berlin local time), so we must format them back in Europe/Berlin
      // or the server-side (UTC) `format()` would shift the time by 1–2h.
      const dateStr = slot.start_time
        ? new Date(slot.start_time).toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Europe/Berlin",
          })
        : "";
      const timeStr = slot.start_time
        ? new Date(slot.start_time).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Berlin",
          })
        : "";

      const prepBlock = `
        ${PATIENT_PREPARATION_BLOCK}

        <p style="margin:0 0 20px;">
          Solltest Du weitere Fragen haben, melde Dich jederzeit bei uns:
          <a href="mailto:customerlove@ephia.de" style="color:#0066FF; text-decoration:none;">customerlove@ephia.de</a>
        </p>
      `;

      const html = buildEmailHtml({
        firstName: firstName,
        intro: `Du wurdest von <strong>${referringDoctor}</strong> als Privatpatient:in für die folgende Behandlung angemeldet:`,
        infoRows: [
          { label: "Behandlung", value: displayTreatment },
          { label: "Datum", value: dateStr },
          { label: "Uhrzeit", value: timeStr ? `${timeStr} Uhr` : "" },
          { label: "Ort", value: course?.location || "" },
          { label: "Zuweisende:r Ärzt:in", value: referringDoctor },
        ],
        extraContent: prepBlock,
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
          subject: `Buchungsbestätigung: ${displayTreatment}`,
          html,
        }),
      });
    }

    // Send Slack notification
    if (SLACK_WEBHOOK_URL) {
      try {
        // Get total remaining capacity across all slots in this course
        let totalRemaining: number | string = "?";
        if (slot.course_id) {
          const { data: allSlots } = await supabase
            .from("available_slots")
            .select("remaining_capacity")
            .eq("course_id", slot.course_id);
          if (allSlots) {
            totalRemaining = allSlots.reduce((sum: number, s: { remaining_capacity: number }) => sum + (s.remaining_capacity || 0), 0);
          }
        }

        const dateStr = slot.start_time
          ? new Date(slot.start_time).toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Europe/Berlin",
            })
          : "";
        const timeStr = slot.start_time
          ? new Date(slot.start_time).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Berlin",
            })
          : "";

        const nameLine = [firstName, lastName].filter(Boolean).join(" ");
        await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: [
              nameLine ? `*Name:* ${nameLine}` : null,
              email ? `*E-Mail:* ${email}` : null,
              referringDoctor ? `*Zuweiser:in:* ${referringDoctor}` : null,
              `*Kurs:* ${slot.course_title || ""}`,
              `*Datum:* ${dateStr}${timeStr ? `, ${timeStr} Uhr` : ""}`,
              `*Freie Plätze:* ${totalRemaining}`,
            ].filter(Boolean).join("\n"),
          }),
        });
      } catch (slackErr) {
        console.error("Failed to send Slack notification:", slackErr);
      }
    }

    return NextResponse.json({ success: true, bookingId });
  } catch (err) {
    console.error("Private booking error:", err);
    return NextResponse.json({ error: "Ein unerwarteter Fehler ist aufgetreten." }, { status: 500 });
  }
}
