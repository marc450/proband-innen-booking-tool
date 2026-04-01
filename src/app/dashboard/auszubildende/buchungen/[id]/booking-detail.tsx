"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, Receipt, Tag, User, Calendar, FileText, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface StripeDetails {
  sessionId: string;
  paymentIntentId: string | null;
  paymentStatus: string;
  amountTotal: number | null;
  amountSubtotal: number | null;
  currency: string;
  paymentMethod: {
    type: string;
    card: { brand: string; last4: string; exp_month: number; exp_year: number; funding: string; country: string } | null;
    klarna: Record<string, unknown> | null;
    sepa_debit: { bank_code: string; last4: string; country: string } | null;
    sofort: Record<string, unknown> | null;
    paypal: Record<string, unknown> | null;
  } | null;
  klarnaDetails: { payment_method_category: string | null; preferred_locale: string | null } | null;
  fees: { amount: number; description: string; type: string }[];
  totalFees: number;
  netAmount: number;
  discount: { amount: number } | null;
  coupon: { id: string; name: string; percent_off: number | null; amount_off: number | null } | null;
  promoCode: string | null;
  tax: { amount: number } | null;
  customerEmail: string | null;
  customerName: string | null;
  created: number;
  chargeId: string | null;
  receiptUrl: string | null;
  refunded: boolean;
  amountRefunded: number;
  error?: string;
}

interface BookingData {
  booking: {
    id: string;
    course_type: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    amount_paid: number | null;
    status: string;
    created_at: string;
    audience_tag: string | null;
    stripe_checkout_session_id: string | null;
    stripe_customer_id: string | null;
    stripe_invoice_url: string | null;
    stripe_invoice_pdf_url: string | null;
    stripe_credit_note_url: string | null;
    course_sessions: { date_iso: string; label_de: string | null; instructor_name: string | null; start_time: string | null; duration_minutes: number | null; address: string | null } | null;
    course_templates: { title: string; course_label_de: string | null; course_key: string | null } | null;
  };
  stripeDetails: StripeDetails | null;
  auszubildendeProfile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    title: string | null;
    gender: string | null;
    specialty: string | null;
    birthdate: string | null;
    efn: string | null;
  } | null;
}

const statusLabels: Record<string, string> = {
  booked: "Gebucht",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  refunded: "Erstattet",
};

const statusColors: Record<string, string> = {
  booked: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-amber-100 text-amber-700",
};

const courseTypeColors: Record<string, string> = {
  Praxiskurs: "bg-purple-100 text-purple-700",
  Onlinekurs: "bg-sky-100 text-sky-700",
  Kombikurs: "bg-amber-100 text-amber-700",
  Premium: "bg-gray-200 text-gray-700",
};

function formatCurrency(cents: number | null | undefined) {
  if (cents == null) return "–";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

function getPaymentMethodLabel(pm: StripeDetails["paymentMethod"]) {
  if (!pm) return "Unbekannt";
  switch (pm.type) {
    case "card":
      if (pm.card) {
        const brand = pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1);
        return `${brand} •••• ${pm.card.last4}`;
      }
      return "Kreditkarte";
    case "klarna":
      return "Klarna";
    case "sepa_debit":
      if (pm.sepa_debit) return `SEPA •••• ${pm.sepa_debit.last4}`;
      return "SEPA-Lastschrift";
    case "sofort":
      return "Sofort / Klarna";
    case "paypal":
      return "PayPal";
    default:
      return pm.type.charAt(0).toUpperCase() + pm.type.slice(1);
  }
}

