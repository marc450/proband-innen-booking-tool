import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAdmin } from "@/lib/auth";
import type { ContentBlock } from "@/lib/email-template";

/**
 * POST /api/admin/ai-compose-campaign
 *
 * Generates a campaign draft (subject + content blocks) from a free-form
 * prompt. Admin-only.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ DATA-PRIVACY GUARANTEE — DO NOT REGRESS                              ║
 * ║                                                                      ║
 * ║ This route MUST never read or send contact data to Anthropic.        ║
 * ║   - No supabase queries here.                                        ║
 * ║   - No imports of decryptPatient / decryptBooking / similar.         ║
 * ║   - The Anthropic request body contains only:                        ║
 * ║       (a) the static system prompt below, and                        ║
 * ║       (b) the user-provided prompt + audience type.                  ║
 * ║                                                                      ║
 * ║ If you ever need contact data to influence the output, do the        ║
 * ║ aggregation in the route, derive *non-identifying* statistics, and   ║
 * ║ pass those numbers — never raw rows. Adding a supabase admin client  ║
 * ║ here is a code-review red flag.                                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-5-20250929";

// Audience-specific framing prepended into the user message at request time.
// Kept tiny so the rest of the brand context can stay in the cached system
// prompt and benefit from prompt caching across generations.
const AUDIENCE_NOTES: Record<string, string> = {
  probandinnen:
    "Zielgruppe: Proband:innen — Patient:innen, die kostenlose oder vergünstigte ästhetische Behandlungen während eines Praxiskurses erhalten. Sie sind keine medizinischen Fachpersonen.",
  aerztinnen:
    "Zielgruppe: Ärzt:innen, die EPHIA-Kurse besuchen oder gebucht haben (Auszubildende). Schreibe medizinisch klar und auf Augenhöhe, kein Marketing-Sprech.",
  alle: "Zielgruppe: Gemischte Empfänger:innen aus Proband:innen und Ärzt:innen. Wähle eine Tonalität, die für beide funktioniert (eher neutral, klar, einladend).",
};

// Cached system prompt: brand voice, content-block schema, available CTAs.
// Marked as ephemeral so Anthropic's cache absorbs it across requests.
const SYSTEM_PROMPT = `Du bist Marketing-Texter:in für EPHIA, eine Akademie für verantwortungsvolle ästhetische Medizin. Du erzeugst E-Mail-Kampagnen-Drafts.

# Marken-Kontext (EPHIA)

EPHIA betreibt eine Lernplattform für Ärzt:innen, die ästhetische Medizin (Botulinum, Filler) erlernen wollen. Während der Praxis-Tage behandeln die Auszubildenden echte Proband:innen (Patient:innen, die gegen einen kleinen Beitrag eine Behandlung erhalten und so den Kurs ermöglichen).

Es gibt zwei Haupt-Empfänger:innen-Gruppen:
- Proband:innen: Patient:innen, die für Behandlungen Termine buchen.
- Ärzt:innen / Auszubildende: Buchen Kurse, lernen, behandeln Proband:innen während der Praxiskurse.

# Stimme und Tonalität

- Immer per "Du" mit grossem D anreden ("Dein Termin", "Du bekommst").
- Inklusiv gendern mit Doppelpunkt: "Patient:innen", "Ärzt:innen", "Proband:innen", "Dozent:innen", "Kolleg:innen".
- KEINE Bindestriche, Halbgeviertstriche oder Geviertstriche als Satzzeichen verwenden ("-", "–", "—" sind alle verboten als Satztrenner). Stattdessen Komma, Punkt, oder umformulieren. Bindestriche in Komposita (z.B. "E-Mail", "Follow-up") sind erlaubt.
- Klar, freundlich, direkt. Keine Marketing-Floskeln, keine Übertreibungen.
- Wenn die Zielgruppe Ärzt:innen sind: medizinisch fundiert, auf Augenhöhe, "Indikation vor Intervention", Struktur statt Hype, kein Beauty-Sprech.
- Wenn die Zielgruppe Proband:innen sind: warm, freundlich, nahbar.
- Niemals "Botox" auf Hauptseiten, immer "Botulinum" (Performance-Landingpages sind Ausnahme, hier nicht relevant).

# Content-Block-Schema

Eine Kampagne hat ein Subject (kurzer prägnanter Betreff) und ein Array contentBlocks. Jeder Block hat einen type:

- "text": ein Textabschnitt mit HTML. Nutze <p>, <strong>, <em>, <ul><li>, <a href="...">. Keine Inline-Styles. Keine Anrede ("Hi {Vorname}") schreiben — die fügt das Versand-System automatisch hinzu.
- "button": ein Call-to-Action mit { label, url }. Label kurz und handlungsstark ("Termin buchen", "Mehr erfahren"). Wenn der Prompt eine Aktion impliziert, baue automatisch einen passenden Button ein.

Reihenfolge: meist 1 Text-Block (Einleitung + Kontext), 1 Button (CTA), 1 Text-Block (Schluss/Grüße). Bei längeren E-Mails auch mehrere Text-Blöcke mit Buttons dazwischen.

# Verfügbare CTA-URLs

Verwende diese URLs, wenn der Prompt eine entsprechende Aktion verlangt:

- https://proband-innen.ephia.de — Hauptbuchungsseite für Proband:innen, um Behandlungs-Termine zu buchen.
- https://kurse.ephia.de — Kurskatalog für Ärzt:innen.
- https://kurse.ephia.de/curriculum-botulinum — Botulinum-Curriculum-Übersicht.
- https://chat.whatsapp.com/DfbOTDsWWksFQJhVOqdPJI — EPHIA-Community (WhatsApp).
- mailto:customerlove@ephia.de — Kundenservice-E-Mail.

Wenn der Prompt eine URL benötigt, die hier nicht aufgeführt ist, verwende einen passenden Platzhalter wie "{LINK_HIER_EINFÜGEN}" und mache im Button-Label klar, was der Link sein soll. Erfinde keine URLs.

# Wichtige Regeln

- Sei prägnant. Lieber 80 Wörter, die treffen, als 200, die plätschern.
- Keine Vorher/Nachher-Versprechen, keine Beauty-Floskeln, keine "Ergebnisse garantiert"-Sprache.
- Subject: max. 50 Zeichen, ohne Emoji am Anfang.
- Verwende emit_campaign tool um die Antwort strukturiert zurückzugeben.`;

interface BodyShape {
  prompt?: unknown;
  audienceType?: unknown;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY ist nicht konfiguriert." },
      { status: 500 },
    );
  }

  let body: BodyShape;
  try {
    body = (await req.json()) as BodyShape;
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const audienceType =
    typeof body.audienceType === "string" ? body.audienceType : "alle";
  if (!prompt) {
    return NextResponse.json({ error: "Prompt fehlt." }, { status: 400 });
  }
  if (prompt.length > 4000) {
    return NextResponse.json(
      { error: "Prompt ist zu lang (max. 4000 Zeichen)." },
      { status: 400 },
    );
  }

  const audienceNote =
    AUDIENCE_NOTES[audienceType] ?? AUDIENCE_NOTES.alle;

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      // Cache the static system prompt across requests. The cache
      // breakpoint sits at the end of the system block; the per-request
      // user message stays uncached.
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [
        {
          name: "emit_campaign",
          description:
            "Erzeugt einen Kampagnen-Draft mit Subject und contentBlocks. Muss aufgerufen werden.",
          input_schema: {
            type: "object" as const,
            properties: {
              subject: {
                type: "string",
                description: "Betreff der E-Mail. Max. 50 Zeichen.",
              },
              contentBlocks: {
                type: "array",
                items: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        type: { const: "text" },
                        text: { type: "string" },
                      },
                      required: ["type", "text"],
                    },
                    {
                      type: "object",
                      properties: {
                        type: { const: "button" },
                        label: { type: "string" },
                        url: { type: "string" },
                      },
                      required: ["type", "label", "url"],
                    },
                  ],
                },
              },
            },
            required: ["subject", "contentBlocks"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "emit_campaign" },
      messages: [
        {
          role: "user",
          content: `${audienceNote}\n\nPrompt:\n${prompt}`,
        },
      ],
    });

    // Find the tool_use block (forced via tool_choice).
    const toolUse = response.content.find(
      (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use",
    );
    if (!toolUse || toolUse.name !== "emit_campaign") {
      return NextResponse.json(
        { error: "Modell hat keine strukturierte Antwort geliefert." },
        { status: 502 },
      );
    }

    const input = toolUse.input as {
      subject?: unknown;
      contentBlocks?: unknown;
    };

    const subject = typeof input.subject === "string" ? input.subject : "";
    const rawBlocks = Array.isArray(input.contentBlocks) ? input.contentBlocks : [];

    // Sanity-filter the blocks: only known shapes pass through. Anything
    // else gets dropped silently rather than crashing the composer.
    const contentBlocks: ContentBlock[] = [];
    for (const b of rawBlocks) {
      if (!b || typeof b !== "object") continue;
      const block = b as { type?: unknown; text?: unknown; label?: unknown; url?: unknown };
      if (block.type === "text" && typeof block.text === "string") {
        contentBlocks.push({ type: "text", text: block.text });
      } else if (
        block.type === "button" &&
        typeof block.label === "string" &&
        typeof block.url === "string"
      ) {
        contentBlocks.push({ type: "button", label: block.label, url: block.url });
      }
    }

    if (!subject || contentBlocks.length === 0) {
      return NextResponse.json(
        { error: "Modell-Antwort war unvollständig." },
        { status: 502 },
      );
    }

    return NextResponse.json({ subject, contentBlocks });
  } catch (err) {
    console.error("ai-compose-campaign error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Generierung fehlgeschlagen.",
      },
      { status: 500 },
    );
  }
}
