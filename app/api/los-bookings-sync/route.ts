import { NextResponse } from "next/server";
import { getDb } from "../../../lib/firebaseAdmin";

export const runtime = "nodejs";

type GraphMessage = {
  id: string;
  subject?: string | null;
  receivedDateTime?: string | null;
  body?: {
    contentType?: string | null;
    content?: string | null;
  };
  from?: {
    emailAddress?: {
      address?: string | null;
      name?: string | null;
    } | null;
  } | null;
};

const MAILBOXES = [
  { email: "loshelikopter.bergen@airlift.no", base: "Bergen" },
  { email: "loshelikopter.hammerfest@airlift.no", base: "Hammerfest" },
] as const;

async function getGraphAccessToken(): Promise<string | null> {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.warn(
      "LOS-bookings-sync: MS_TENANT_ID, MS_CLIENT_ID eller MS_CLIENT_SECRET mangler",
    );
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("LOS-bookings-sync: klarte ikke å hente access token", text);
    return null;
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    console.error("LOS-bookings-sync: access token mangler i responsen");
    return null;
  }

  return data.access_token;
}

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/(p|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();
}

function extractLine(text: string, label: RegExp): string | null {
  const match = text.match(label);
  if (!match) return null;
  return match[1].trim();
}

function parseDateFromText(text: string, fallbackIso?: string | null): string | null {
  const tidspunktMatch = text.match(/Tidspunkt:?\s*([^\n\r]+)/i);
  const line = tidspunktMatch ? tidspunktMatch[1].trim() : "";

  const dateMatch = line.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (dateMatch) {
    const [, dd, mm, yyyy] = dateMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  if (fallbackIso) {
    // Bruk kun dato-delen av receivedDateTime som fallback
    return fallbackIso.split("T")[0] ?? null;
  }

  return null;
}

export async function GET(req: Request) {
  const syncSecret = process.env.LOS_SYNC_SECRET;
  if (syncSecret) {
    const header = req.headers.get("x-los-sync-secret");
    if (header !== syncSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const accessToken = await getGraphAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Fikk ikke access token fra Microsoft Graph" },
      { status: 500 },
    );
  }

  const db = getDb();
  let totalMessages = 0;
  let created = 0;
  let updated = 0;

  for (const mailbox of MAILBOXES) {
    const url = new URL(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox.email)}/mailFolders/Inbox/messages`,
    );
    const params = new URLSearchParams({
      $top: "20",
      $orderby: "receivedDateTime desc",
      $select: "id,subject,receivedDateTime,body,from",
      $filter:
        "from/emailAddress/address eq 'noreply@kystverket.no' and startswith(subject,'Ny bestilling av lostransport')",
    });
    url.search = params.toString();

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        "LOS-bookings-sync: klarte ikke å hente meldinger for",
        mailbox.email,
        res.status,
        text,
      );
      continue;
    }

    const data = (await res.json()) as { value?: GraphMessage[] };
    const messages = data.value ?? [];

    for (const msg of messages) {
      totalMessages += 1;
      const bodyHtml = msg.body?.content ?? "";
      const bodyText = htmlToText(bodyHtml);

      const orderNumber = extractLine(bodyText, /Ordrenr\.?\s*:?[\t ]*([^\n\r]+)/i);
      const fromLocation = extractLine(bodyText, /Bringes fra:?\s*([^\n\r]+)/i);
      const toLocation = extractLine(bodyText, /Bringes til:?\s*([^\n\r]+)/i);
      const shipName = extractLine(bodyText, /Skip:?\s*([^\n\r]+)/i);
      const pilotName = extractLine(bodyText, /Los:?\s*([^\n\r]+)/i);

      const dateIso = parseDateFromText(bodyText, msg.receivedDateTime ?? undefined);

      const now = Date.now();
      const docRef = db.collection("losBookings").doc(msg.id);
      const snapshot = await docRef.get();

      const baseData = {
        vesselName: shipName ?? null,
        date: dateIso ?? null,
        orderNumber: orderNumber ?? null,
        base: mailbox.base,
        pilots: pilotName ? [pilotName] : [],
        fromLocation: fromLocation ?? null,
        toLocation: toLocation ?? null,
        mailbox: mailbox.email,
        subject: msg.subject ?? null,
        receivedDateTime: msg.receivedDateTime ?? null,
        updatedAt: now,
        rawBodySnippet: bodyText.slice(0, 2000),
      };

      if (!snapshot.exists) {
        await docRef.set({
          ...baseData,
          createdAt: now,
          status: "open",
        });
        created += 1;
      } else {
        await docRef.set(baseData, { merge: true });
        updated += 1;
      }
    }
  }

  return NextResponse.json({ ok: true, totalMessages, created, updated });
}

