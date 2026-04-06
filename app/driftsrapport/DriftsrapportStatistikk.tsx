import React from "react";
import type { DriftsReport, StatsBaseFilter } from "./page";
import { CAUSES, MONTH_LABELS } from "./page";

interface Props {
  reports: DriftsReport[];
  setShowStats: (v: boolean) => void;
  availableYears: number[];
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  statsBase: StatsBaseFilter;
  setStatsBase: (b: StatsBaseFilter) => void;
  setStatsTo: (v: string) => void;
  setShowStatsSendDialog: (v: boolean) => void;
  perMonthCounts: any;
  perMonthHours: any;
  totalHoursByCause: Record<string, number>;
  totalHoursYear: number;
  showStatsSendDialog: boolean;
  statsTo: string;
  statsPassword: string;
  setStatsPassword: (v: string) => void;
  statsSending: boolean;
  handleSendStats: () => void;
}

export function DriftsrapportStatistikk({
  reports,
  setShowStats,
  availableYears,
  selectedYear,
  setSelectedYear,
  statsBase,
  setStatsBase,
  setStatsTo,
  setShowStatsSendDialog,
  perMonthCounts,
  perMonthHours,
  totalHoursByCause,
  totalHoursYear,
  showStatsSendDialog,
  statsTo,
  statsPassword,
  setStatsPassword,
  statsSending,
  handleSendStats,
}: Props) {
  return (
    <>
      <main className="mx-auto max-w-3xl p-4">
        <div className="bg-white rounded-2xl shadow p-4 text-gray-900">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-semibold">Statistikk driftsforstyrrelser</h2>
            <button
              onClick={() => setShowStats(false)}
              className="px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-900"
            >
              Tilbake
            </button>
          </div>

          <div className="mb-3 text-xs text-gray-700 flex flex-wrap items-center gap-2 justify-between">
            <span>
              Statistikken bygger på driftsforstyrrelser som er sendt (lagret sentralt).
              Velg år og eventuelt base nedenfor.
            </span>
            {reports.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStatsTo("");
                    setShowStatsSendDialog(true);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-300 bg-white text-gray-900"
                >
                  Send statistikk
                </button>
              </div>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  selectedYear === year
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-900 border-gray-300"
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-700 mr-1">Base:</span>
            {(["Alle", "Bergen", "Hammerfest"] as StatsBaseFilter[]).map((b) => (
              <button
                key={b}
                onClick={() => setStatsBase(b)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  statsBase === b
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-900 border-gray-300"
                }`}
              >
                {b === "Alle" ? "Alle baser" : b}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-sm">
                Antall driftsforstyrrelser per måned og årsak – {selectedYear} ({
                  statsBase === "Alle" ? "alle baser" : statsBase
                })
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border px-1 py-0.5 text-left">Måned</th>
                      {CAUSES.map((cause) => (
                        <th key={cause} className="border px-1 py-0.5 text-left">
                          {cause}
                        </th>
                      ))}
                      <th className="border px-1 py-0.5 text-left">Totalt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTH_LABELS.map((label, index) => {
                      const countsRow = perMonthCounts[index];
                      const monthTotal = countsRow.totalReports;
                      return (
                        <tr key={label}>
                          <td className="border px-1 py-0.5 font-medium whitespace-nowrap">
                            {label}
                          </td>
                          {CAUSES.map((cause) => (
                            <td key={cause} className="border px-1 py-0.5 text-right">
                              {countsRow.perCause[cause] || 0}
                            </td>
                          ))}
                          <td className="border px-1 py-0.5 text-right font-semibold">
                            {monthTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-sm">
                Antall timer stopp per måned og årsak – {selectedYear} ({
                  statsBase === "Alle" ? "alle baser" : statsBase
                })
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="border px-1 py-0.5 text-left">Måned</th>
                      {CAUSES.map((cause) => (
                        <th key={cause} className="border px-1 py-0.5 text-left">
                          {cause}
                        </th>
                      ))}
                      <th className="border px-1 py-0.5 text-left">Totalt timer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTH_LABELS.map((label, index) => {
                      const hoursRow = perMonthHours[index];
                      return (
                        <tr key={label}>
                          <td className="border px-1 py-0.5 font-medium whitespace-nowrap">
                            {label}
                          </td>
                          {CAUSES.map((cause) => (
                            <td key={cause} className="border px-1 py-0.5 text-right">
                              {hoursRow.perCause[cause] || 0}
                            </td>
                          ))}
                          <td className="border px-1 py-0.5 text-right font-semibold">
                            {hoursRow.totalHours || 0}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50">
                      <td className="border px-1 py-0.5 font-semibold">Sum år</td>
                      {CAUSES.map((cause) => (
                        <td
                          key={cause}
                          className="border px-1 py-0.5 text-right font-semibold"
                        >
                          {totalHoursByCause[cause] || 0}
                        </td>
                      ))}
                      <td className="border px-1 py-0.5 text-right font-bold">
                        {totalHoursYear || 0}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showStatsSendDialog && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="mx-auto w-full max-w-md p-4">
            <div className="bg-white rounded-2xl shadow p-4">
              <h2 className="text-lg font-semibold mb-1">Send statistikk</h2>
              <p className="text-sm text-gray-700 mb-3">
                Statistikk for {selectedYear} sendes som PDF-vedlegg. Skriv inn
                e-postadresser (komma, mellomrom eller semikolon mellom hver).
              </p>
              <input
                type="text"
                value={statsTo}
                onChange={(e) => setStatsTo(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm text-gray-900"
                placeholder="fornavn.etternavn@firma.no, annen@epost.no"
                disabled={statsSending}
              />
              <div className="mt-3">
              <p className="text-xs text-gray-700 mb-1">
                Passord
              </p>
                <input
                  type="password"
                  value={statsPassword}
                  onChange={(e) => setStatsPassword(e.target.value)}
                  className="w-full border rounded-xl p-3 text-sm text-gray-900"
                  placeholder="Passord"
                  disabled={statsSending}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (statsSending) return;
                    setShowStatsSendDialog(false);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleSendStats}
                  disabled={statsSending}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white border border-blue-700"
                >
                  {statsSending ? "Sender..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
