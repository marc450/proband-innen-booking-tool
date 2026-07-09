# Plan: EU Widerrufsbutton (Withdrawal Button) for course bookings

**Status:** Parked. Build this only when we own the checkout (see "Why this
waits" below). All decisions below were made in a planning session on
2026-06-20 and are ready to implement.

**Owner decision:** We will NOT bolt the withdrawal mechanics onto the
current Stripe-hosted checkout. The Onlinekurs waiver legally cannot live
on Stripe's hosted page, and doing half of it (button + refund without the
waiver) creates exposure rather than removing it. So the whole feature is
deferred to the own-checkout milestone.

---

## 1. The legal background

Two different laws get confused here. Only the first is relevant to us.

### EU "Withdrawal Button" — Directive (EU) 2023/2673
- Amends the Consumer Rights Directive. **In force 19 June 2026**, member
  states transposed by 19 Dec 2025 (in Germany, into the BGB).
- Where a consumer has a 14-day **Widerrufsrecht** for a distance contract
  concluded online, the trader must provide a clearly labelled
  **"Vertrag widerrufen"** button: easy to find, prominently displayed,
  available throughout the withdrawal period, leading to a confirmation
  function that completes the withdrawal without obstacles.
- A withdrawal (Widerruf) = full reversal/refund. Different from a
  cancellation (ends an ongoing contract going forward).
- Non-compliance: cease-and-desist (Abmahnung) + fines up to €2M or 4% of
  annual turnover.

### German "Kündigungsbutton" — § 312k BGB (NOT us)
- In force since 1 July 2022. Applies to **continuing-obligation contracts
  (Dauerschuldverhältnisse)** with recurring payments (subscriptions).
- Our bookings are one-time payments for one-time services, so § 312k does
  **not** apply unless we add a subscription product.

---

## 2. Applicability to EPHIA (the nuance)

The button obligation only attaches where a statutory Widerrufsrecht
actually exists. Two gates:

1. **Is the buyer a Verbraucher?** Our course buyers are Ärzt:innen, but our
   own positioning ("Vom ersten Kurs zur eigenen Praxis", Auszubildende not
   yet owning a practice) cuts toward consumer status for a meaningful
   share. Do not assume "they're doctors, so professionals." Treat as
   consumers to be safe.
2. **Does an exemption apply?**
   - **Praxiskurs (date-bound, in-person):** the CRD Art. 16(1)(l)
     exemption for "services related to leisure activities for a specific
     date" is the obvious defence but is **shaky** — courts read
     *Freizeitbetätigungen* narrowly (concerts, sport, restaurants); a
     professional medical course almost certainly is not "leisure." So
     assume the withdrawal right applies → button required.
   - **Onlinekurs (digital content, no fixed date):** the right can be
     **cleanly extinguished** with the immediate-performance waiver (see
     §5). Without that waiver, the right persists.

**Exposure ranking:**
- Doctor course purchases (real Stripe charge) → the real risk. No notice,
  no waiver, no button today.
- Proband:innen treatment bookings (setup intent, no upfront charge, free
  48h cancellation) → low practical exposure; lower priority.
- Private bookings / no-show charges → out of scope.

**Sign-off still needed from a lawyer** before go-live:
- Verbraucher-vs-Unternehmer classification for our doctor buyers.
- Whether the leisure exemption can be relied on for Praxiskurse.
- Fristbeginn (we use Vertragsschluss) and the Wertersatz wording.
- The Du-form Widerrufsbelehrung (see §6 — drops the statutory safe-harbor).

---

## 3. Why this waits for our own checkout

Stripe's **hosted** Checkout gives exactly one consent mechanism
(`consent_collection.terms_of_service`, the single ToS checkbox, already in
use). It cannot render a second mandatory boolean consent. The Onlinekurs
waiver legally must be a **separate, explicit, actively-ticked** checkbox,
not bundled into ToS — so it cannot be captured validly on Stripe's page.

The fix is a consent step on our own page before redirect, i.e. our own
checkout surface. Until we have that, the only compliant simple state is
**full refund within 14 days** (online included). Excluding the online
portion without the waiver is exposure, not safety.

So: build the own checkout first, then this whole feature lands cleanly.

---

## 4. What to build (scope)

### 4a. Widerrufsbelehrung page
- New route `src/app/kurse/widerruf/page.tsx`, served at `ephia.de/widerruf`
  via the existing slug rewrite. Style like `kurse/impressum/page.tsx`.
- Register it: footer (`kurse/_components/footer.tsx`), sitemap
  (`app/sitemap.ts`), and the admin catalog
  (`app/dashboard/landingpages/page.tsx`, group "Rechtliches").
- Content is in §6 below (informal Du, ready to paste).

### 4b. AGB cross-reference
- Add a "Widerrufsrecht für Verbraucher:innen" section to
  `kurse/agb/page.tsx` stating the right is independent of the
  Storno/Umbuchung fees in the Rücktritt section, pointing to
  `ephia.de/widerruf`, and noting the Onlinekurs can lapse via the waiver.
  Renumber the following sections.

