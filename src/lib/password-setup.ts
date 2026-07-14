import { createAdminClient } from "@/lib/supabase/admin";
import { buildEmailHtml } from "@/lib/email-template";
import { randomBytes } from "node:crypto";

// ── Customer set-password token flow ───────────────────────────────────
//
// Replaces the old inline set-password step, which let anyone who knew a
// doctor's email claim their account. Ownership is now proven by clicking
// a per-recipient token link we email them.
//
// The token lives on the auszubildende row (partial-unique index, single
// use, expiring — see migration 149), mirroring review_submit_token. It
// is minted at course-confirmation time and carried as the confirmation
// email's "Jetzt Passwort festlegen" button, and can be re-issued on
// demand from /start.
//
// Column layout note: auszubildende.email was dropped (migration 063), so
// the canonical primary email is read through the v_auszubildende view;
// writes (including the token columns) target the base table directly.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SETUP_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SETUP_BASE_URL = "https://ephia.de/passwort-einrichten";
const LOGIN_URL = "https://ephia.de/start";

type Admin = ReturnType<typeof createAdminClient>;

export function buildPasswordSetupUrl(token: string): string {
  return `${SETUP_BASE_URL}?token=${encodeURIComponent(token)}`;
}

// Return a valid (unexpired) setup token for the auszubildende, minting a
// fresh one only when none exists or the current one has expired. Reusing
// a still-valid token means every confirmation email in a multi-course
// purchase carries the same working link.
async function getOrCreateToken(admin: Admin, auszubildendeId: string): Promise<string | null> {
  const { data: row } = await admin
    .from("auszubildende")
    .select("password_setup_token, password_setup_token_expires_at")
    .eq("id", auszubildendeId)
    .maybeSingle();

  const now = Date.now();
  if (
    row?.password_setup_token &&
    row.password_setup_token_expires_at &&
    new Date(row.password_setup_token_expires_at).getTime() > now
  ) {
    return row.password_setup_token;
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + SETUP_TTL_MS).toISOString();
  const { error } = await admin
    .from("auszubildende")
    .update({ password_setup_token: token, password_setup_token_expires_at: expiresAt })
    .eq("id", auszubildendeId);
  if (error) {
    console.error("getOrCreateToken: failed to persist setup token:", error);
    return null;
  }
  return token;
}

// Resolve the "set your password" CTA URL for a course confirmation
// email. Doctors who already have a login account (auszubildende.user_id
// set) get the plain /start login URL; doctors without an account yet get
// a per-recipient token link that proves inbox ownership when clicked.
export async function resolvePasswordSetupUrl(
  admin: Admin,
  auszubildendeId: string | null,
): Promise<string> {
  if (!auszubildendeId) return LOGIN_URL;
  const { data: row } = await admin
    .from("auszubildende")
    .select("user_id")
    .eq("id", auszubildendeId)
    .maybeSingle();
  if (row?.user_id) return LOGIN_URL; // already has an auth account -> log in
  const token = await getOrCreateToken(admin, auszubildendeId);
  return token ? buildPasswordSetupUrl(token) : LOGIN_URL;
}

export interface SetupTokenLookup {
  auszubildendeId: string;
  email: string;
  firstName: string | null;
}

// Validate a token and return the owning doctor (with canonical email),
// or null if the token is unknown or expired.
export async function verifyPasswordSetupToken(
  admin: Admin,
  token: string,
): Promise<SetupTokenLookup | null> {
  if (!token) return null;

  const { data: row } = await admin
    .from("auszubildende")
    .select("id, first_name, password_setup_token_expires_at")
    .eq("password_setup_token", token)
    .maybeSingle();
  if (!row) return null;
  if (
    !row.password_setup_token_expires_at ||
    new Date(row.password_setup_token_expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  // Email is not on the base table (dropped in 063); read the canonical
  // primary email from the view.
  const { data: emailRow } = await admin
    .from("v_auszubildende")
    .select("email")
    .eq("id", row.id)
    .maybeSingle();
  const email = emailRow?.email;
  if (!email) return null;

  return { auszubildendeId: row.id, email, firstName: row.first_name ?? null };
}

// Clear the token after a password has been set (single use).
export async function consumePasswordSetupToken(admin: Admin, token: string): Promise<void> {
  await admin
    .from("auszubildende")
    .update({ password_setup_token: null, password_setup_token_expires_at: null })
    .eq("password_setup_token", token);
}

// Send a standalone "set your password" email with a fresh token link.
// Used by the /start resend action for doctors who never got (or lost)
// the link in their confirmation email. Returns true if an email went
// out. Callers must treat the result as internal only and never reveal
// whether the address is a known customer (enumeration protection).
export async function sendPasswordSetupLinkByEmail(email: string): Promise<boolean> {
  const admin = createAdminClient();

  // Resolve the auszubildende by alias first, then by canonical email.
  let auszubildendeId: string | null = null;
  let firstName: string | null = null;

  const { data: aliasHit } = await admin
    .from("auszubildende_emails")
    .select("auszubildende_id")
    .eq("email", email)
    .maybeSingle();
  if (aliasHit) {
    const { data: base } = await admin
      .from("auszubildende")
      .select("id, first_name, user_id")
      .eq("id", aliasHit.auszubildende_id)
      .maybeSingle();
    if (base?.user_id) return false; // already has an account
    if (base) {
      auszubildendeId = base.id;
      firstName = base.first_name ?? null;
    }
  }
  if (!auszubildendeId) {
    const { data } = await admin
      .from("v_auszubildende")
      .select("id, first_name, user_id")
      .ilike("email", email)
      .maybeSingle();
    if (data) {
      if (data.user_id) return false; // already has an account
      auszubildendeId = data.id;
      firstName = data.first_name ?? null;
    }
  }
  if (!auszubildendeId) return false;

  const token = await getOrCreateToken(admin, auszubildendeId);
  if (!token || !RESEND_API_KEY) return false;

  const html = buildEmailHtml({
    firstName: firstName ?? "",
    intro:
      "Du hast einen Link zum Einrichten Deines Passworts angefordert. Klicke auf den Button unten, um Dein Passwort festzulegen und auf Deine Kurse zuzugreifen. Der Link ist 30 Tage gültig. Wenn Du das nicht warst, kannst Du diese E-Mail einfach ignorieren.",
    buttons: [{ label: "Passwort festlegen", url: buildPasswordSetupUrl(token) }],
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
      subject: "Richte Dein EPHIA-Passwort ein",
      html,
    }),
  });
  return true;
}
