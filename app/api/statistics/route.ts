import { NextResponse } from "next/server";
import { getDb } from "../../../lib/firebaseAdmin";
import {
  LosBookingDoc,
  getYearMonthFromDoc,
  parseGt,
} from "../../../lib/losStatistics";

export const dynamic = "force-dynamic";

type TonnageBuckets = {
  under30000: number;
  between30000And60000: number;
  between60000And90000: number;
  between90000And120000: number;
  over120000: number;
};

type VesselStats = {
  vesselName: string;
  base: string | null;
  gt: number | null;
  count: number;
};

type BaseStats = {
  base: string;
  totalClosed: number;
  totalWithGt: number;
  vessels: VesselStats[];
	};

function makeEmptyBuckets(): TonnageBuckets {
  return {
    under30000: 0,
    between30000And60000: 0,
    between90000And120000: 0,
    between60000And90000: 0,
    over120000: 0,
  };
}

function incrementBuckets(target: TonnageBuckets, gt: number) {
  if (gt < 30000) {
    target.under30000 += 1;
  } else if (gt < 60000) {
    target.between30000And60000 += 1;
  } else if (gt < 90000) {
    target.between60000And90000 += 1;
  } else if (gt < 120000) {
    target.between90000And120000 += 1;
  } else {
    target.over120000 += 1;
  }
}

function addToMap(
  map: Map<string, VesselStats>,
  vesselName: string,
  base: string | null,
  gt: number | null,
) {
  const key = vesselName.trim().toUpperCase() || "UKJENT";
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
    if (existing.gt == null && gt != null) {
      existing.gt = gt;
    }
  } else {
    map.set(key, {
      vesselName: vesselName || "Ukjent fartøy",
      base,
      gt,
      count: 1,
    });
  }
}

function makeBaseStats(
  label: string,
  closed: number,
  withGt: number,
  map: Map<string, VesselStats>,
): BaseStats {
  return {
    base: label,
    totalClosed: closed,
    totalWithGt: withGt,
    vessels: Array.from(map.values()).sort((a, b) =>
      a.vesselName.localeCompare(b.vesselName, "nb-NO"),
    ),
  };
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

    const buckets: TonnageBuckets = makeEmptyBuckets();
    const bergenBuckets: TonnageBuckets = makeEmptyBuckets();
    const hammerfestBuckets: TonnageBuckets = makeEmptyBuckets();

    let totalClosed = 0;
    let totalWithGt = 0;

    const bergenMap = new Map<string, VesselStats>();
    const hammerfestMap = new Map<string, VesselStats>();
    const allBasesMap = new Map<string, VesselStats>();

    let bergenClosed = 0;
    let bergenWithGt = 0;
    let hammerfestClosed = 0;
    let hammerfestWithGt = 0;

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

      const rawBase = typeof data.base === "string" ? data.base : null;
      const vesselNameRaw =
        typeof data.vesselName === "string" && data.vesselName.trim().length > 0
          ? data.vesselName.trim()
          : "Ukjent fartøy";

      const normalizedBase =
        rawBase === "Bergen" || rawBase === "Hammerfest" ? rawBase : null;

      if (normalizedBase === "Bergen") {
        bergenClosed += 1;
        bergenWithGt += 1;
        addToMap(bergenMap, vesselNameRaw, rawBase, gt);
      } else if (normalizedBase === "Hammerfest") {
        hammerfestClosed += 1;
        hammerfestWithGt += 1;
        addToMap(hammerfestMap, vesselNameRaw, rawBase, gt);
      }

      addToMap(allBasesMap, vesselNameRaw, rawBase, gt);

      incrementBuckets(buckets, gt);
      if (normalizedBase === "Bergen") {
        incrementBuckets(bergenBuckets, gt);
      } else if (normalizedBase === "Hammerfest") {
        incrementBuckets(hammerfestBuckets, gt);
      }
    });

    const bergenStats = makeBaseStats(
      "Bergen",
      bergenClosed,
      bergenWithGt,
      bergenMap,
    );
    const hammerfestStats = makeBaseStats(
      "Hammerfest",
      hammerfestClosed,
      hammerfestWithGt,
      hammerfestMap,
    );
    const allStats = makeBaseStats(
      "Begge",
      totalClosed,
      totalWithGt,
      allBasesMap,
    );

    return NextResponse.json({
      ok: true,
      totalClosed,
      totalWithGt,
      buckets,
      month: monthFilter,
      year: yearFilter,
      bucketsByBase: {
        all: buckets,
        bergen: bergenBuckets,
        hammerfest: hammerfestBuckets,
      },
      bases: {
        bergen: bergenStats,
        hammerfest: hammerfestStats,
        all: allStats,
      },
    });
  } catch (error) {
    console.error("Feil i LOS-statistikk GET", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente LOS-statistikk." },
      { status: 500 },
    );
  }
}
