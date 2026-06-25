// Server-side GA4 Measurement Protocol sender. Used by the Stripe webhook to
// record a `purchase` conversion once a course booking is confirmed. Because
// the event is sent server-side (not from the browser), it survives ad
// blockers, page refreshes and the Stripe redirect round-trip.
//
// PRIVACY: this payload is deliberately PII-free. No name, no email, no
// address. Only the conversion value, the course identifiers and the GA4
// client/session IDs are sent. Keep it that way.

const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const GA_API_SECRET = process.env.GA4_API_SECRET;

type PurchaseInput = {
  clientId?: string | null;
  sessionId?: string | null;
  // Stripe checkout session id — doubles as GA4 transaction_id and gives us
  // built-in dedup (GA4 ignores duplicate transaction_ids).
  transactionId: string;
  // Gross amount in cents (Stripe amount_total).
  valueCents: number;
  courseKey: string;
  courseType: string;
  itemName?: string;
};

// Fire-and-forget: never throws, never blocks the booking. Logs and returns.
export async function sendGa4Purchase(input: PurchaseInput): Promise<void> {
  if (!GA_ID || !GA_API_SECRET) return; // not configured yet → safe no-op
  if (!input.clientId) return; // no GA session to attribute to → skip

  try {
    const body = {
      client_id: input.clientId,
      events: [
        {
          name: "purchase",
          params: {
            transaction_id: input.transactionId,
            currency: "EUR",
            value: Math.round(input.valueCents) / 100,
            // session_id + a non-zero engagement time are required for GA4 to
            // stitch this server event onto the user's existing session.
            ...(input.sessionId ? { session_id: input.sessionId } : {}),
            engagement_time_msec: 100,
            items: [
              {
                item_id: input.courseKey,
                item_name: input.itemName || input.courseKey,
                item_category: input.courseType,
                price: Math.round(input.valueCents) / 100,
                quantity: 1,
              },
            ],
          },
        },
      ],
    };

    const res = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        GA_ID,
      )}&api_secret=${encodeURIComponent(GA_API_SECRET)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      console.error("GA4 MP purchase failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("GA4 MP purchase error:", err);
  }
}
