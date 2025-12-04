"use client";

import type { VaktReport } from "../types";

interface VaktReportArchiveProps {
  reports: VaktReport[];
  onOpen: (report: VaktReport) => void;
  onNew: () => void;
  onDelete: (report: VaktReport) => void;
}

export default function VaktReportArchive({
  reports,
  onOpen,
  onNew,
  onDelete,
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
		                  onClick={() => {
		                    if (window.confirm("Slette denne vaktrapporten?")) {
		                      onDelete(r);
		                    }
		                  }}
		                  className="text-red-600 underline"
		                >
		                  Slett
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

