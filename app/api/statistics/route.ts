import { NextResponse } from "next/server";
import { getDb } from "../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

type LosBookingDoc = {
  gt?: number | string | null;
  adminRowData?: {
    gt?: number | string | null;
    date?: string | null;
  } | null;
  status?: string | null;
  date?: string | null;
  adminExcelDate?: string | null;
  adminSheetName?: string | null;
};

type TonnageBuckets = {
  under30000: number;
  between30000And60000: number;
  between60000And90000: number;
  between90000And120000: number;
  over120000: number;
};

function parseGt(value: unknown): number | null {
  if (typeof value === "number") {
    if (Number.isNaN(value)) return null;
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.replace(/\s+/g, "").replace(",", ".");
    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }
  return null;
}

function getYearMonthFromDoc(
  data: LosBookingDoc,
): { year: number; month: number } | null {
  const excelDate = data.adminExcelDate ?? data.adminRowData?.date ?? null;
  if (excelDate && typeof excelDate === "string") {
    const parts = excelDate.split(".");
    if (parts.length >= 3) {
      const day = Number(parts[0]);
      const month = Number(parts[1]);
      const year = Number(parts[2]);
      if (
        Number.isFinite(day) &&
        Number.isFinite(month) &&
        Number.isFinite(year) &&
        month >= 1 &&
        month <= 12
      ) {
        return { year, month };
      }
    }
  }

  const iso = data.date;
  if (iso && typeof iso === "string") {
    const [yearStr, monthStr] = iso.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      month >= 1 &&
      month <= 12
    ) {
      return { year, month };
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const db = getDb();
    const snapshot = await db
      .collection("losBookings")
      .where("status", "==", "closed")
      .get();

    const url = new URL(req.url);
    const now = new Date();
    const requestedMonth = url.searchParams.get("month");
    const requestedYear = url.searchParams.get("year");
    const monthFilter = requestedMonth ? Number(requestedMonth) : 12;
    const yearFilter = requestedYear ? Number(requestedYear) : now.getFullYear();

    const buckets: TonnageBuckets = {
      under30000: 0,
      between30000And60000: 0,
      between60000And90000: 0,
      between90000And120000: 0,
      over120000: 0,
    };

    let totalClosed = 0;
    let totalWithGt = 0;

    snapshot.forEach((doc) => {
      const data = doc.data() as LosBookingDoc;
      if (data.status !== "closed") return;

      const ym = getYearMonthFromDoc(data);
      if (!ym) return;
      if (ym.year !== yearFilter || ym.month !== monthFilter) return;

      totalClosed += 1;

      const directGt = parseGt(data.gt ?? null);
      const adminGt = parseGt(data.adminRowData?.gt ?? null);
      const gt = directGt ?? adminGt;

      if (gt == null) return;

      totalWithGt += 1;

      if (gt < 30000) {
        buckets.under30000 += 1;
      } else if (gt < 60000) {
        buckets.between30000And60000 += 1;
      } else if (gt < 90000) {
        buckets.between60000And90000 += 1;
      } else if (gt < 120000) {
        buckets.between90000And120000 += 1;
      } else {
        buckets.over120000 += 1;
      }
    });

    return NextResponse.json({
      ok: true,
      totalClosed,
      totalWithGt,
      buckets,
      month: monthFilter,
      year: yearFilter,
    });
  } catch (error) {
    console.error("Feil i LOS-statistikk GET", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente LOS-statistikk." },
      { status: 500 },
    );
  }
}
