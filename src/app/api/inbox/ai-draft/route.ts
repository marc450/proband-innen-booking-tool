import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashEmail, decryptPatient } from "@/lib/encryption";
import {
  listThreads,
  getThread,
  getHeader,
  getBody,
  isInbound,
} from "@/lib/gmail";

// AI email-drafting endpoint for the inbox composer.
//
// Call shape (POST):
//   {
//     to:           string         // recipient email (may be empty)
//     subject:      string         // current subject line (compose) or thread subject
//     threadId?:    string         // present when refining inside an existing thread
//     instruction:  string         // free-text natural-language ask from the user
//     currentDraft?: string        // current editor HTML (signature already stripped)
//     userName?:   string          // signed-in staff name; used to sign off the mail
//   }
//
// Returns: { html: string }
//
// The model is given:
//   1. A baked-in EPHIA brand/voice system prompt (cached).
//   2. The contact card pulled from auszubildende → patients.
//   3. Either the full current Gmail thread, or the last EPHIA-outbound mail to the
//      same recipient from past threads (so the AI mirrors prior tone).
//   4. The user's natural-language instruction.

const SYSTEM_PROMPT = `Du bist die KI-Schreibassistenz für EPHIA. EPHIA ist eine Akademie für verantwortungsvolle ästhetische Medizin. Wir schreiben **nicht** mit Endkund:innen, sondern mit Ärzt:innen, Auszubildenden und Proband:innen.

# Deine Aufgabe
Verfasse den Fließtext einer E-Mail (HTML), den eine EPHIA-Mitarbeiter:in danach prüft und versendet. Du schreibst NICHT die Signatur, NICHT den Betreff. Du gibst NUR den Body als HTML zurück (keine ausgeleitete Erklärung, keine Code-Fences, kein Vorwort).

# Marken-Identität in einem Satz
Wer ästhetische Medizin macht, muss Medizin liefern. Wir verkaufen keine Beauty-Skills, sondern medizinische Entscheidungslogik.

# Sprache (HARTE Regeln)
- **Immer Deutsch.** Niemals Englisch, außer der Empfänger:in hat zuvor auf Englisch geschrieben.
- **Du-Form mit großgeschriebenem D**: "Du", "Dir", "Dein", "Deine". Niemals "Sie".
- **Korrekt gendern** mit Doppelpunkt: Ärzt:innen, Patient:innen, Proband:innen, Dozent:innen, Teilnehmer:innen. Nie "Ärzte/Patienten/Probanden/Dozenten".
- **Niemals Bindestrich, En-Dash oder Em-Dash als Satzzeichen.** Kein "—", kein "–", kein " - ". Nutze Komma, Punkt oder formuliere um. Bindestriche in zusammengesetzten Wörtern ("E-Mail", "Follow-up") sind erlaubt.
- **Keine Emojis** im Text, außer die Empfänger:in hat selbst welche genutzt.
- Keine Marketing-Floskeln: kein "Game-Changer", "Boost", "Next Level", "Hack", "ultimativ", "Beauty", "Glow", "Wow result", "perfekt".
- Keine englischen Lehnwörter wenn ein deutsches Wort existiert ("Kurs" statt "Course", "Termin" statt "Slot").
- Niemals "Botox" auf normalen Mails. Nutze "Botulinum" oder "Botulinumtoxin" wenn fachlich nötig.

# Anrede & Schluss
- **Anrede**: Wenn Du den Vornamen kennst und es Ärzt:in ist: "Hallo Dr. {Nachname}," oder "Liebe Frau Dr. {Nachname}," / "Lieber Herr Dr. {Nachname},". Wenn Proband:in: "Hallo {Vorname},". Wenn unbekannt: "Hallo,".
- **KEINE Grußformel am Ende.** Schreibe NIEMALS "Beste Grüße,", "Liebe Grüße,", "Herzliche Grüße,", "Viele Grüße,", "Mit freundlichen Grüßen," oder ähnliches. Schreibe auch keinen Namen, keine Unterschrift, kein P.S. mit EPHIA-Adresse. Die Signatur wird automatisch angefügt und enthält bereits "Herzliche Grüße," plus den Namen. Dein Body endet mit dem letzten inhaltlichen Satz.

# Tonfall
- **Medizinische Klarheit, keine Werbesprache.** Begriffe wie Indikation, Aufklärung, Risikomanagement, Anatomie, Nachsorge, Komplikation sind willkommen wenn der Kontext es trägt.
- **Struktur statt Hype.** Begründe, ordne, erkläre. Übertreibe nicht.
- **Respekt vor der Praxisrealität.** Klinikalltag, Zeitdruck, Verantwortung sind reale Themen. Keine Hustle-Coaching-Sprache.
- Sei freundlich, klar und direkt. Höflich aber nicht steif.
- Halte die Mail so kurz wie sinnvoll möglich. Keine Floskel-Abschnitte.

# HTML-Format
- Nutze nur diese Tags: \`<p>\`, \`<br>\`, \`<strong>\`, \`<em>\`, \`<ul>\`, \`<ol>\`, \`<li>\`, \`<a href="…">\`.
- Jeder Absatz in eigenem \`<p>…</p>\`. Eine Leerzeile zwischen Absätzen wird durch das Schließen + neues \`<p>\` automatisch erzeugt.
- Anrede in eigenem \`<p>\`. Letzter Absatz ist der letzte inhaltliche Satz, KEIN Gruß.
- KEIN \`<html>\`, \`<body>\`, \`<head>\`, KEINE \`<style>\`-Blöcke, KEINE \`class\`-Attribute.
- Antworte AUSSCHLIESSLICH mit dem HTML-Body. Kein Markdown, kein \`\`\`-Codeblock, keine Erklärung.

# Wenn ein Thread mitgegeben ist
Lies die bisherige Konversation. Übernimm Tonfall, Anrede und Detailtiefe der bisherigen Mails. Beziehe Dich konkret auf das, was die Empfänger:in zuletzt geschrieben hat.

# Wenn ein aktueller Entwurf mitgegeben ist
Du sollst ihn gemäß der Anweisung **verfeinern**, nicht ersetzen. Behalte Ton, Aufbau und Inhalte bei, ändere nur was die Anweisung verlangt.

# Wenn frühere eigene Mails an diese Person mitgegeben sind
Nutze sie als Tonbeispiel: gleiche Anrede, gleiche Förmlichkeit. Übernimm KEINE Grußformel daraus — die Signatur enthält sie bereits.`;