### 4c. "Vertrag widerrufen" button (customer account)
- In `kurse/mein-konto/` (server `page.tsx` + client `mein-konto-view.tsx`).
- Shown on each upcoming Praxis/Kombi card, **only** when:
  - the booking is a real Stripe purchase (`course_bookings` row, not a
    legacy import), AND
  - still inside the **14-day window from purchase** (`created_at` + 14d).
- Data plumbing: add `withdrawBookingId: string | null` to `EnrichedBooking`,
  set it to `cb.id` for the Praxis leg of `course_bookings` rows (null for
  the Onlinekurs leg, legacy imports, and LW-only enrollments).
- Confirm dialog (app-native, no `confirm()`), shows the deadline, posts to
  the API, reloads on success.

### 4d. Withdrawal API
- New route `src/app/api/withdraw-course-booking/route.ts`. Unlike the
  admin `api/cancel-course-booking` (no auth boundary), this is
  customer-facing and MUST:
  1. authenticate the Supabase session;
  2. verify the caller owns the booking by matching `course_bookings.email`
     against the caller's known emails (primary + `auszubildende_emails`
     aliases + auth email) — prevents IDOR;
  3. enforce the 14-day window server-side;
  4. refund (reuse the credit-note/refund logic from
     `cancel-course-booking`);
  5. mark `status = "cancelled"`, decrement the seat
     (`decrement_booked_seats` RPC), cancel any pending review email
     (`cancelScheduledReviewEmail`), send a Widerruf confirmation email.

### 4e. Onlinekurs waiver (REQUIRED to exclude online from refunds)
This is the piece that needs the own checkout. Per **§ 356 Abs. 5 BGB**
(Art. 16(1)(m) CRD), the digital-content withdrawal right only lapses if
ALL of:
1. **Express consent + acknowledgment** as a separate, unchecked,
   actively-ticked checkbox at checkout (only for products containing an
   Onlinekurs: Onlinekurs, Kombikurs, Premium), blocking the pay button
   until ticked. Suggested text:
   > Ich verlange ausdrücklich, dass EPHIA vor Ablauf der Widerrufsfrist mit
   > der Bereitstellung des Onlinekurses beginnt. Mir ist bekannt, dass ich
   > mit Beginn der Bereitstellung mein Widerrufsrecht für diesen Onlinekurs
   > verliere.
2. **Performance has begun** — we unlock the LMS immediately, so satisfied
   at purchase.
3. **Confirmation on a durable medium (§ 312f BGB)** — the order
   confirmation email must restate that the customer gave this consent and
   acknowledged losing the right. (Most-forgotten step.)

Implementation:
- Checkbox on our own checkout page, pre-redirect (NOT on Stripe).
- Persist the consent when creating the Stripe session in
  `api/course-checkout/route.ts`: timestamp, exact text version, product,
  buyer. **Needs a SQL migration** — a column on `course_bookings` or a new
  `withdrawal_consents` table (remember GRANTs + RLS per the migration
  convention in CLAUDE.md). Flag the exact SQL to Marc before running.
- Add the consent acknowledgment line to the confirmation email in
  `api/stripe-webhook/route.ts`.

### 4f. Refund policy
- **With the waiver in place (target state):** Praxis-share refund =
  `amount_paid − template.price_gross_online_cents` for bundles
  (Kombikurs/Premium); full refund for pure Praxiskurs. Clamp to
  `[0, amount_paid]`. Use Stripe partial refund (`amount` on `/refunds`,
  `refund_amount` on `/credit_notes`). **Decided by Marc: refund = total
  price minus the online course's list price for that course type.**
- **Without the waiver (interim, if ever shipped before own checkout):**
  full refund within 14 days, online included. Accept the buyer's-remorse
  exposure, or alternatively only show the button on pure Praxiskurs
  bookings and handle bundle withdrawals manually.

---

## 5. File touchpoints (quick map)

| Area | File |
|---|---|
| Widerrufsbelehrung page | `src/app/kurse/widerruf/page.tsx` (new) |
| Footer link | `src/app/kurse/_components/footer.tsx` |
| Sitemap | `src/app/sitemap.ts` |
| Admin catalog | `src/app/dashboard/landingpages/page.tsx` |
| AGB section | `src/app/kurse/agb/page.tsx` |
| Account button + dialog | `src/app/kurse/mein-konto/mein-konto-view.tsx` |
| Button data plumbing | `src/app/kurse/mein-konto/page.tsx` |
| Withdrawal API | `src/app/api/withdraw-course-booking/route.ts` (new) |
| Waiver checkbox + consent store | `src/app/api/course-checkout/route.ts` + own checkout UI + migration |
| Durable-medium confirmation | `src/app/api/stripe-webhook/route.ts` |
| Refund logic precedent (reuse) | `src/app/api/cancel-course-booking/route.ts` |

