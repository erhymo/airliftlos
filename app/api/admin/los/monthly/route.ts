import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getDb } from "../../../../../lib/firebaseAdmin";

const MONTH_NAMES: Record<string, string> = {
  "01": "Januar",
  "02": "Februar",
  "03": "Mars",
  "04": "April",
  "05": "Mai",
  "06": "Juni",
  "07": "Juli",
  "08": "August",
  "09": "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

function toMonthKey(dateIso: string | null | undefined): string | null {
  if (!dateIso || dateIso.length < 7) return null;
  const [year, month] = dateIso.split("-");
  if (!year || !month) return null;
  return `${year}-${month}`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const m = MONTH_NAMES[month] ?? month;
  return `${m} ${year}`;
}

type AdminRow = {
  id: string;
  dateIso: string;
  vesselName: string;
  orderNumber: string;
  techlogNumber: string;
  base: string | null;
  gt: string;
  location: string;
  losType: string;
  los1: string;
  los2: string;
  losToAirportCount: number;
  enfjLandings: number;
  hoistCount: number;
  comment: string;
  adminVerified: boolean;
  afterClosed: boolean;
};

type MonthMeta = {
  key: string;
  label: string;
};

export async function GET() {
  try {
    const accessCode = process.env.ACCESS_CODE;
    if (accessCode) {
      const cookieStore = await cookies();
      const accessCookie = cookieStore.get("airliftlos_access");
      if (!accessCookie || accessCookie.value !== "ok") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const db = getDb();
    const snapshot = await db.collection("losBookings").where("status", "==", "closed").get();

    const rows: AdminRow[] = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const admin = (data.adminRowData ?? {}) as Record<string, unknown>;
      const isoDate = (data.date as string | undefined) ?? "";

      return {
        id: doc.id,
        dateIso: isoDate,
        vesselName: String(admin.vesselName ?? data.vesselName ?? "Ukjent fartøy"),
        orderNumber: String(admin.orderNumber ?? data.orderNumber ?? ""),
        techlogNumber: String(admin.techlogNumber ?? data.techlogNumber ?? ""),
        base: (data.base ?? null) as string | null,
        gt: String(admin.gt ?? ""),
        location: String(admin.location ?? ""),
        losType: String(admin.losType ?? ""),
        los1: String(admin.los1 ?? ""),
        los2: String(admin.los2 ?? ""),
        losToAirportCount: Number.isFinite(admin.losToAirportCount)
          ? (admin.losToAirportCount as number)
          : 0,
        enfjLandings: Number.isFinite(admin.enfjLandings) ? (admin.enfjLandings as number) : 0,
        hoistCount: Number.isFinite(admin.hoistCount) ? (admin.hoistCount as number) : 0,
        comment: String(admin.comment ?? ""),
        adminVerified: Boolean((data.adminVerified as boolean | undefined) ?? false),
        afterClosed: Boolean((data.afterClosed as boolean | undefined) ?? false),
      };
    });

    const monthSet = new Set<string>();
    for (const row of rows) {
      const key = toMonthKey(row.dateIso);
      if (key) monthSet.add(key);
    }

    const months: MonthMeta[] = Array.from(monthSet)
      .sort()
      .map((key) => ({ key, label: formatMonthLabel(key) }));

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let defaultMonthKey: string | null = null;
    if (months.some((m) => m.key === currentKey)) {
      defaultMonthKey = currentKey;
    } else if (months.length > 0) {
      defaultMonthKey = months[months.length - 1]?.key ?? null;
    }

    return NextResponse.json({ rows, months, defaultMonthKey });
  } catch (error) {
    console.error("Feil i admin/los/monthly-API", error);
    return NextResponse.json(
      { error: "Klarte ikke å hente månedsskjema. Prøv igjen senere." },
      { status: 500 },
    );
  }
}
