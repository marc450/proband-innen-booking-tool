import { NextRequest, NextResponse } from "next/server";

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const { title, firstName, lastName, email } = await req.json();

    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Alle Pflichtfelder ausfüllen." }, { status: 400 });
    }

    if (!HUBSPOT_ACCESS_TOKEN) {
      return NextResponse.json({ error: "HubSpot nicht konfiguriert." }, { status: 500 });
    }

    const hsHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    };

    // Search for existing contact
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: hsHeaders,
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: "email", operator: "EQ", value: email }],
        }],
      }),
    });
    const searchData = await searchRes.json();

    const properties: Record<string, string> = {
      email,
      firstname: firstName,
      lastname: lastName,
      contact_type: "Doctor - Customer",
    };
    if (title && title !== "Kein Titel") {
      properties.jobtitle = title;
    }

    if (searchData.total === 0) {
      // Create new contact
      const createRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: hsHeaders,
        body: JSON.stringify({ properties }),
      });
      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error(`HubSpot create error: ${createRes.status} ${errText}`);
        return NextResponse.json({ error: "HubSpot Fehler." }, { status: 500 });
      }
      console.log(`HubSpot: created contact (signup) for ${email}`);
    } else {
      // Update existing contact
      const contactId = searchData.results[0].id;
      await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        headers: hsHeaders,
        body: JSON.stringify({ properties }),
      });
      console.log(`HubSpot: updated contact (signup) for ${email}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("HubSpot signup error:", err);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
