import { NextRequest, NextResponse } from "next/server";
import { requireVerifiedAdmin } from "@/lib/auth-verify";
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
  // Verified-admin gate (validates the session, never the forgeable
  // x-user-role cookie the previous isAdmin() check trusted).
  if (!(await requireVerifiedAdmin())) {
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
  // sessionDateIso drives the dynamic "Berlin, <Monat> <Jahr>" stamp
  // in the footer. Optional: legacy callers without the date still get
  // a valid PDF, just with whatever date the master PDF was exported
  // with (which is exactly the bug we're fixing for the test form).
  const sessionDateIsoRaw = String(body.sessionDateIso || "").trim();
  const sessionDateIso = /^\d{4}-\d{2}-\d{2}$/.test(sessionDateIsoRaw)
    ? sessionDateIsoRaw
    : "";

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

  // VNR fields are only required for templates that actually stamp them,
  // and only the specific slots a template carries: a cert with no VNR
  // layout at all accepts empty strings, and the praxis-only Aufbaukurs
  // Biostimulation & Skinbooster requires only VNR Praxis.
  if (certificateRequiresVnr(template)) {
    if (template.layout.vnrTheorie && !vnrTheorie) {
      return NextResponse.json({ error: "VNR Theorie fehlt" }, { status: 400 });
    }
    if (template.layout.vnrPraxis && !vnrPraxis) {
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
      sessionDateIso: sessionDateIso || undefined,
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
