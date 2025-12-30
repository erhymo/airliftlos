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
	  const [resumeReport, setResumeReport] = useState<DriftsReportLite | null>(null);
	  const [resumeDate, setResumeDate] = useState("");
	  const [resumeTime, setResumeTime] = useState("");
	  const [resumeError, setResumeError] = useState<string | null>(null);

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

	  function startResume(report: DriftsReportLite) {
	    if (sendingId) return;
	    const now = new Date();
	    const year = now.getFullYear();
	    const month = String(now.getMonth() + 1).padStart(2, "0");
	    const day = String(now.getDate()).padStart(2, "0");
	    const dateStr = `${year}-${month}-${day}`;
	    const hour = now.getHours();
	    const minute = now.getMinutes();
	    const hourLabel = String(hour).padStart(2, "0");
	    const minuteLabel = String(minute).padStart(2, "0");

	    setResumeReport(report);
	    setResumeDate(dateStr);
	    setResumeTime(`${hourLabel}:${minuteLabel}`);
	    setResumeError(null);
	  }

	  async function handleResumeConfirm() {
	    if (!resumeReport) return;
	    if (!resumeDate || !resumeTime) {
	      setResumeError("Velg dato og tidspunkt for gjenopptatt drift.");
	      return;
	    }

	    const [yearStr, monthStr, dayStr] = resumeDate.split("-");
	    if (!yearStr || !monthStr || !dayStr) {
	      setResumeError("Ugyldig dato. Prøv igjen.");
	      return;
	    }

	    const [hourStr, minuteStrRaw] = resumeTime.split(":");
	    const hour = Number(hourStr);
	    const minute = Number(minuteStrRaw ?? "0");
	    if (Number.isNaN(hour) || hour < 0 || hour > 23) {
	      setResumeError("Ugyldig klokkeslett. Bruk 00–23.");
	      return;
	    }
	    const safeMinute = Number.isNaN(minute) || minute < 0 || minute > 59 ? 0 : minute;

	    const datoTekst = `${dayStr}-${monthStr}-${yearStr}`;
	    const hourLabel = String(hour).padStart(2, "0");
	    const minuteLabel = String(safeMinute).padStart(2, "0");

	    setSendingId(resumeReport.id);
	    try {
	      const linjer = [
	        `Base: ${resumeReport.base}`,
	        `Gjelder driftsforstyrrelse sendt ${resumeReport.dato} kl ${resumeReport.tid}.`,
	        "",
	        `Driften er gjenopptatt ${datoTekst} kl ${hourLabel}:${minuteLabel}.`,
	        "",
	        "Kommentar:",
	        "(ingen kommentar)",
	      ];

	      const plainText = linjer.join("\n");
	      const subject = `LOS-helikopter ${resumeReport.base} – drift gjenopptatt ${datoTekst}`;
	      const fromName = `LOS Helikopter ${resumeReport.base}`;

	      const response = await fetch("/api/resume-drift", {
	        method: "POST",
	        headers: {
	          "Content-Type": "application/json",
	        },
	        body: JSON.stringify({
	          base: resumeReport.base,
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
	          r.id === resumeReport.id
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
	      setResumeReport(null);
	      setResumeDate("");
	      setResumeTime("");
	      setResumeError(null);
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
	                onClick={() => startResume(report)}
	                disabled={Boolean(sendingId)}
	                className="mt-1 w-full rounded-xl border border-blue-700 bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
	              >
	                {sendingId === report.id ? "Sender..." : "Gjenoppta drift"}
	              </button>
	            </div>
	          ))}
	        </div>
	      </div>

	      {resumeReport && (
	        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
	          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-lg space-y-4">
	            <h2 className="text-base font-semibold text-gray-900">Gjenoppta drift</h2>
	            <p className="text-sm text-gray-700">
	              Dette gjelder driftsforstyrrelsen for {resumeReport.base} {" "}
	              {resumeReport.dato} kl {resumeReport.tid}.
	            </p>
	            <div className="space-y-3">
	              <div>
	                <label className="block text-sm font-medium text-gray-900" htmlFor="resume-date">
	                  Dato for gjenopptatt drift
	                </label>
	                <input
	                  id="resume-date"
	                  type="date"
	                  value={resumeDate}
	                  onChange={(e) => setResumeDate(e.target.value)}
	                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
	                />
	              </div>
	              <div>
	                <label className="block text-sm font-medium text-gray-900" htmlFor="resume-time">
	                  Tidspunkt for gjenopptatt drift
	                </label>
	                <input
	                  id="resume-time"
	                  type="time"
	                  value={resumeTime}
	                  onChange={(e) => setResumeTime(e.target.value)}
	                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
	                />
	              </div>
	              <p className="text-xs text-gray-600">
	                Dato og klokkeslett er forhåndsutfylt med når du trykket på «Gjenoppta drift»,
	                men kan endres før du sender.
	              </p>
	              {resumeError && <p className="text-xs text-red-600">{resumeError}</p>}
	            </div>
	            <div className="mt-4 flex justify-end gap-2">
	              <button
	                type="button"
	                onClick={() => {
	                  if (sendingId) return;
	                  setResumeReport(null);
	                  setResumeDate("");
	                  setResumeTime("");
	                  setResumeError(null);
	                }}
	                className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white"
	              >
	                Avbryt
	              </button>
	              <button
	                type="button"
	                onClick={handleResumeConfirm}
	                disabled={Boolean(sendingId)}
	                className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white border border-blue-700 disabled:opacity-60"
	              >
	                {sendingId && resumeReport ? "Sender..." : "Send"}
	              </button>
	            </div>
	          </div>
	        </div>
	      )}

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

