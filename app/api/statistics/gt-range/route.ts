import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/firebaseAdmin";
import {
  LosBookingDoc,
  getYearMonthFromDoc,
  parseGt,
} from "../../../../lib/losStatistics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fromYear = Number(url.searchParams.get("fromYear") ?? "0");
    const toYear = Number(url.searchParams.get("toYear") ?? "0");
    const threshold = Number(url.searchParams.get("threshold") ?? "0");
    const direction = url.searchParams.get("direction") === "under" ? "under" : "over";
    const baseParam = url.searchParams.get("base");

    const yearFrom = Number.isFinite(fromYear) && fromYear > 0 ? fromYear : 2017;
    const yearTo = Number.isFinite(toYear) && toYear > 0 ? toYear : 2025;

    if (!Number.isFinite(threshold) || threshold <= 0) {
      return NextResponse.json(
        { ok: false, error: "Ugyldig GT-grense." },
        { status: 400 },
      );
    }

    const db = getDb();
    const snapshot = await db
      .collection("losBookings")
      .where("status", "==", "closed")
      .get();

    const counts = new Map<string, number>();

    snapshot.forEach((doc) => {
      const data = doc.data() as LosBookingDoc;
      if (data.status !== "closed") return;

      const ym = getYearMonthFromDoc(data);
      if (!ym) return;
      if (ym.year < yearFrom || ym.year > yearTo) return;

      const rawBase = typeof data.base === "string" ? data.base : null;
      const normalizedBase =
        rawBase === "Bergen" || rawBase === "Hammerfest" ? rawBase : null;

      if (baseParam === "Bergen" && normalizedBase !== "Bergen") return;
      if (baseParam === "Hammerfest" && normalizedBase !== "Hammerfest") return;

      const directGt = parseGt(data.gt ?? null);
      const adminGt = parseGt(data.adminRowData?.gt ?? null);
      const gt = directGt ?? adminGt;
      if (gt == null) return;

      if (direction === "over" && gt <= threshold) return;
      if (direction === "under" && gt >= threshold) return;

      const key = `${ym.year}-${ym.month}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const result: { year: number; month: number; label: string; count: number }[] = [];

    for (let year = yearFrom; year <= yearTo; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const key = `${year}-${month}`;
        const count = counts.get(key) ?? 0;
        if (count === 0) continue;
        const label = `${month.toString().padStart(2, "0")}.${year}`;
        result.push({ year, month, label, count });
      }
    }

    const total = result.reduce((sum, item) => sum + item.count, 0);

    return NextResponse.json({
      ok: true,
      fromYear: yearFrom,
      toYear: yearTo,
      threshold,
      direction,
      base: baseParam ?? null,
      total,
      byMonth: result,
    });
  } catch (error) {
    console.error("Feil i GT-range-statistikk GET", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente GT-basert statistikk." },
      { status: 500 },
    );
  }
}

