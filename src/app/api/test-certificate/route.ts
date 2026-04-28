import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  certificateRequiresVnr,
  generateCertificatePdf,
  getCertificateTemplate,
} from "@/lib/certificates";

/**
 * POST — render a CME certificate for a given name and return the PDF
 * bytes inline so the dashboard generator can either preview or
 * download it. Admin-only.
 *
 * Body: { name: string; templateSlug: string; vnrTheorie?: string; vnrPraxis?: string }
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
  const templateSlug = String(body.templateSlug || "").trim();
  const vnrTheorie = String(body.vnrTheorie || "").trim();
  const vnrPraxis = String(body.vnrPraxis || "").trim();

  if (!name) {
    return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  }
  if (!templateSlug) {
    return NextResponse.json({ error: "Kurs-Vorlage fehlt" }, { status: 400 });
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

  // Always serve the PDF inline. The dashboard generator decides
  // client-side whether to open the blob in a new tab or trigger a
  // download via a synthetic <a download> tag — both work off the same
  // bytes, so the API stays disposition-agnostic.
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="zertifikat-${template.slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
