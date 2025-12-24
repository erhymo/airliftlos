export type LosBookingDoc = {
  gt?: number | string | null;
  adminRowData?: {
    gt?: number | string | null;
    date?: string | null;
  } | null;
  status?: string | null;
  date?: string | null;
  adminExcelDate?: string | null;
  adminSheetName?: string | null;
  vesselName?: string | null;
  base?: string | null;
};

export function parseGt(value: unknown): number | null {
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

export function getYearMonthFromDoc(
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

