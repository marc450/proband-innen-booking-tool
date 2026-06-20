import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendWithdrawalForwardEmail,
  sendWithdrawalConfirmationEmail,
} from "@/lib/partner-galderma-emails";
import { GALDERMA_PARTNER } from "@/lib/partner-galderma";

// Public, token-gated withdrawal of a Galderma data-forwarding consent.
// The single-use withdrawal_token in the confirmation email authorizes
// this without a login (the token IS the proof of identity). Idempotent:
// a second click on an already-revoked link just reports success.
//
// On revoke we forward the deletion request to Galderma (Art. 17 Abs. 2),
// but ONLY if the contact was actually exported. If it was never sent,
// Galderma has nothing to delete and we skip the forwarder.

type ConsentRow = {
  id: string;
  revoked_at: string | null;
  exported_at: string | null;
  withdrawal_forwarded_at: string | null;
  signed_payload: {
    first_name?: string;
    last_name?: string;
    email?: string;
    course_title?: string;
    course_date?: string;
  } | null;
};

function formatExportDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const token: string | undefined = body?.token;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Ungültiger Link." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data } = await admin
      .from("partner_data_consents")
      .select("id, revoked_at, exported_at, withdrawal_forwarded_at, signed_payload")
      .eq("partner", GALDERMA_PARTNER)
      .eq("withdrawal_token", token)
      .maybeSingle();
    const consent = data as ConsentRow | null;

    if (!consent) {
      return NextResponse.json(
        { error: "Dieser Widerrufslink ist ungültig oder abgelaufen." },
        { status: 404 },
      );
    }

    // Already revoked → idempotent success, no second forwarder email.
    if (consent.revoked_at) {
      return NextResponse.json({ success: true, alreadyRevoked: true });
    }

    const revokedAt = new Date().toISOString();
    const { error: updErr } = await admin
      .from("partner_data_consents")
      .update({ revoked_at: revokedAt })
      .eq("id", consent.id);
    if (updErr) {
      console.error("withdraw: revoke update failed:", updErr);
      return NextResponse.json(
        { error: "Widerruf konnte nicht gespeichert werden." },
        { status: 500 },
      );
    }

    // Confirm the withdrawal to the participant (best-effort; the revoke
    // stands regardless). Uses the email snapshot from signing.
    const p = consent.signed_payload ?? {};
    if (p.email) {
      const confirm = await sendWithdrawalConfirmationEmail({
        to: p.email,
        firstName: p.first_name ?? "",
      });
      if (!confirm.ok) {
        console.error(
          `withdraw: confirmation email to participant failed for consent ${consent.id}: ${confirm.error}`,
        );
      }
    }

    // Forward to Galderma only if they actually received this contact.
    let forwarded = false;
    if (consent.exported_at) {
      const result = await sendWithdrawalForwardEmail({
        firstName: p.first_name ?? "",
        lastName: p.last_name ?? "",
        email: p.email ?? "",
        courseTitle: p.course_title ?? "EPHIA-Kurs",
        courseDate: p.course_date ?? "",
        exportDate: formatExportDate(consent.exported_at),
      });
      if (result.ok) {
        forwarded = true;
        await admin
          .from("partner_data_consents")
          .update({ withdrawal_forwarded_at: new Date().toISOString() })
          .eq("id", consent.id);
      } else {
        // Revoke stands; the forward failed. Log loudly so it can be
        // retried manually, but don't fail the user's withdrawal.
        console.error(
          `withdraw: Galderma forward failed for consent ${consent.id}: ${result.error}`,
        );
      }
    }

    return NextResponse.json({ success: true, forwarded });
  } catch (err) {
    console.error("partner-consent/withdraw error:", err);
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