function getKlarnaCategory(category: string | null) {
  if (!category) return null;
  switch (category) {
    case "pay_later": return "Rechnung (Später bezahlen)";
    case "pay_over_time": return "Ratenzahlung";
    case "pay_now": return "Sofortüberweisung";
    default: return category;
  }
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === "–") return null;
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function BookingDetail({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/booking-details?id=${bookingId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Fehler beim Laden"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">{error || "Buchung nicht gefunden"}</p>
        <Link href="/dashboard/auszubildende/buchungen" className="text-[#0066FF] text-sm mt-2 inline-block">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  const { booking, stripeDetails, auszubildendeProfile } = data;
  const s = stripeDetails;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/auszubildende/buchungen" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {booking.first_name} {booking.last_name}
          </h1>
          <p className="text-gray-500 text-sm">{booking.email}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${courseTypeColors[booking.course_type] || "bg-gray-100 text-gray-600"}`}>
          {booking.course_type}
        </span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[booking.status] || "bg-gray-100 text-gray-600"}`}>
          {statusLabels[booking.status] || booking.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Info */}
        <div className="bg-white rounded-[10px] p-6 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Buchungsdetails
          </h2>
          <InfoRow label="Buchungs-ID" value={<span className="font-mono text-xs">{booking.id.slice(0, 8)}...</span>} />
          <InfoRow label="Kurs" value={booking.course_templates?.title || "–"} />
          <InfoRow label="Kurstyp" value={booking.course_type} />
          <InfoRow label="Kursdatum" value={booking.course_sessions?.date_iso ? formatDate(booking.course_sessions.date_iso) : "–"} />
          <InfoRow label="Startzeit" value={booking.course_sessions?.start_time || "–"} />
          <InfoRow label="Dozent:in" value={booking.course_sessions?.instructor_name || "–"} />
          <InfoRow label="Ort" value={booking.course_sessions?.address || "–"} />
          <InfoRow label="Kaufdatum" value={formatDate(booking.created_at)} />
          <InfoRow label="Zielgruppe" value={booking.audience_tag || "–"} />
          {booking.phone && <InfoRow label="Telefon" value={booking.phone} />}
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-[10px] p-6 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Zahlungsdetails
          </h2>
          {s && !s.error ? (
            <>
              <InfoRow label="Zahlungsmethode" value={getPaymentMethodLabel(s.paymentMethod)} />
              {s.paymentMethod?.type === "card" && s.paymentMethod.card && (
                <>
                  <InfoRow label="Kartentyp" value={s.paymentMethod.card.funding === "credit" ? "Kreditkarte" : s.paymentMethod.card.funding === "debit" ? "Debitkarte" : s.paymentMethod.card.funding} />
                  <InfoRow label="Land" value={s.paymentMethod.card.country || "–"} />
                  <InfoRow label="Gültig bis" value={`${String(s.paymentMethod.card.exp_month).padStart(2, "0")}/${s.paymentMethod.card.exp_year}`} />
                </>
              )}
              {s.klarnaDetails && (
                <InfoRow label="Klarna-Zahlungsart" value={getKlarnaCategory(s.klarnaDetails.payment_method_category)} />
              )}
              {s.paymentMethod?.type === "klarna" && !s.klarnaDetails && (
                <InfoRow label="Klarna-Zahlungsart" value="Klarna" />
              )}
              <div className="border-t border-gray-100 my-3" />
              <InfoRow label="Betrag (brutto)" value={formatCurrency(s.amountTotal)} />
              {s.amountSubtotal !== s.amountTotal && (
                <InfoRow label="Betrag (netto)" value={formatCurrency(s.amountSubtotal)} />
              )}
              {s.tax && <InfoRow label="MwSt." value={formatCurrency(s.tax.amount)} />}
              {s.discount && <InfoRow label="Rabatt" value={`-${formatCurrency(s.discount.amount)}`} />}
              <InfoRow label="Zahlungsstatus" value={
                s.paymentStatus === "paid" ? <span className="text-emerald-600">Bezahlt</span> :
                s.paymentStatus === "unpaid" ? <span className="text-red-600">Nicht bezahlt</span> :
                s.paymentStatus
              } />
              {s.refunded && (
                <InfoRow label="Erstattet" value={<span className="text-amber-600">{formatCurrency(s.amountRefunded)}</span>} />
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">
              {booking.stripe_checkout_session_id ? "Stripe-Daten konnten nicht geladen werden" : "Keine Stripe-Zahlung"}
            </p>
          )}
        </div>

        {/* Fees */}
        {s && !s.error && s.fees.length > 0 && (
          <div className="bg-white rounded-[10px] p-6 shadow-sm">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-400" />
              Gebühren & Nettobetrag
            </h2>
            {s.fees.map((fee, i) => (
              <InfoRow key={i} label={fee.description || fee.type} value={<span className="text-red-500">-{formatCurrency(fee.amount)}</span>} />
            ))}
            <div className="border-t border-gray-100 my-3" />
            <InfoRow label="Gebühren gesamt" value={<span className="text-red-500">-{formatCurrency(s.totalFees)}</span>} />
            <InfoRow label="Nettobetrag (nach Gebühren)" value={<span className="font-bold text-emerald-600">{formatCurrency(s.netAmount)}</span>} />
          </div>
        )}

        {/* Discount / Promo */}
        {s && !s.error && (s.coupon || s.promoCode) && (
          <div className="bg-white rounded-[10px] p-6 shadow-sm">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              Rabatt / Gutscheincode
            </h2>
            {s.promoCode && <InfoRow label="Gutscheincode" value={<span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{s.promoCode}</span>} />}
            {s.coupon && (
              <>
                <InfoRow label="Coupon" value={s.coupon.name || s.coupon.id} />
                {s.coupon.percent_off && <InfoRow label="Rabatt" value={`${s.coupon.percent_off}%`} />}
                {s.coupon.amount_off && <InfoRow label="Rabatt" value={formatCurrency(s.coupon.amount_off)} />}
              </>
            )}
            {s.discount && <InfoRow label="Rabattbetrag" value={`-${formatCurrency(s.discount.amount)}`} />}
          </div>
        )}

        {/* Profile Info */}
        {auszubildendeProfile && (
          <div className="bg-white rounded-[10px] p-6 shadow-sm">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              Profil
            </h2>
            <InfoRow label="Name" value={`${auszubildendeProfile.title || ""} ${auszubildendeProfile.first_name} ${auszubildendeProfile.last_name}`.trim()} />
            <InfoRow label="E-Mail" value={auszubildendeProfile.email} />
            <InfoRow label="Geschlecht" value={auszubildendeProfile.gender || "–"} />
            <InfoRow label="Fachrichtung" value={auszubildendeProfile.specialty || "–"} />
            <InfoRow label="Geburtsdatum" value={auszubildendeProfile.birthdate ? formatDate(auszubildendeProfile.birthdate) : "–"} />
            <InfoRow label="EFN" value={auszubildendeProfile.efn || "–"} mono />
          </div>
        )}

        {/* Documents */}
        <div className="bg-white rounded-[10px] p-6 shadow-sm">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            Dokumente & Links
          </h2>
          <div className="space-y-3">
            {booking.stripe_invoice_url && (
              <a href={booking.stripe_invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Rechnung (Online)
              </a>
            )}
            {booking.stripe_invoice_pdf_url && (
              <a href={booking.stripe_invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Rechnung (PDF)
              </a>
            )}
            {booking.stripe_credit_note_url && (
              <a href={booking.stripe_credit_note_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Stornorechnung
              </a>
            )}
            {s && !s.error && s.receiptUrl && (
              <a href={s.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> Stripe-Beleg
              </a>
            )}
            {s && !s.error && s.chargeId && (
              <a href={`https://dashboard.stripe.com/payments/${s.chargeId}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> In Stripe öffnen
              </a>
            )}
            {!booking.stripe_invoice_url && !booking.stripe_credit_note_url && (!s || s.error) && (
              <p className="text-sm text-gray-400">Keine Dokumente verfügbar</p>
            )}
          </div>
        </div>

        {/* Stripe IDs (for debugging) */}
        {s && !s.error && (
          <div className="bg-white rounded-[10px] p-6 shadow-sm">
            <h2 className="text-base font-bold mb-4 text-gray-400 text-xs uppercase tracking-wide">Stripe-Referenzen</h2>
            <InfoRow label="Checkout Session" value={<span className="font-mono text-xs">{booking.stripe_checkout_session_id?.slice(0, 20)}...</span>} />
            {s.paymentIntentId && <InfoRow label="Payment Intent" value={<span className="font-mono text-xs">{s.paymentIntentId.slice(0, 20)}...</span>} />}
            {booking.stripe_customer_id && <InfoRow label="Customer" value={<span className="font-mono text-xs">{booking.stripe_customer_id.slice(0, 20)}...</span>} />}
            {s.chargeId && <InfoRow label="Charge" value={<span className="font-mono text-xs">{s.chargeId.slice(0, 20)}...</span>} />}
          </div>
        )}
      </div>
    </div>
  );
}
