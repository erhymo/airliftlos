"use client";

import type { VaktReport } from "../types";

interface VaktReportArchiveProps {
  reports: VaktReport[];
  onOpen: (report: VaktReport) => void;
  onNew: () => void;
}

async function resendReport(r: VaktReport) {
  const linjer = [
    `Crew: ${r.crew}`,
    `Uke: ${r.ukeFra}-${r.ukeTil}`,
    `Maskin i bruk: ${r.maskin}`,
    `Base: ${r.base}`,
    "",
    "Operativ informasjon:",
    r.operativ || "(tom)",
    "",
    "Annen informasjon:",
    r.annen || "(tom)",
    "",
    "Tekniske utfordringer:",
    r.teknisk || "(tom)",
    "",
    "Sjekkliste:",
    ...r.checks.map((c) => `- [${c.checked ? "x" : " "}] ${c.label}`),
    "",
    `Dato/Sign: ${r.datoSign}`,
    `Skrevet av: ${r.skrevetAv}`,
  ];

  const plainText = linjer.join("\n");
  const subject = `LOS-helikopter ${r.base} - vaktrapport ${r.datoSign}`;
  const fileName = `Vaktrapport_${r.base}_${r.ukeFra}-${r.ukeTil}.pdf`;
  const title = `Vaktrapport ${r.base} ${r.datoSign}`;
  const fromName = `LOS Helikopter ${r.base}`;

  const response = await fetch("/api/send-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, body: plainText, fileName, title, fromName }),
  });

  if (!response.ok) {
    alert("Klarte ikke å sende vaktrapport. Prøv igjen senere.");
    return;
  }

  alert("Vaktrapport sendt til faste mottakere.");
}

export default function VaktReportArchive({
  reports,
  onOpen,
  onNew,
}: VaktReportArchiveProps) {
  return (
    <main className="mx-auto max-w-md p-4">
      <div className="bg-white rounded-2xl shadow divide-y">
        <div className="p-4 font-semibold">Arkiv (nyeste øverst)</div>

        {reports.length === 0 && (
          <div className="p-4 text-sm text-gray-800">Ingen rapporter enda.</div>
        )}

        {reports.map((r) => (
          <div key={r.id} className="p-4">
            <div className="text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">
                  {r.crew} — uke {r.ukeFra}–{r.ukeTil}
                </div>
                <div className="text-gray-900 text-sm">
                  {r.maskin} • {r.base} • {new Date(r.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onOpen(r)}
                  className="text-blue-600 underline"
                >
                  Åpne
                </button>
                <button
                  className="text-gray-900 underline"
                  onClick={() => resendReport(r)}
                >
                  Send på nytt
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          onClick={onNew}
          className="w-full py-3 rounded-xl bg-black text-white"
        >
          Ny vaktrapport
        </button>
      </div>
    </main>
  );
}

