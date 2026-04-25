import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  certificateRequiresVnr,
  generateCertificatePdf,
  getCertificateTemplate,
} from "@/lib/certificates";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

/**
 * POST — render a CME certificate for a given name and either email it
 * as an attachment or return the PDF inline for download. Admin-only.
 *
 * Body: { name: string; email?: string; templateSlug: string; preview?: boolean }
 *
 * When `preview` is true, returns the PDF bytes directly (Content-Type:
 * application/pdf). Otherwise sends the certificate via Resend to the
 * given email.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const templateSlug = String(body.templateSlug || "").trim();
  const vnrTheorie = String(body.vnrTheorie || "").trim();
  const vnrPraxis = String(body.vnrPraxis || "").trim();
  const preview = body.preview === true;

  if (!name) {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }
  if (!templateSlug) {
    return NextResponse.json({ error: "Kurs-Vorlage fehlt" }, { status: 400 });
  }
  if (!preview && !email) {
    return NextResponse.json({ error: "E-Mail fehlt" }, { status: 400 });
  }

  const template = getCertificateTemplate(templateSlug);
  if (!template) {
    return NextResponse.json(
      { error: `Vorlage "${templateSlug}" nicht gefunden.` },
      { status: 404 },
    );
  }

  // VNR fields are only required for templates that actually stamp them.
  // The Zahnmedizin variant has no CME and therefore no VNR layout, so
  // empty strings are accepted.
  if (certificateRequiresVnr(template)) {
    if (!vnrTheorie) {
      return NextResponse.json({ error: "VNR Theorie fehlt" }, { status: 400 });
    }
    if (!vnrPraxis) {
      return NextResponse.json({ error: "VNR Praxis fehlt" }, { status: 400 });
    }
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateCertificatePdf({
      template,
      fullName: name,
      vnrTheorie,
      vnrPraxis,
    });
  } catch (err) {
    console.error("Certificate render failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Zertifikat konnte nicht erstellt werden.",
      },
      { status: 500 },
    );
  }

  if (preview) {
    // Serve the PDF inline so the browser's viewer opens it immediately.
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="zertifikat-${template.slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY nicht konfiguriert." },
      { status: 500 },
    );
  }

  const filename = `EPHIA-Zertifikat-${template.label.replace(/\s+/g, "-")}.pdf`;
  // Resend attachments expect base64-encoded content.
  const base64 = Buffer.from(pdfBytes).toString("base64");

  const subject = `Dein Zertifikat: ${template.label}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#111;">
    <p>Hallo,</p>
    <p>anbei findest Du Dein persönliches Zertifikat für die erfolgreiche Teilnahme am <strong>${template.label}</strong>.</p>
    <p>Viele Grüße<br>Dein EPHIA-Team</p>
  </div>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
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
      attachments: [{ filename, content: base64 }],
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text();
    console.error("Resend certificate send failed:", errText);
    return NextResponse.json(
      { error: `Resend error: ${errText}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, sentTo: email });
}
