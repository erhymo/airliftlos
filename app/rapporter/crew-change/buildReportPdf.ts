import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { CREW_CHANGE_REASONS, CREW_CHANGE_REASON_LABELS, type CrewChangeEvent, type CrewChangeReason } from "../../../lib/crewChangeEvents";

type ReportData = {
	periodLabel: string;
	total: number;
	completedCount: number;
	postponedCount: number;
	cancelledCount: number;
	postponedReasons: Record<CrewChangeReason, number>;
	cancelledReasons: Record<CrewChangeReason, number>;
	incidents: CrewChangeEvent[];
};

const PAGE_SIZE: [number, number] = [595, 842];
const MARGIN_X = 50;

function drawReasonChart(
	page: PDFPage,
	font: PDFFont,
	bold: PDFFont,
	title: string,
	counts: Record<CrewChangeReason, number>,
	startY: number,
): number {
	let y = startY;
	page.drawText(title, { x: MARGIN_X, y, size: 13, font: bold, color: rgb(0, 0, 0) });
	y -= 20;
	const max = Math.max(1, ...Object.values(counts));
	const barMaxWidth = 260;
	for (const reason of CREW_CHANGE_REASONS) {
		const count = counts[reason];
		const width = (count / max) * barMaxWidth;
		page.drawText(CREW_CHANGE_REASON_LABELS[reason], { x: MARGIN_X, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
		page.drawRectangle({ x: MARGIN_X + 120, y: y - 3, width: Math.max(width, 1), height: 10, color: rgb(0.85, 0.55, 0.1) });
		page.drawText(String(count), { x: MARGIN_X + 120 + barMaxWidth + 8, y, size: 10, font: bold, color: rgb(0, 0, 0) });
		y -= 18;
	}
	return y - 12;
}

export async function buildCrewChangeReportPdf(data: ReportData): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	let page = pdf.addPage(PAGE_SIZE);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
	let y = 790;

	page.drawText("Crew Change - erfaringsrapport", { x: MARGIN_X, y, size: 18, font: bold, color: rgb(0, 0, 0) });
	y -= 22;
	page.drawText("Dispensasjon fra BSL D 2-3 § 4 (av-/anti-isingsutstyr), sak 25/34384-7", { x: MARGIN_X, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
	y -= 16;
	page.drawText(`Periode: ${data.periodLabel}`, { x: MARGIN_X, y, size: 11, font, color: rgb(0, 0, 0) });
	y -= 28;

	page.drawText(`Totalt antall oppdrag: ${data.total}`, { x: MARGIN_X, y, size: 13, font: bold, color: rgb(0, 0, 0) });
	y -= 18;
	page.drawText(`Gjennomført: ${data.completedCount}`, { x: MARGIN_X, y, size: 11, font, color: rgb(0, 0, 0) });
	y -= 16;
	page.drawText(`Utsatt: ${data.postponedCount}`, { x: MARGIN_X, y, size: 11, font, color: rgb(0, 0, 0) });
	y -= 16;
	page.drawText(`Kansellert: ${data.cancelledCount}`, { x: MARGIN_X, y, size: 11, font, color: rgb(0, 0, 0) });
	y -= 30;

	y = drawReasonChart(page, font, bold, "Utsatt - fordelt på årsak", data.postponedReasons, y);
	y = drawReasonChart(page, font, bold, "Kansellert - fordelt på årsak", data.cancelledReasons, y);

	if (data.incidents.length > 0) {
		if (y < 150) {
			page = pdf.addPage(PAGE_SIZE);
			y = 790;
		}
		page.drawText("Enkelthendelser", { x: MARGIN_X, y, size: 13, font: bold, color: rgb(0, 0, 0) });
		y -= 20;
		for (const incident of data.incidents) {
			if (y < 60) {
				page = pdf.addPage(PAGE_SIZE);
				y = 790;
			}
			const outcomeLabel = incident.outcome === "cancelled" ? "Kansellert" : "Utsatt";
			const date = new Date(incident.createdAt).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
			const reasons = (incident.reasons ?? []).map((r) => CREW_CHANGE_REASON_LABELS[r]).join(", ");
			page.drawText(`${date} - ${incident.base} - ${outcomeLabel} - ${reasons}`, { x: MARGIN_X, y, size: 9, font, color: rgb(0.15, 0.15, 0.15) });
			y -= 14;
			if (incident.comment) {
				page.drawText(`  Kommentar: ${incident.comment}`, { x: MARGIN_X, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
				y -= 14;
			}
		}
	}

	return pdf.save();
}
