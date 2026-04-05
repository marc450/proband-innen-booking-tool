import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

async function stripeFetch(
  endpoint: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: Record<string, string> } = {}
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

// Cancel an invoice. Stripe's rules:
//   - draft        → delete the invoice entirely (no number assigned yet)
//   - open         → void the invoice (keeps the number, PDF marked "void")
//   - paid         → cannot cancel, must refund separately
//   - uncollectible → void it
//   - void         → already cancelled, no-op
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await assertAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;

  try {
    const invoice = await stripeFetch(`/invoices/${id}`);
    const status: string = invoice.status;

    if (status === "paid") {
      return NextResponse.json(
        {
          error:
            "Bezahlte Rechnungen können nicht storniert werden. Bitte erstatte den Betrag stattdessen über Stripe.",
        },
        { status: 400 }
      );
    }

    if (status === "void") {
      return NextResponse.json({ ok: true, status: "void" });
    }

    if (status === "draft") {
      await stripeFetch(`/invoices/${id}`, { method: "DELETE" });
      return NextResponse.json({ ok: true, status: "deleted" });
    }

    // open, uncollectible → void
    const voided = await stripeFetch(`/invoices/${id}/void`, { method: "POST" });
    return NextResponse.json({ ok: true, status: voided.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fehler beim Stornieren";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
