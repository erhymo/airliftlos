import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const TO_ADDRESSES = [
  "oyvind.myhre@airlift.no",
  "tom.ostrem@airlift.no",
];

interface ResumeDriftPayload {
  subject: string;
  body: string;
  fromName?: string;
  base?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM;
  const accessCode = process.env.ACCESS_CODE;

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: "Missing SENDGRID_API_KEY or SENDGRID_FROM" },
      { status: 500 }
    );
  }

  if (accessCode) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get("airliftlos_access");
    if (!accessCookie || accessCookie.value !== "ok") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  let payload: ResumeDriftPayload;
  try {
    payload = (await req.json()) as ResumeDriftPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, body, fromName, base } = payload;

  if (!subject || !body) {
    return NextResponse.json(
      { error: "subject and body are required" },
      { status: 400 }
    );
  }

  const cc: { email: string }[] = [];
  if (base === "Bergen") {
    cc.push({ email: "loshelikopter.bergen@airlift.no" });
  }
  if (base === "Hammerfest") {
    cc.push({ email: "loshelikopter.hammerfest@airlift.no" });
  }

  try {
    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: TO_ADDRESSES.map((email) => ({ email })),
            ...(cc.length > 0 ? { cc } : {}),
            subject,
          },
        ],
        from: {
          email: fromEmail,
          name: fromName || "LOS Helikopter",
        },
        content: [
          {
            type: "text/plain",
            value: body,
          },
        ],
      }),
    });

    if (!sgResponse.ok) {
      const text = await sgResponse.text();
      return NextResponse.json(
        { error: "SendGrid error", details: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to send resume drift email", error);
    return NextResponse.json(
      { error: "Failed to send resume drift email" },
      { status: 500 }
    );
  }
}

