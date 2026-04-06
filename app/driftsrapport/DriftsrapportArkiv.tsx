import React from "react";
import type { DriftsReport } from "./page";

interface Props {
  reports: DriftsReport[];
  deviceId: string;
  openExisting: (r: DriftsReport) => void;
  resendReport: (r: DriftsReport) => void;
  markReportDone: (r: DriftsReport) => void;
  startResumeFlow: (r: DriftsReport) => void;
  reset: () => void;
  setShowArchive: (v: boolean) => void;
}

export function DriftsrapportArkiv({
  reports,
  deviceId,
  openExisting,
  resendReport,
  markReportDone,
  startResumeFlow,
  reset,
  setShowArchive,
}: Props) {
  return (
    <main className="mx-auto max-w-md p-4">
      <div className="bg-white rounded-2xl shadow divide-y">
        <div className="p-4 font-semibold">Arkiv (nyeste øverst)</div>

        {reports.length === 0 && (
          <div className="p-4 text-sm text-gray-800">
            Ingen rapporter enda.
          </div>
        )}

        {reports.map((r) => {
          const alreadyResumedFromServer = Boolean(r.gjenopptattSendtAt);
          const hasCreatorDevice = Boolean(r.createdOnDeviceId);
          const isLocallyClosed = r.locallyClosed === true;
          // Historiske rapporter uten createdOnDeviceId skal ikke kunne gjenopptas
          // med den nye funksjonen. Vi behandler dem som "allerede gjenopptatt"
          // i UI slik at knappen blir grået ut og ikke kan trykkes.
          const treatedAsResumed = alreadyResumedFromServer || !hasCreatorDevice;
          const canResumeOnThisDevice =
            !treatedAsResumed && !isLocallyClosed && r.createdOnDeviceId === deviceId;
          const isResumeDisabled = treatedAsResumed || isLocallyClosed || !canResumeOnThisDevice;
          const resumedLabelTime =
            typeof r.gjenopptattKl === "number"
              ? String(r.gjenopptattKl).padStart(2, "0") + ":00"
              : null;
          return (
            <div key={r.id} className="p-4">
              <div className="text-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">
                    {r.base} – {r.dato} {r.tid}
                  </div>
                  <div className="text-gray-900 text-sm">
                    {r.arsaker.join(", ") || "Ingen årsak valgt"} •{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </div>
                  {treatedAsResumed && (
                    <div className="mt-1 text-xs text-gray-700">
                      Drift gjenopptatt
                      {resumedLabelTime ? ` kl ${resumedLabelTime}` : ""}
                      {r.gjenopptattSendtAt
                        ? ` (melding sendt ${new Date(
                            r.gjenopptattSendtAt
                          ).toLocaleString()})`
                        : ""}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-2 sm:items-end">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openExisting(r)}
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
                    <button
                      className="text-gray-900 underline"
                      onClick={() => markReportDone(r)}
                    >
                      Marker ferdig
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => startResumeFlow(r)}
                    disabled={isResumeDisabled}
                    className={`mt-1 w-full sm:w-auto px-3 py-2 rounded-xl text-sm font-semibold border transition ${
                      isResumeDisabled
                        ? "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                        : "bg-blue-600 text-white border-blue-700"
                    }`}
                  >
                    {treatedAsResumed
                      ? "Drift er gjenopptatt"
                      : isLocallyClosed
                      ? "Markert ferdig"
                      : "Gjenoppta drift"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          onClick={() => {
            reset();
            setShowArchive(false);
          }}
          className="w-full py-3 rounded-xl bg-black text-white"
        >
          Ny driftsforstyrrelse
        </button>
      </div>
    </main>
  );
}
