"use client";

import { useEffect, useMemo, useState } from "react";

// Enkel kopi av de feltene vi trenger fra driftsrapporten på forsiden
// (full typen ligger i app/driftsrapport/page.tsx).
type Base = "Bergen" | "Hammerfest";

interface DriftsReportLite {
  id: string;
  base: Base;
  dato: string;
  tid: string;
  createdAt?: number;
  createdOnDeviceId?: string;
  gjenopptattKl?: number;
  gjenopptattKommentar?: string;
  gjenopptattSendtAt?: number;
  locallyClosed?: boolean;
}

const STORAGE_KEY = "driftsrapport_reports_v2";
const DEVICE_ID_KEY = "driftsrapport_device_id";

function loadLocalReports(): DriftsReportLite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as DriftsReportLite[];
  } catch {
    return [];
  }
}

function saveLocalReports(reports: DriftsReportLite[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return "unknown";
  }
}

export default function DriftsforstyrrelseForsideClient() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [reports, setReports] = useState<DriftsReportLite[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    setReports(loadLocalReports());
  }, []);

  const activeReports = useMemo(() => {
    if (!deviceId) return [] as DriftsReportLite[];

    const byBase: Partial<Record<Base, DriftsReportLite>> = {};

    for (const r of reports) {
      if (r.createdOnDeviceId !== deviceId) continue;
      if (r.gjenopptattSendtAt) continue;
      if (r.locallyClosed) continue;

      const existing = byBase[r.base];
      const createdAt = typeof r.createdAt === "number" ? r.createdAt : 0;
      const existingCreatedAt =
        existing && typeof existing.createdAt === "number"
          ? existing.createdAt
          : 0;

      if (!existing || createdAt > existingCreatedAt) {
        byBase[r.base] = r;
      }
    }

    return Object.values(byBase).filter(
      (r): r is DriftsReportLite => Boolean(r)
    );
  }, [deviceId, reports]);

  async function handleResume(report: DriftsReportLite) {
    if (sendingId) return;

    setSendingId(report.id);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const datoTekst = `${day}-${month}-${year}`;
      const hour = now.getHours();
      const hourLabel = String(hour).padStart(2, "0");

      const linjer = [
        `Base: ${report.base}`,
        `Gjelder driftsforstyrrelse sendt ${report.dato} kl ${report.tid}.`,
        "",
        `Driften er gjenopptatt kl ${hourLabel}:00.`,
        "",
        "Kommentar:",
        "(ingen kommentar)",
      ];

      const plainText = linjer.join("\n");
      const subject = `LOS-helikopter ${report.base} – drift gjenopptatt ${datoTekst}`;
      const fromName = `LOS Helikopter ${report.base}`;

      const response = await fetch("/api/resume-drift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base: report.base,
          subject,
          body: plainText,
          fromName,
        }),
      });

      let data: { ok?: boolean; error?: string; details?: string } | null = null;
      try {
        data = await response.json();
      } catch {
        // Ignorer JSON-feil
      }

      if (!response.ok || (data && data.ok === false)) {
        const msg =
          (data && (data.error || data.details)) ||
          "Klarte ikke å sende melding om gjenopptatt drift. Prøv igjen senere.";
        alert(msg);
        return;
      }

      const sentAt = Date.now();
      setReports((prev) => {
        const next = prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                gjenopptattKl: hour,
                gjenopptattKommentar: "",
                gjenopptattSendtAt: sentAt,
              }
            : r
        );
        saveLocalReports(next);
        return next;
      });

      setShowSuccess(true);
    } finally {
      setSendingId(null);
    }
  }

	  if (!deviceId || activeReports.length === 0) {
	    return null;
	  }

	  return (
	    <>
	      {/* Aktiv driftsforstyrrelse: egen boble rett over hovedboblen på forsiden */}
	      <div className="absolute inset-x-0 -top-4 z-30 flex justify-center px-4">
	        <div className="w-full max-w-md space-y-3">
	          {activeReports.map((report) => (
	            <div
	              key={report.id}
	              className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-gray-900 shadow-md"
	            >
	              <div className="mb-2 flex items-center justify-between gap-2">
	                <div className="font-medium">{report.base}</div>
	                <div className="text-xs text-gray-700">
	                  {report.dato} kl {report.tid}
	                </div>
	              </div>
	              <button
	                type="button"
	                onClick={() => handleResume(report)}
	                disabled={Boolean(sendingId)}
	                className="mt-1 w-full rounded-xl border border-blue-700 bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
	              >
	                {sendingId === report.id ? "Sender..." : "Gjenoppta drift"}
	              </button>
	            </div>
	          ))}
	        </div>
	      </div>

	      {showSuccess && (
	        <div className="fixed inset-x-0 top-20 z-40 flex justify-center px-4">
	          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
	            <p className="text-sm text-gray-900">
	              Drift er gjenopptatt og e-post til faste mottakere er sendt.
	            </p>
	            <div className="flex justify-end">
	              <button
	                type="button"
	                onClick={() => setShowSuccess(false)}
	                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
	              >
	                OK
	              </button>
	            </div>
	          </div>
	        </div>
	      )}
	    </>
	  );
}

