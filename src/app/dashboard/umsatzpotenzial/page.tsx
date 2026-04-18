import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

/** Gate: only these two users may see the revenue-potential dashboard. */
const ALLOWED_EMAILS = ["sophia@ephia.de", "marc@ephia.de"];

type TemplateRow = {
  id: string;
  title: string | null;
  course_label_de: string | null;
  price_gross_kombi: number | null;
  price_gross_praxis: number | null;
  price_gross_online: number | null;
  vat_rate_kombi: number | null;
  vat_rate_praxis: number | null;
  vat_rate_online: number | null;
};

type SessionRow = {
  id: string;
  template_id: string;
  date_iso: string;
  label_de: string | null;
  max_seats: number;
  booked_seats: number;
  is_live: boolean;
};

function fmtEur(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function fmtInt(n: number): string {
  return n.toLocaleString("de-DE");
}

export default async function UmsatzpotenzialPage() {
  // Access gate. Using auth.getUser here rather than reading the cookie
  // so we can't be fooled by a stale/forged session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const year = today.getFullYear();
  const endOfYearIso = `${year}-12-31`;

  const [{ data: sessionsData }, { data: templatesData }] = await Promise.all([
    admin
      .from("course_sessions")
      .select("id, template_id, date_iso, label_de, max_seats, booked_seats, is_live")
      .gte("date_iso", todayIso)
      .lte("date_iso", endOfYearIso)
      .order("date_iso", { ascending: true }),
    admin
      .from("course_templates")
      .select(
        "id, title, course_label_de, price_gross_kombi, price_gross_praxis, price_gross_online, vat_rate_kombi, vat_rate_praxis, vat_rate_online",
      ),
  ]);

  const sessions = (sessionsData as SessionRow[] | null) ?? [];
  const templates = (templatesData as TemplateRow[] | null) ?? [];
  const tmplById = new Map<string, TemplateRow>(templates.map((t) => [t.id, t]));

  // Pricing assumption: we value each open seat at the template's Kombikurs
  // price (Online- & Praxiskurs) because that is what the overwhelming
  // majority of Praxiskurs-bookings pay in practice (confirmed via the
  // HubSpot legacy import). When a template has no Kombi price set, fall
  // back to Praxis, then Online. VAT rate comes from the matching column,
  // defaulting to 19 % if the template row has no rate.
  function pricingFor(t: TemplateRow): { pricePerSeat: number; vatRate: number; basis: "Kombikurs" | "Praxiskurs" | "Onlinekurs" | "–" } {
    if (t.price_gross_kombi != null) return { pricePerSeat: t.price_gross_kombi, vatRate: t.vat_rate_kombi ?? 0.19, basis: "Kombikurs" };
    if (t.price_gross_praxis != null) return { pricePerSeat: t.price_gross_praxis, vatRate: t.vat_rate_praxis ?? 0.19, basis: "Praxiskurs" };
    if (t.price_gross_online != null) return { pricePerSeat: t.price_gross_online, vatRate: t.vat_rate_online ?? 0.19, basis: "Onlinekurs" };
    return { pricePerSeat: 0, vatRate: 0.19, basis: "–" };
  }

  type TemplateAgg = {
    label: string;
    seats: number;
    gross: number;
    net: number;
    basis: string;
  };

  type SessionRowView = {
    dateIso: string;
    label: string;
    courseLabel: string;
    openSeats: number;
    maxSeats: number;
    bookedSeats: number;
    pricePerSeat: number;
    gross: number;
    net: number;
    isLive: boolean;
  };

  let totalOpen = 0;
  let totalGross = 0;
  let totalNet = 0;
  let totalMaxSeats = 0;
  const perTemplate = new Map<string, TemplateAgg>();
  const perSession: SessionRowView[] = [];

  for (const s of sessions) {
    totalMaxSeats += s.max_seats;
    const open = Math.max(s.max_seats - s.booked_seats, 0);
    const t = tmplById.get(s.template_id);
    if (!t) continue;
    const { pricePerSeat, vatRate, basis } = pricingFor(t);
    const gross = open * pricePerSeat;
    const net = gross / (1 + vatRate);

    totalOpen += open;
    totalGross += gross;
    totalNet += net;

    const label = t.course_label_de || t.title || "Unbekannter Kurs";
    const existing = perTemplate.get(s.template_id) ?? {
      label,
      seats: 0,
      gross: 0,
      net: 0,
      basis,
    };
    existing.seats += open;
    existing.gross += gross;
    existing.net += net;
    perTemplate.set(s.template_id, existing);

    perSession.push({
      dateIso: s.date_iso,
      label: s.label_de || "",
      courseLabel: label,
      openSeats: open,
      maxSeats: s.max_seats,
      bookedSeats: s.booked_seats,
      pricePerSeat,
      gross,
      net,
      isLive: s.is_live,
    });
  }

  const templateRows = [...perTemplate.values()].sort((a, b) => b.gross - a.gross);
  const fillRate = totalMaxSeats > 0 ? ((totalMaxSeats - totalOpen) / totalMaxSeats) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Umsatzpotenzial</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Offene Plätze und potenzieller Umsatz bis{" "}
          <span className="font-medium">
            {format(new Date(endOfYearIso), "dd.MM.yyyy", { locale: de })}
          </span>
          . Preise pro Platz sind auf Basis des Kombikurs-Listenpreises berechnet
          (Fallback: Praxiskurs, dann Onlinekurs).
        </p>
      </div>

      {/* Big-number cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[10px] bg-card p-5 ring-1 ring-black/5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Offene Plätze</p>
          <p className="text-3xl font-bold mt-1">{fmtInt(totalOpen)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            von insgesamt {fmtInt(totalMaxSeats)} ({fillRate.toFixed(1)}% belegt)
          </p>
        </div>
        <div className="rounded-[10px] bg-card p-5 ring-1 ring-black/5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Brutto-Potenzial</p>
          <p className="text-3xl font-bold mt-1 text-[#0066FF]">{fmtEur(totalGross)}</p>
          <p className="text-xs text-muted-foreground mt-2">inkl. MwSt.</p>
        </div>
        <div className="rounded-[10px] bg-card p-5 ring-1 ring-black/5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Netto-Potenzial</p>
          <p className="text-3xl font-bold mt-1">{fmtEur(totalNet)}</p>
          <p className="text-xs text-muted-foreground mt-2">nach MwSt., gewichtet pro Kurs</p>
        </div>
      </div>

      {/* Per-template breakdown */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Nach Kurs</h2>
        <div className="overflow-hidden rounded-[10px] ring-1 ring-black/5 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Kurs</th>
                <th className="text-left px-4 py-2.5 font-medium">Bewertet als</th>
                <th className="text-right px-4 py-2.5 font-medium">Offene Plätze</th>
                <th className="text-right px-4 py-2.5 font-medium">Brutto</th>
                <th className="text-right px-4 py-2.5 font-medium">Netto</th>
              </tr>
            </thead>
            <tbody>
              {templateRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted-foreground py-8">
                    Keine offenen Plätze bis Jahresende.
                  </td>
                </tr>
              ) : (
                templateRows.map((r) => (
                  <tr key={r.label} className="border-t border-black/5">
                    <td className="px-4 py-2.5">{r.label}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.basis}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(r.seats)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(r.gross)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(r.net)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {templateRows.length > 0 && (
              <tfoot className="bg-muted/40 font-semibold">
                <tr>
                  <td className="px-4 py-2.5" colSpan={2}>Gesamt</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(totalOpen)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(totalGross)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(totalNet)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Per-session detail */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Details pro Termin</h2>
        <div className="overflow-hidden rounded-[10px] ring-1 ring-black/5 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Datum</th>
                <th className="text-left px-4 py-2.5 font-medium">Kurs</th>
                <th className="text-right px-4 py-2.5 font-medium">Offen / Max</th>
                <th className="text-right px-4 py-2.5 font-medium">Preis/Platz</th>
                <th className="text-right px-4 py-2.5 font-medium">Brutto</th>
                <th className="text-right px-4 py-2.5 font-medium">Netto</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {perSession.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8">
                    Keine Termine bis Jahresende.
                  </td>
                </tr>
              ) : (
                perSession.map((r) => (
                  <tr key={`${r.dateIso}-${r.courseLabel}`} className="border-t border-black/5">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {format(new Date(r.dateIso), "dd.MM.yyyy", { locale: de })}
                    </td>
                    <td className="px-4 py-2.5">{r.courseLabel}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={r.openSeats === 0 ? "text-emerald-600 font-medium" : ""}>
                        {fmtInt(r.openSeats)}
                      </span>
                      <span className="text-muted-foreground"> / {fmtInt(r.maxSeats)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(r.pricePerSeat)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(r.gross)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtEur(r.net)}</td>
                    <td className="px-4 py-2.5">
                      {r.isLive ? (
                        <span className="text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">Live</span>
                      ) : (
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">Offline</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
