import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

type ContactType = "auszubildende" | "proband" | "other" | "company";

async function assertAdmin() {
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

  if (!profile || profile.role === "admin") return user;
  return null;
}

async function stripeFetch(
  endpoint: string,
  init: { method?: "GET" | "POST"; body?: Record<string, string> } = {}
) {
  const method = init.method ?? "GET";
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init.body ? new URLSearchParams(init.body).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  }
  return json;
}

interface StripeInvoice {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  due_date: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  customer_name: string | null;
  customer_email: string | null;
  metadata: Record<string, string>;
}

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const data = await stripeFetch("/invoices?limit=100");
    const invoices = (data.data as StripeInvoice[])
      .filter((inv) => inv.metadata?.source === "admin_dashboard")
      .map((inv) => ({
        id: inv.id,
        number: inv.number,
        status: inv.status,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        created: inv.created,
        due_date: inv.due_date,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
        customer_name: inv.customer_name,
        customer_email: inv.customer_email,
      }));
    return NextResponse.json(invoices);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface LineItemInput {
  description: string;
  amount: number; // EUR, gross
}

export async function POST(req: NextRequest) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    phone,
    companyName,
    vatId,
    addressLine1,
    addressPostalCode,
    addressCity,
    addressCountry,
    auszubildendeId,
    contactType,
    isCompany: isCompanyFlag,
    createContact,
    lineItems,
    daysUntilDue,
  } = body as {
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    companyName?: string;
    // EU VAT / USt.-IdNr.; attached to the Stripe customer as a tax_id of
    // type eu_vat and persisted on the auszubildende row for reuse.
    vatId?: string;
    addressLine1?: string;
    addressPostalCode?: string;
    addressCity?: string;
    addressCountry?: string;
    auszubildendeId?: string;
    contactType?: ContactType;
    // Whether the contact is a company (separate from contactType, because
    // an Auszubildende:r or Sonstige:r can be invoiced as a Praxis/Firma
    // without changing their classification).
    isCompany?: boolean;
    // When true, a new auszubildende row is upserted from the provided fields
    // before the invoice is created. Used by the "Neue Person/Firma" mode.
    createContact?: boolean;
    lineItems: LineItemInput[];
    daysUntilDue: number;
  };

  // Validation: company contacts only need companyName + email; all others
  // need first + last name + email. The company-ness is driven by an
  // explicit flag so that any type (except proband) can be a company
  // without losing its classification. Legacy contactType="company" is
  // still honored for backwards compatibility.
  const isCompany = isCompanyFlag === true || contactType === "company";
  if (!email?.trim()) {
    return NextResponse.json(
      { error: "E-Mail ist erforderlich." },
      { status: 400 }
    );
  }
  if (isCompany) {
    if (!companyName?.trim()) {
      return NextResponse.json(
        { error: "Firmenname ist erforderlich." },
        { status: 400 }
      );
    }
  } else {
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "Vorname und Nachname sind erforderlich." },
        { status: 400 }
      );
    }
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json(
      { error: "Mindestens eine Rechnungsposition ist erforderlich." },
      { status: 400 }
    );
  }
  for (const li of lineItems) {
    if (!li.description?.trim()) {
      return NextResponse.json(
        { error: "Jede Position braucht eine Beschreibung." },
        { status: 400 }
      );
    }
    if (!Number.isFinite(li.amount) || li.amount <= 0) {
      return NextResponse.json(
        { error: "Jede Position braucht einen positiven Betrag." },
        { status: 400 }
      );
    }
  }
  const dueDays = Number.isFinite(daysUntilDue) && daysUntilDue > 0 ? Math.floor(daysUntilDue) : 14;

  try {
    // 1. Create Stripe Customer. For company contacts, the Stripe "name"
    //    must be the company so the invoice header shows the company name.
    //    For personal contacts we still persist companyName in metadata if
    //    supplied (e.g. a Praxis paying for the course) so it surfaces later.
    const personName = !isCompany
      ? `${firstName!.trim()} ${lastName!.trim()}`
      : "";
    const customerBody: Record<string, string> = {
      name: isCompany ? companyName!.trim() : personName,
      email: email.trim(),
    };
    if (phone) customerBody.phone = phone;
    if (addressLine1) customerBody["address[line1]"] = addressLine1;
    if (addressPostalCode) customerBody["address[postal_code]"] = addressPostalCode;
    if (addressCity) customerBody["address[city]"] = addressCity;
    if (addressCountry) customerBody["address[country]"] = addressCountry;
    if (!isCompany && companyName?.trim()) {
      customerBody["metadata[company_name]"] = companyName.trim();
    }
    customerBody["metadata[contact_type]"] = contactType || "other";
    if (isCompany) customerBody["metadata[is_company]"] = "true";

    const customer = await stripeFetch("/customers", {
      method: "POST",
      body: customerBody,
    });

    // Attach VAT ID as a Stripe tax_id so it shows on the invoice header.
    // eu_vat covers EU VAT numbers incl. the German USt.-IdNr. We tolerate
    // failures here (Stripe rejects malformed VAT numbers) so an invalid
    // VAT ID doesn't block the whole invoice.
    if (isCompany && vatId?.trim()) {
      try {
        await stripeFetch(`/customers/${customer.id}/tax_ids`, {
          method: "POST",
          body: {
            type: "eu_vat",
            value: vatId.trim(),
          },
        });
      } catch (taxErr) {
        console.warn("Tax ID attach failed:", taxErr);
      }
    }

    // 1b. Optionally upsert a row into the auszubildende contact table so
    //     the contact becomes searchable later. This runs for the "Neue
    //     Person/Firma" mode only; when an existing contact was picked the
    //     caller passes createContact=false.
    if (createContact) {
      try {
        const admin = createAdminClient();
        const emailKey = email.trim().toLowerCase();
        // Persist the real contact_type (auszubildende/proband/other). We
        // intentionally do NOT store "company" here — a Praxis that is an
        // Auszubildende:r stays classified as such; the presence of
        // company_name plus empty first/last name indicates company-ness.
        const persistedType: ContactType =
          contactType && contactType !== "company" ? contactType : "other";
        const row: Record<string, unknown> = {
          email: emailKey,
          contact_type: persistedType,
          company_name: companyName?.trim() || null,
          vat_id: vatId?.trim() || null,
          first_name: isCompany ? null : firstName?.trim() || null,
          last_name: isCompany ? null : lastName?.trim() || null,
          phone: phone?.trim() || null,
        };
        // Upsert on email so repeated sends don't create duplicates
        await admin.from("auszubildende").upsert(row, { onConflict: "email" });
      } catch (contactErr) {
        // Don't fail the invoice just because the contact row couldn't be
        // stored — the Stripe invoice is the source of truth.
        console.warn("Contact upsert failed:", contactErr);
      }
    }

    // 2. Create invoice items (they auto-attach to the next invoice for this customer)
    for (const li of lineItems) {
      await stripeFetch("/invoiceitems", {
        method: "POST",
        body: {
          customer: customer.id,
          currency: "eur",
          amount: String(Math.round(li.amount * 100)),
          description: li.description.trim(),
        },
      });
    }

    // 3. Create invoice (collection_method=send_invoice → Stripe does NOT auto-charge;
    //    customer pays via hosted_invoice_url). auto_advance=false → we control finalization.
    const invoiceBody: Record<string, string> = {
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: String(dueDays),
      auto_advance: "false",
      "metadata[source]": "admin_dashboard",
      "metadata[created_by]": user.id,
    };
    if (auszubildendeId) invoiceBody["metadata[auszubildendeId]"] = auszubildendeId;

    const invoice = await stripeFetch("/invoices", {
      method: "POST",
      body: invoiceBody,
    });

    // 4. Finalize so we get hosted_invoice_url and PDF. This does NOT email the customer
    //    (emailing only happens via the explicit /send endpoint, which we skip).
    const finalized = await stripeFetch(`/invoices/${invoice.id}/finalize`, {
      method: "POST",
    });

    return NextResponse.json({
      id: finalized.id,
      number: finalized.number,
      status: finalized.status,
      amount_due: finalized.amount_due,
      hosted_invoice_url: finalized.hosted_invoice_url,
      invoice_pdf: finalized.invoice_pdf,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Erstellen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
