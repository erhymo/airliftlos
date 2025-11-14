import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TO_ADDRESSES = [
  "myhre.oyvind@gmail.com",
  "tom.ostrem@airlift.no",
];

function wrapText(text: string, maxChars: number): string[] {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    if (!w) continue;
    const next = line ? line + " " + w : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

async function createPdf(
  title: string,
  body: string,
  htiImageUrls?: string[]
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const marginX = 50;
  let y = 800;

  page.drawText(title, {
    x: marginX,
    y,
    size: 18,
    font,
    color: rgb(0, 0, 0),
  });
  y -= 32;

  const lines: string[] = [];
  for (const rawLine of body.split("\n")) {
    if (!rawLine.trim()) {
      lines.push("");
      continue;
    }
    const wrapped = wrapText(rawLine, 90);
    lines.push(...wrapped);
  }

  for (const line of lines) {
    if (!line) {
      y -= 16;
      continue;
    }
    page.drawText(line, {
      x: marginX,
      y,
      size: 11,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 16;
  }

  if (htiImageUrls && htiImageUrls.length > 0) {
    for (const url of htiImageUrls) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "airliftlos/1.0 (kontakt: myhre.oyvind@gmail.com)",
          },
        });
        if (!res.ok) continue;
        const pngBytes = await res.arrayBuffer();
        const pngImage = await pdf.embedPng(pngBytes);

        const imgPage = pdf.addPage([595, 842]);
        const pageWidth = imgPage.getWidth();
        const pageHeight = imgPage.getHeight();
        const maxWidth = pageWidth - 2 * marginX;
        const maxHeight = pageHeight - 2 * marginX;
        const scale = Math.min(
          maxWidth / pngImage.width,
          maxHeight / pngImage.height
        );
        const imgWidth = pngImage.width * scale;
        const imgHeight = pngImage.height * scale;
        const x = (pageWidth - imgWidth) / 2;
        const yImg = (pageHeight - imgHeight) / 2;

        imgPage.drawImage(pngImage, {
          x,
          y: yImg,
          width: imgWidth,
          height: imgHeight,
        });
      } catch {
        // Ignore HTI image errors
      }
    }
  }

  const bytes = await pdf.save();
  return bytes;
}

interface SendReportPayload {
  subject: string;
  body: string;
  fileName: string;
  title: string;
  fromName?: string;
  htiImageUrls?: string[];
}

export async function POST(req: Request) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM;

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: "Missing SENDGRID_API_KEY or SENDGRID_FROM" },
      { status: 500 }
    );
  }

  let payload: SendReportPayload;
  try {
    payload = (await req.json()) as SendReportPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, body, fileName, title, fromName, htiImageUrls } = payload;

  if (!subject || !body || !fileName || !title) {
    return NextResponse.json(
      { error: "subject, body, fileName and title are required" },
      { status: 400 }
    );
  }

  try {
    const pdfBytes = await createPdf(title, body, htiImageUrls);
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
            to: TO_ADDRESSES.map((email) => ({ email })),
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
            type: "application/pdf",
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
    console.error("Failed to send report", error);
    return NextResponse.json(
      { error: "Failed to send report" },
      { status: 500 }
    );
  }
}

