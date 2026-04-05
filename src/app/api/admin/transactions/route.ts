import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;

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

async function stripeGet(endpoint: string) {
  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe error ${res.status}`);
  }
  return json;
}

// Stripe list endpoints cap limit at 100. We cursor-paginate with
// starting_after to reach up to `maxTotal` rows across multiple calls.
async function fetchPaginated<T extends { id: string }>(
  basePath: string,
  maxTotal: number
): Promise<T[]> {
  const out: T[] = [];
  let startingAfter: string | null = null;
  // Safety cap: at most 5 pages (500 rows) to avoid runaway loops.
  for (let page = 0; page < 5 && out.length < maxTotal; page++) {
    const limit = Math.min(100, maxTotal - out.length);
    const qs = new URLSearchParams({ limit: String(limit) });
    if (startingAfter) qs.set("starting_after", startingAfter);
    const sep = basePath.includes("?") ? "&" : "?";
    const data = await stripeGet(`${basePath}${sep}${qs.toString()}`);
    const batch: T[] = data.data || [];
    out.push(...batch);
    if (!data.has_more || batch.length === 0) break;
    startingAfter = batch[batch.length - 1].id;
  }
  return out;
}

type StripeInvoice = {
  id: string;
  number: string | null;
  status: string;
  amount_due: number;
  amount_paid: number;
  total: number;
  currency: string;
  created: number;
  due_date: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  customer_name: string | null;
  customer_email: string | null;
  description: string | null;
  metadata: Record<string, string> | null;
  charge: string | null;
};

type StripeCharge = {
  id: string;
  amount: number;
  amount_refunded: number;
  currency: string;
  created: number;
  status: string;
  refunded: boolean;
  receipt_url: string | null;
  description: string | null;
  invoice: string | null;
  billing_details: {
    name: string | null;
    email: string | null;
  } | null;
  metadata: Record<string, string> | null;
};

export type TransactionKind =
  | "invoice_manual"
  | "invoice_no_show"
  | "invoice_other"
  | "charge";

export type Transaction = {
  id: string;
  kind: TransactionKind;
  created: number;
  amount: number;
  currency: string;
  // Normalized status: paid/open/draft/uncollectible/void/succeeded/refunded/partially_refunded/failed/pending
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  description: string | null;
  // Invoice-only
  invoice_number: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  // Charge-only
  receipt_url: string | null;
  amount_refunded: number;
  // Cross-link to a contact in the auszubildende table (matched by email)
  auszubildende_id: string | null;
};

function classifyInvoice(inv: StripeInvoice): TransactionKind {
  const kind = inv.metadata?.kind;
  if (kind === "no_show") return "invoice_no_show";
  if (kind === "manual" || inv.metadata?.source === "admin_dashboard")
    return "invoice_manual";
  return "invoice_other";
}

function normalizeChargeStatus(c: StripeCharge): string {
  if (c.status === "succeeded") {
    if (c.refunded) return "refunded";
    if (c.amount_refunded > 0 && c.amount_refunded < c.amount)
      return "partially_refunded";
    return "succeeded";
  }
  return c.status; // pending/failed
}

export async function GET() {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    // Fetch up to 200 invoices + 200 charges in parallel. Voided and draft
    // invoices are included so the ledger is complete.
    const [invoices, charges] = await Promise.all([
      fetchPaginated<StripeInvoice>("/invoices", 200),
      fetchPaginated<StripeCharge>("/charges", 200),
    ]);

    // Collect all emails so we can batch-lookup matching auszubildende ids
    // in a single query (one round-trip regardless of row count).
    const emails = new Set<string>();
    for (const inv of invoices) {
      if (inv.customer_email) emails.add(inv.customer_email.toLowerCase());
    }
    for (const c of charges) {
      const email = c.billing_details?.email;
      if (email) emails.add(email.toLowerCase());
    }

    const emailToAzubiId: Record<string, string> = {};
    if (emails.size > 0) {
      try {
        const admin = createAdminClient();
        const { data: rows } = await admin
          .from("auszubildende")
          .select("id, email")
          .in("email", Array.from(emails));
        for (const r of rows ?? []) {
          if (r.email) emailToAzubiId[r.email.toLowerCase()] = r.id;
        }
      } catch (err) {
        console.warn("auszubildende lookup failed:", err);
      }
    }

    const transactions: Transaction[] = [];

    // 1. Invoices (all kinds)
    for (const inv of invoices) {
      const email = inv.customer_email?.toLowerCase() ?? null;
      transactions.push({
        id: inv.id,
        kind: classifyInvoice(inv),
        created: inv.created,
        // Use total (signed amount) so refunds/credits would show correctly;
        // for normal invoices this equals amount_due.
        amount: inv.total ?? inv.amount_due,
        currency: inv.currency,
        status: inv.status,
        customer_name: inv.customer_name,
        customer_email: inv.customer_email,
        description: inv.description,
        invoice_number: inv.number,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf_url: inv.invoice_pdf,
        receipt_url: null,
        amount_refunded: 0,
        auszubildende_id: email ? emailToAzubiId[email] ?? null : null,
      });
    }

    // 2. Charges — skip any attached to an invoice (those already appear
    //    as invoice rows above, avoiding double-counting).
    for (const c of charges) {
      if (c.invoice) continue;
      const email = c.billing_details?.email?.toLowerCase() ?? null;
      transactions.push({
        id: c.id,
        kind: "charge",
        created: c.created,
        amount: c.amount,
        currency: c.currency,
        status: normalizeChargeStatus(c),
        customer_name: c.billing_details?.name ?? null,
        customer_email: c.billing_details?.email ?? null,
        description: c.description,
        invoice_number: null,
        hosted_invoice_url: null,
        invoice_pdf_url: null,
        receipt_url: c.receipt_url,
        amount_refunded: c.amount_refunded,
        auszubildende_id: email ? emailToAzubiId[email] ?? null : null,
      });
    }

    // Strict chronological desc
    transactions.sort((a, b) => b.created - a.created);

    return NextResponse.json(transactions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Laden";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
