import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPdf } from "../send-report/route";

interface SendStatsPayload {
  subject: string;
  body: string;
  /** Rå streng med e-poster, separert med komma, semikolon eller mellomrom */
  to: string;
  title: string;
  fileName: string;
  fromName?: string;
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

  let payload: SendStatsPayload;
  try {
    payload = (await req.json()) as SendStatsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, body, to, title, fileName, fromName } = payload;

  if (!subject || !body || !to || !title || !fileName) {
    return NextResponse.json(
      { error: "subject, body, to, fileName and title are required" },
      { status: 400 }
    );
  }

  const emails = to
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean)
    .filter((e) => e.includes("@"));

  if (emails.length === 0) {
    return NextResponse.json(
      { error: "Fant ingen gyldige e-postadresser" },
      { status: 400 }
    );
  }

  try {
    const pdfBytes = await createPdf(title, body);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: emails.map((email) => ({ email })),
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
        attachments: [
          {
            content: pdfBase64,
            type: "application/octet-stream",
            filename: fileName,
            disposition: "attachment",
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
    console.error("Failed to send stats report", error);
    return NextResponse.json(
      { error: "Failed to send stats report" },
      { status: 500 }
    );
  }
}