interface ContactInfo {
  type: "auszubildende" | "patient";
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  gender: string | null;
  companyName: string | null;
  specialty: string | null;
  patientStatus: string | null;
}

async function lookupContact(email: string): Promise<ContactInfo | null> {
  const admin = createAdminClient();
  const normalised = email.trim().toLowerCase();

  let auszubildendeId: string | null = null;
  const { data: emailRow } = await admin
    .from("auszubildende_emails")
    .select("auszubildende_id")
    .eq("email", normalised)
    .maybeSingle();
  if (emailRow) auszubildendeId = emailRow.auszubildende_id;
  if (!auszubildendeId) {
    const { data: legacy } = await admin
      .from("auszubildende")
      .select("id")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();
    if (legacy) auszubildendeId = legacy.id;
  }
  if (auszubildendeId) {
    const { data } = await admin
      .from("auszubildende")
      .select("first_name, last_name, title, company_name, specialty, gender")
      .eq("id", auszubildendeId)
      .maybeSingle();
    if (data) {
      return {
        type: "auszubildende",
        firstName: data.first_name,
        lastName: data.last_name,
        title: data.title,
        gender: data.gender,
        companyName: data.company_name,
        specialty: data.specialty,
        patientStatus: null,
      };
    }
  }

  const hash = hashEmail(email);
  let patientId: string | null = null;
  const { data: hashRow } = await admin
    .from("patient_email_hashes")
    .select("patient_id")
    .eq("email_hash", hash)
    .maybeSingle();
  if (hashRow) patientId = hashRow.patient_id;
  if (!patientId) {
    const { data: legacy } = await admin
      .from("patients")
      .select("id")
      .eq("email_hash", hash)
      .limit(1)
      .maybeSingle();
    if (legacy) patientId = legacy.id;
  }
  if (patientId) {
    const { data } = await admin
      .from("patients")
      .select("encrypted_data, encrypted_key, encryption_iv, patient_status")
      .eq("id", patientId)
      .maybeSingle();
    if (data) {
      try {
        const p = decryptPatient(data);
        return {
          type: "patient",
          firstName: p.first_name ?? null,
          lastName: p.last_name ?? null,
          title: null,
          gender: null,
          companyName: null,
          specialty: null,
          patientStatus: data.patient_status ?? null,
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function condenseBody(body: { html: string; text: string }, maxChars: number) {
  const raw = body.text?.trim() || htmlToText(body.html || "");
  return raw.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

async function fetchCurrentThread(threadId: string) {
  try {
    const thread = await getThread(threadId);
    return thread.messages
      .map((m) => ({
        date: new Date(Number(m.internalDate)).toISOString(),
        from: getHeader(m, "From"),
        isInbound: isInbound(m),
        text: condenseBody(getBody(m), 3000),
      }))
      .filter((m) => m.text.length > 0);
  } catch {
    return [];
  }
}

async function fetchPastOutbound(email: string, currentThreadId?: string) {
  try {
    const result = await listThreads({
      maxResults: 8,
      q: `(from:${email} OR to:${email})`,
    });
    const ids = result.threads
      .map((t) => t.id)
      .filter((id) => id !== currentThreadId)
      .slice(0, 4);
    const threads = await Promise.all(
      ids.map((id) => getThread(id).catch(() => null)),
    );
    const out: { subject: string; date: string; text: string }[] = [];
    for (const thread of threads) {
      if (!thread) continue;
      const outbound = thread.messages.filter((m) => !isInbound(m));
      const lastOutbound = outbound[outbound.length - 1];
      if (!lastOutbound) continue;
      const subject = getHeader(thread.messages[0], "Subject") || "(kein Betreff)";
      const date = new Date(Number(lastOutbound.internalDate))
        .toISOString()
        .split("T")[0];
      const text = condenseBody(getBody(lastOutbound), 1500);
      if (text.length < 20) continue;
      out.push({ subject, date, text });
    }
    return out.slice(0, 3);
  } catch {
    return [];
  }
}

function stripHtmlForCheck(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured" },
      { status: 503 },
    );
  }

  let body: {
    to?: string;
    subject?: string;
    threadId?: string | null;
    instruction?: string;
    currentDraft?: string;
    userName?: string;
    mode?: "email" | "template";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode: "email" | "template" =
    body.mode === "template" ? "template" : "email";
  const to = (body.to || "").trim().toLowerCase();
  const subject = (body.subject || "").trim();
  const threadId = body.threadId || null;
  const instruction = (body.instruction || "").trim();
  const currentDraft = body.currentDraft || "";
  const userName = (body.userName || "").trim();

  if (!instruction) {
    return NextResponse.json(
      { error: "instruction required" },
      { status: 400 },
    );
  }

  // Template mode skips Gmail/contact lookups: a Vorlage is generic, has
  // no recipient, and uses {{vorname}} as a placeholder for the future
  // recipient's first name.
  const [contact, currentThread, pastOutbound] =
    mode === "template"
      ? [null, [] as never[], [] as never[]]
      : await Promise.all([
          to ? lookupContact(to) : Promise.resolve(null),
          threadId ? fetchCurrentThread(threadId) : Promise.resolve([]),
          to
            ? fetchPastOutbound(to, threadId || undefined)
            : Promise.resolve([]),
        ]);

  const sections: string[] = [];

  if (mode === "template") {
    sections.push(
      `<modus>VORLAGEN-MODUS — KRITISCH

Du schreibst eine wiederverwendbare E-Mail-Vorlage. Sie wird später bei vielen unterschiedlichen Empfänger:innen eingefügt. Es gibt KEINE konkrete Empfänger:in.

PFLICHT-REGEL ZUM VORNAMEN:
• Beginne JEDE Vorlage mit einer personalisierten Anrede unter Verwendung von \`{{Vorname}}\`. Beispiele: \`<p>Hallo {{Vorname}},</p>\`, \`<p>Liebe:r {{Vorname}},</p>\`. Bei förmlichem Ton, der eher Nachname-orientiert wäre, nutze trotzdem den Vornamen-Platzhalter, weil die Vorlage später für viele Personen eingesetzt wird.
• Schreibe \`{{Vorname}}\` IMMER mit großem V, doppelten geschweiften Klammern, ohne Leerzeichen innerhalb. Genau so: \`{{Vorname}}\`.
• Verwende den Platzhalter ÜBERALL, wo Du sonst den Vornamen der Empfänger:in nennen würdest, auch im Fließtext (z.B. "Wie besprochen, {{Vorname}}, hier sind die Unterlagen.").
• Setze NIEMALS einen erfundenen Namen ein (kein "Hallo Anna,", kein "Liebe Maria,"). Nutze auch nicht generisch "Hallo," oder "Liebe Teilnehmer:in," wenn ein Vorname natürlich wäre.

WEITERE REGELN:
• KEINE Grußformel und KEINE Signatur am Ende. Schreibe NIEMALS "Beste Grüße,", "Liebe Grüße,", "Herzliche Grüße," o.ä. Die Signatur (inklusive Grußformel + Name) wird beim Versenden automatisch angefügt. Die Vorlage endet mit dem letzten inhaltlichen Satz.
• Erfinde keine weiteren Platzhalter wie \`[Datum]\` oder \`[Termin]\`, außer die Anweisung verlangt es ausdrücklich. Aktuell ist nur \`{{Vorname}}\` etabliert.
• Schreibe so generisch wie nötig, aber mit klarem, konkretem Inhalt — kein Lückentext mit Eckigen Klammern.</modus>`,
    );
  } else if (contact) {
    const lines: string[] = [];
    if (contact.type === "auszubildende") {
      const nameParts = [contact.title, contact.firstName, contact.lastName]
        .filter(Boolean)
        .join(" ");
      lines.push(`Empfänger:in: ${nameParts || to} (Ärzt:in / Auszubildende)`);
      if (contact.firstName) lines.push(`Vorname: ${contact.firstName}`);
      if (contact.lastName) lines.push(`Nachname: ${contact.lastName}`);
      if (contact.title) lines.push(`Titel: ${contact.title}`);
      if (contact.gender) lines.push(`Geschlecht: ${contact.gender}`);
      if (contact.specialty) lines.push(`Fachrichtung: ${contact.specialty}`);
      if (contact.companyName) lines.push(`Praxis: ${contact.companyName}`);
    } else {
      const nameParts = [contact.firstName, contact.lastName]
        .filter(Boolean)
        .join(" ");
      lines.push(`Empfänger:in: ${nameParts || to} (Proband:in)`);
      if (contact.firstName) lines.push(`Vorname: ${contact.firstName}`);
      if (contact.lastName) lines.push(`Nachname: ${contact.lastName}`);
      if (contact.patientStatus === "blacklist") {
        lines.push(`WARNUNG: Status GESPERRT — vorsichtig formulieren.`);
      } else if (contact.patientStatus === "warning") {
        lines.push(`Hinweis: Status "Auffällig".`);
      }
    }
    lines.push(`E-Mail-Adresse: ${to}`);
    sections.push(`<empfaenger>\n${lines.join("\n")}\n</empfaenger>`);
  } else if (to) {
    sections.push(
      `<empfaenger>\nUnbekannte:r Empfänger:in: ${to}\n(Keine EPHIA-Akte vorhanden, also keine Personalisierung über den Vornamen möglich.)\n</empfaenger>`,
    );
  } else {
    sections.push(
      `<empfaenger>\n(Noch keine Empfänger:in eingetragen — formuliere generisch mit "Hallo,".)\n</empfaenger>`,
    );
  }

  if (currentThread.length > 0) {
    const turns = currentThread
      .map((m, i) => {
        const tag = m.isInbound ? "EMPFÄNGER:IN" : "EPHIA";
        return `[${i + 1}] ${tag} (${m.date.split("T")[0]}, von ${m.from}):\n${m.text}`;
      })
      .join("\n\n");
    sections.push(
      `<aktueller_thread betreff="${subject || "(kein Betreff)"}">\n${turns}\n</aktueller_thread>`,
    );
  } else if (pastOutbound.length > 0) {
    const examples = pastOutbound
      .map(
        (t, i) =>
          `[Beispiel ${i + 1}] Betreff: "${t.subject}" (${t.date})\n${t.text}`,
      )
      .join("\n\n");
    sections.push(
      `<frühere_mails_an_diese_person>\nDies sind frühere Mails, die EPHIA an diese Person geschickt hat. Übernimm Anrede, Förmlichkeit und Tonfall.\n\n${examples}\n</frühere_mails_an_diese_person>`,
    );
  }

  if (subject && currentThread.length === 0) {
    sections.push(`<betreff>${subject}</betreff>`);
  }

  const draftHasContent = stripHtmlForCheck(currentDraft).length > 0;
  const targetLabel = mode === "template" ? "Vorlage" : "E-Mail-Body";
  if (draftHasContent) {
    sections.push(
      `<aktueller_entwurf>\n${currentDraft}\n</aktueller_entwurf>\n\n<aufgabe>Verfeinere den aktuellen Entwurf der ${targetLabel} gemäß folgender Anweisung. Behalte den Aufbau bei, ändere nur was die Anweisung verlangt:\n${instruction}</aufgabe>`,
    );
  } else {
    sections.push(
      `<aufgabe>Verfasse die ${targetLabel} gemäß folgender Anweisung der EPHIA-Mitarbeiter:in:\n${instruction}</aufgabe>`,
    );
  }

  if (userName && mode !== "template") {
    sections.push(
      `<unterschrift_hinweis>Die Mail wird von "${userName}" gesendet. Die Signatur (inkl. Grußformel und Name) wird automatisch angefügt — schreibe selbst KEINE Grußformel und KEINEN Namen.</unterschrift_hinweis>`,
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: sections.join("\n\n"),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "AI returned no text" },
        { status: 500 },
      );
    }
    let html = textBlock.text.trim();
    html = html
      .replace(/^```(?:html)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    if (!html) {
      return NextResponse.json(
        { error: "AI returned empty body" },
        { status: 500 },
      );
    }
    return NextResponse.json({ html });
  } catch (err) {
    console.error("AI draft error:", err);
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
