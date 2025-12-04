import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPdf } from "../send-report/route";
import { PDFDocument, StandardFonts, rgb, PDFImage } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

const MONTH_LABELS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"Mai",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Okt",
	"Nov",
	"Des",
];

const CAUSES = [
	"Tåke",
	"Lyn",
	"Sikt/Skydekke",
	"Vind/Bølgehøyde",
	"Teknisk",
	"Annet",
] as const;

type Cause = (typeof CAUSES)[number];

interface MonthlyCountsRow {
	perCause: Record<Cause, number>;
	totalReports: number;
}

interface MonthlyHoursRow {
	perCause: Record<Cause, number>;
	totalHours: number;
}

interface StatsTablesPayload {
	perMonthCounts: MonthlyCountsRow[];
	perMonthHours: MonthlyHoursRow[];
	totalHoursByCause: Record<Cause, number>;
	totalHoursYear: number;
}

interface SendStatsPayload {
	subject: string;
	body: string;
	/** Rå streng med e-poster, separert med komma, semikolon eller mellomrom */
	to: string;
	title: string;
	fileName: string;
	fromName?: string;
	year?: number;
	stats?: StatsTablesPayload;
}

async function loadLogoImage(pdf: PDFDocument): Promise<PDFImage | undefined> {
	try {
		const logoPath = path.join(process.cwd(), "public", "Airlift-logo.png");
		const logoBytes = await fs.readFile(logoPath);
		return await pdf.embedPng(logoBytes);
	} catch {
		// Hvis logoen ikke finnes i runtime, hopper vi bare over den
		return undefined;
	}
}