Precedent worth reusing: the Galderma partner-consent withdrawal flow
(`src/app/api/partner-consent/withdraw/`,
`src/app/kurse/widerruf-datenweitergabe/[token]/`) is an existing
token-based withdrawal/forwarder pattern in this repo.

---

## 6. Drafted Widerrufsbelehrung (informal Du, ready to paste)

Built on the statutory Muster (Anlage 1 zu Art. 246a § 1 Abs. 2 EGBGB) but
rewritten to Du for brand tone. **Caveat:** deviating from the verbatim Sie
Muster forfeits the Gesetzlichkeitsfiktion (Abmahnschutz). Marc chose Du for
consistency; confirm with the lawyer. Entity from the Impressum:
EPHIA Medical GmbH, Dorfstraße 30, 15913 Märkische Heide,
customerlove@ephia.de.

### Vorbemerkung
> Verbraucher:innen steht ein gesetzliches Widerrufsrecht zu. Verbraucher:in
> ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt,
> die überwiegend weder ihrer gewerblichen noch ihrer selbständigen
> beruflichen Tätigkeit zugerechnet werden können.

### Widerrufsrecht
> Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen
> Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag
> des Vertragsschlusses.
>
> Um Dein Widerrufsrecht auszuüben, musst Du uns (EPHIA Medical GmbH,
> Dorfstraße 30, 15913 Märkische Heide, customerlove@ephia.de) mittels einer
> eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine
> E-Mail) über Deinen Entschluss, diesen Vertrag zu widerrufen, informieren.
> Du kannst dafür das unten stehende Muster-Widerrufsformular verwenden, das
> jedoch nicht vorgeschrieben ist.
>
> Zur Wahrung der Widerrufsfrist reicht es aus, dass Du die Mitteilung über
> die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.

### Folgen des Widerrufs
> Wenn Du diesen Vertrag widerrufst, haben wir Dir alle Zahlungen, die wir
> von Dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen
> ab dem Tag zurückzuzahlen, an dem die Mitteilung über Deinen Widerruf
> dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden
> wir dasselbe Zahlungsmittel, das Du bei der ursprünglichen Transaktion
> eingesetzt hast, es sei denn, mit Dir wurde ausdrücklich etwas anderes
> vereinbart; in keinem Fall werden Dir wegen dieser Rückzahlung Entgelte
> berechnet.
>
> Hast Du verlangt, dass die Dienstleistung während der Widerrufsfrist
> beginnen soll, so hast Du uns einen angemessenen Betrag zu zahlen, der dem
> Anteil der bis zu dem Zeitpunkt, zu dem Du uns von der Ausübung des
> Widerrufsrechts hinsichtlich dieses Vertrags unterrichtest, bereits
> erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag
> vorgesehenen Dienstleistungen entspricht.

### Vorzeitiges Erlöschen des Widerrufsrechts
> Dein Widerrufsrecht erlischt bei einem Vertrag zur Lieferung von nicht auf
> einem körperlichen Datenträger befindlichen digitalen Inhalten
> (Onlinekurs) auch dann, wenn wir mit der Ausführung des Vertrags begonnen
> haben, nachdem Du ausdrücklich zugestimmt hast, dass wir mit der
> Ausführung vor Ablauf der Widerrufsfrist beginnen, und Du Deine Kenntnis
> davon bestätigt hast, dass Du durch Deine Zustimmung mit Beginn der
> Ausführung Dein Widerrufsrecht verlierst.
>
> Bei einem Vertrag über die Erbringung von Dienstleistungen erlischt Dein
> Widerrufsrecht, wenn wir die Dienstleistung vollständig erbracht haben und
> mit der Ausführung erst begonnen haben, nachdem Du dazu Deine ausdrückliche
> Zustimmung gegeben und gleichzeitig Deine Kenntnis davon bestätigt hast,
> dass Du Dein Widerrufsrecht bei vollständiger Vertragserfüllung verlierst.

### Muster-Widerrufsformular
> (Wenn Du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und
> sende es zurück.)
> - An: EPHIA Medical GmbH, Dorfstraße 30, 15913 Märkische Heide,
>   customerlove@ephia.de
> - Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
>   Vertrag über die Erbringung der folgenden Dienstleistung / die Lieferung
>   des folgenden digitalen Inhalts (*):
> - Bestellt am (*) / erhalten am (*):
> - Name der/des Verbraucher:in(nen):
> - Anschrift der/des Verbraucher:in(nen):
> - Datum:
> - Unterschrift der/des Verbraucher:in(nen) (nur bei Mitteilung auf Papier):
>
> (*) Unzutreffendes streichen.

---

## 7. Build order when resurfaced

1. Own checkout (prerequisite for the waiver checkbox).
2. Migration for consent storage (with GRANTs + RLS).
3. Waiver checkbox at checkout + persist consent + durable-medium email.
4. Widerrufsbelehrung page + AGB section + registries.
5. Account button + 14-day gate + confirm dialog.
6. Withdrawal API (auth + ownership + window + refund + seat + email).
7. Switch refund to Praxis-share (total − online list price).
8. Lawyer sign-off on the open items in §2.
