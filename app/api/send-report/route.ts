import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PDFDocument, StandardFonts, rgb, PDFImage } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

const TO_ADDRESSES = [
  "oyvind.myhre@airlift.no",
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
	  const pageWidth = page.getWidth();

	  const font = await pdf.embedFont(StandardFonts.Helvetica);
	  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

	  // Forsøk å laste Airlift-logoen fra public-mappen
	  let logoImage: PDFImage | undefined;
  try {
    const logoPath = path.join(process.cwd(), "public", "Airlift-logo.png");
    const logoBytes = await fs.readFile(logoPath);
    logoImage = await pdf.embedPng(logoBytes);
  } catch {
    // Hvis logoen av en eller annen grunn ikke finnes i runtime, hopper vi bare over den
  }

  const marginX = 50;
  let y = 800;

  // Tegn logo oppe til høyre
  if (logoImage) {
    const desiredWidth = 140;
    const scale = desiredWidth / logoImage.width;
    const logoWidth = desiredWidth;
    const logoHeight = logoImage.height * scale;
    const logoX = pageWidth - marginX - logoWidth;
    const logoY = y - logoHeight + 10;

    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight,
    });
  }

  // Tittel oppe til venstre
  page.drawText(title, {
    x: marginX,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;

  // Tynn linje under header
  page.drawRectangle({
    x: marginX,
    y,
    width: pageWidth - marginX * 2,
    height: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;

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

  // Diskré footer nederst på hovedsiden
  const footerY = 40;
  page.drawRectangle({
    x: marginX,
    y: footerY + 10,
    width: pageWidth - marginX * 2,
    height: 0.5,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawText("Airlift - generert fra airliftlos", {
    x: marginX,
    y: footerY,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Eventuelle HTI-bilder som egne sider
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
        const imgPageWidth = imgPage.getWidth();
        const imgPageHeight = imgPage.getHeight();
        const maxWidth = imgPageWidth - 2 * marginX;
        const maxHeight = imgPageHeight - 2 * marginX;
        const scale = Math.min(
          maxWidth / pngImage.width,
          maxHeight / pngImage.height
        );
        const imgWidth = pngImage.width * scale;
        const imgHeight = pngImage.height * scale;
        const x = (imgPageWidth - imgWidth) / 2;
        const yImg = (imgPageHeight - imgHeight) / 2;

        imgPage.drawImage(pngImage, {
          x,
          y: yImg,
          width: imgWidth,
          height: imgHeight,
        });

        // Footer også på HTI-sidene
        const htiFooterY = 40;
        imgPage.drawRectangle({
          x: marginX,
          y: htiFooterY + 10,
          width: imgPageWidth - marginX * 2,
          height: 0.5,
          color: rgb(0.9, 0.9, 0.9),
        });
        imgPage.drawText("Airlift - generert fra airliftlos", {
          x: marginX,
          y: htiFooterY,
          size: 8,
          font,
          color: rgb(0.5, 0.5, 0.5),
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
	/** Hvilken base rapporten gjelder (Bergen/Tromsø/Hammerfest) */
	base?: string;
	htiImageUrls?: string[];
	/** Type rapport (brukes til f.eks. SharePoint-opplasting) */
	reportType?: "driftsrapport" | "vaktrapport";
}

type SharePointUploadResult = {
	ok: boolean;
	skipped?: boolean;
	error?: string;
};

async function getGraphAccessToken(): Promise<string | null> {
	const tenantId = process.env.MS_TENANT_ID;
	const clientId = process.env.MS_CLIENT_ID;
	const clientSecret = process.env.MS_CLIENT_SECRET;

	if (!tenantId || !clientId || !clientSecret) {
		console.warn(
			"SharePoint: MS_TENANT_ID, MS_CLIENT_ID eller MS_CLIENT_SECRET mangler, hopper over opplasting"
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
		}
	);

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error("SharePoint: klarte ikke å hente access token", text);
		return null;
	}

	const data = (await res.json()) as { access_token?: string };
	if (!data.access_token) {
		console.error("SharePoint: access token mangler i responsen");
		return null;
	}

	return data.access_token;
}

async function uploadDriftsrapportToSharePoint(
	fileName: string,
	pdfBytes: Uint8Array
): Promise<SharePointUploadResult> {
	const siteId = process.env.SHAREPOINT_SITE_ID;
	const folderPath = process.env.DRIFT_RAPPORT_SHAREPOINT_FOLDER_PATH;

	if (!siteId || !folderPath) {
		console.warn(
			"SharePoint: SHAREPOINT_SITE_ID eller DRIFT_RAPPORT_SHAREPOINT_FOLDER_PATH mangler, hopper over opplasting"
		);
		return {
			ok: false,
			skipped: true,
			error:
				"SharePoint-opplasting er ikke konfigurert (mangler SITE_ID eller FOLDER_PATH)",
		};
	}

	const accessToken = await getGraphAccessToken();
	if (!accessToken) {
		return {
			ok: false,
			error: "Fikk ikke access token fra Microsoft Graph",
		};
	}

	// Bygg sti til filen under dokumentbiblioteket, med korrekt URL-encoding per segment
	const encodedFolder = folderPath
		.split("/")
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join("/");
	const encodedFileName = encodeURIComponent(fileName);
	const itemPath = `${encodedFolder}/${encodedFileName}`;

	const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/${itemPath}:/content`;

	const res = await fetch(url, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"Content-Type": "application/pdf",
		},
		// pdf-lib gir Uint8Array – gjør det om til Buffer for Node/fetch
		body: Buffer.from(pdfBytes),
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error(
			"SharePoint: klarte ikke å laste opp driftsrapport",
			res.status,
			text
		);
		return {
			ok: false,
			error:
				text && text.length < 400
					? text
					: `HTTP ${res.status} fra Graph ved opplasting`,
		};
	}

	return { ok: true };
}

export async function POST(req: Request) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM;
	  const accessCode = process.env.ACCESS_CODE;

	  // Hvis ACCESS_CODE er satt, krever vi at brukeren har en gyldig tilgangs-cookie
	  if (accessCode) {
	    const cookieStore = await cookies();
	    const accessCookie = cookieStore.get("airliftlos_access");
	    if (!accessCookie || accessCookie.value !== "ok") {
	      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	    }
	  }

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

		const { subject, body, fileName, title, fromName, htiImageUrls, base, reportType } =
			payload;

  if (!subject || !body || !fileName || !title) {
    return NextResponse.json(
      { error: "subject, body, fileName and title are required" },
      { status: 400 }
    );
  }

		try {
			const pdfBytes = await createPdf(title, body, htiImageUrls);
			const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

			let sharepointResult: SharePointUploadResult | undefined;
			if (reportType === "driftsrapport") {
				try {
					sharepointResult = await uploadDriftsrapportToSharePoint(
						fileName,
						pdfBytes
					);
				} catch (err) {
					console.error("SharePoint: uventet feil ved opplasting", err);
					sharepointResult = {
						ok: false,
						error: "Uventet feil ved opplasting til SharePoint",
					};
				}
			}

		// Legg til base-spesifikke kopi-adresser
		const cc: { email: string }[] = [];
		if (base === "Bergen") {
			cc.push({ email: "loshelikopter.bergen@airlift.no" });
		}
		if (base === "Hammerfest") {
			cc.push({ email: "loshelikopter.hammerfest@airlift.no" });
		}

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
						// Kopi-adresser per base (Bergen/Hammerfest)
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
				attachments: [
					{
						content: pdfBase64,
						// Bruk en generisk MIME-type for å redusere sjansen for inline forhåndsvisning
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
			
			return NextResponse.json({ ok: true, sharepoint: sharepointResult });
  } catch (error) {
    console.error("Failed to send report", error);
    return NextResponse.json(
      { error: "Failed to send report" },
      { status: 500 }
    );
  }
}