async function createStatsPdf(
	title: string,
	year: number | undefined,
	stats: StatsTablesPayload
): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	const page = pdf.addPage([595, 842]);
	const pageWidth = page.getWidth();

	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

	const logoImage = await loadLogoImage(pdf);
	const marginX = 50;
	let y = 800;

	// Logo oppe til høyre
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

	const tableWidth = pageWidth - marginX * 2;
	const rowHeight = 14;
	const textSize = 8;
	const columnCount = 2 + CAUSES.length; // Måned + alle årsaker + totalt
	const colWidth = tableWidth / columnCount;

	function drawTableHeader(
		label: string,
		monthLabel: string,
		totalLabel: string
	): void {
		page.drawText(label, {
			x: marginX,
			y,
			size: 11,
			font: boldFont,
			color: rgb(0, 0, 0),
		});
		y -= 16;

		const headerTopY = y;
		const headerBottomY = headerTopY - rowHeight;

		// Bakgrunn for header-rad
		page.drawRectangle({
			x: marginX,
			y: headerBottomY,
			width: tableWidth,
			height: rowHeight,
			color: rgb(0.95, 0.95, 0.95),
		});

		const textY = headerBottomY + 3;
		let colX = marginX + 2;
		page.drawText(monthLabel, {
			x: colX,
			y: textY,
			size: textSize,
			font: boldFont,
			color: rgb(0, 0, 0),
		});

		CAUSES.forEach((cause, idx) => {
			colX = marginX + (1 + idx) * colWidth + 2;
			page.drawText(cause, {
				x: colX,
				y: textY,
				size: textSize,
				font: boldFont,
				color: rgb(0, 0, 0),
			});
		});

		colX = marginX + (columnCount - 1) * colWidth + 2;
		page.drawText(totalLabel, {
			x: colX,
			y: textY,
			size: textSize,
			font: boldFont,
			color: rgb(0, 0, 0),
		});

		y = headerBottomY;
	}

	function drawCountsTable() {
		const heading = `Antall driftsrapporter per måned og årsak${
			year ? ` – ${year}` : ""
		}`;
		drawTableHeader(heading, "Måned", "Totalt");

		for (let i = 0; i < MONTH_LABELS.length; i++) {
			const rowTopY = y;
			const rowBottomY = rowTopY - rowHeight;
			const textY = rowBottomY + 3;
			const countsRow = stats.perMonthCounts[i];
			let colX = marginX + 2;

			page.drawText(MONTH_LABELS[i], {
				x: colX,
				y: textY,
				size: textSize,
				font,
				color: rgb(0, 0, 0),
			});

			CAUSES.forEach((cause, idx) => {
				colX = marginX + (1 + idx) * colWidth + 2;
				const value = countsRow?.perCause[cause] ?? 0;
				page.drawText(String(value), {
					x: colX,
					y: textY,
					size: textSize,
					font,
					color: rgb(0, 0, 0),
				});
			});

			colX = marginX + (columnCount - 1) * colWidth + 2;
			page.drawText(String(countsRow?.totalReports ?? 0), {
				x: colX,
				y: textY,
				size: textSize,
				font,
				color: rgb(0, 0, 0),
			});

			y = rowBottomY;
		}

		y -= 20;
	}

	function drawHoursTable() {
		const heading = `Antall timer stopp per måned og årsak${
			year ? ` – ${year}` : ""
		}`;
		drawTableHeader(heading, "Måned", "Totalt timer");

		for (let i = 0; i < MONTH_LABELS.length; i++) {
			const rowTopY = y;
			const rowBottomY = rowTopY - rowHeight;
			const textY = rowBottomY + 3;
			const hoursRow = stats.perMonthHours[i];
			let colX = marginX + 2;

			page.drawText(MONTH_LABELS[i], {
				x: colX,
				y: textY,
				size: textSize,
				font,
				color: rgb(0, 0, 0),
			});

			CAUSES.forEach((cause, idx) => {
				colX = marginX + (1 + idx) * colWidth + 2;
				const value = hoursRow?.perCause[cause] ?? 0;
				page.drawText(String(value), {
					x: colX,
					y: textY,
					size: textSize,
					font,
					color: rgb(0, 0, 0),
				});
			});

			colX = marginX + (columnCount - 1) * colWidth + 2;
			page.drawText(String(hoursRow?.totalHours ?? 0), {
				x: colX,
				y: textY,
				size: textSize,
				font,
				color: rgb(0, 0, 0),
			});

			y = rowBottomY;
		}

		// Oppsummeringsrad "Sum år"
		const summaryTopY = y;
		const summaryBottomY = summaryTopY - rowHeight;
		const textY = summaryBottomY + 3;

		page.drawRectangle({
			x: marginX,
			y: summaryBottomY,
			width: tableWidth,
			height: rowHeight,
			color: rgb(0.95, 0.95, 0.95),
		});

		let colX = marginX + 2;
		page.drawText("Sum år", {
			x: colX,
			y: textY,
			size: textSize,
			font: boldFont,
			color: rgb(0, 0, 0),
		});

		CAUSES.forEach((cause, idx) => {
			colX = marginX + (1 + idx) * colWidth + 2;
			const value = stats.totalHoursByCause[cause] ?? 0;
			page.drawText(String(value), {
				x: colX,
				y: textY,
				size: textSize,
				font: boldFont,
				color: rgb(0, 0, 0),
			});
		});

		colX = marginX + (columnCount - 1) * colWidth + 2;
		page.drawText(String(stats.totalHoursYear ?? 0), {
			x: colX,
			y: textY,
			size: textSize,
			font: boldFont,
			color: rgb(0, 0, 0),
		});

		y = summaryBottomY - 20;
	}

	drawCountsTable();
	drawHoursTable();

	// Diskré footer nederst
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

	return pdf.save();
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

	  const { subject, body, to, title, fileName, fromName, year, stats } = payload;

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
	    const useStatsPdf =
	      stats &&
	      Array.isArray(stats.perMonthCounts) &&
	      Array.isArray(stats.perMonthHours);

	    const pdfBytes = useStatsPdf
	      ? await createStatsPdf(title, year, stats as StatsTablesPayload)
	      : await createPdf(title, body);
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

