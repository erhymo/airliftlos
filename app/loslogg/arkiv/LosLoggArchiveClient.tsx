"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ArchiveRow = {
  id: string;
  date: string;
  orderNumber: string;
  techlogNumber: string;
  vesselName: string;
  details: string | null;
};

type ArchiveMonthGroup = {
  key: string;
  year: number;
  monthIndex: number;
  label: string;
  rows: ArchiveRow[];
};

function formatDisplayDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("nb-NO");
}

type Props = {
  monthGroups: ArchiveMonthGroup[];
  defaultKey: string | null;
};

export default function LosLoggArchiveClient({ monthGroups, defaultKey }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(() => {
    if (!monthGroups.length) return null;
    if (defaultKey && monthGroups.some((g) => g.key === defaultKey)) {
      return defaultKey;
    }
    return monthGroups[0]?.key ?? null;
  });

  const selectedGroup = useMemo(
    () => (selectedKey ? monthGroups.find((g) => g.key === selectedKey) ?? null : null),
    [monthGroups, selectedKey],
  );

  const selectedRows = useMemo(
    () => (selectedGroup ? [...selectedGroup.rows].sort((a, b) => b.date.localeCompare(a.date)) : []),
    [selectedGroup],
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <header className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold">LOS-logg - arkiv</h1>
            <Link
              href="/loslogg"
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Apne bestillinger
            </Link>
          </div>
          <p className="text-sm text-gray-600">
            Her ser du fullforte LOS-oppdrag per maned. Datoen er dagen oppdraget ble gjennomfort.
          </p>
        </header>

        {monthGroups.length === 0 ? (
          <p className="text-sm text-gray-600">Ingen fullforte LOS-oppdrag i arkivet enda.</p>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-gray-700">
                Arkiv for {selectedGroup?.label ?? "onsket maned"}
              </h2>
              <div className="flex flex-wrap justify-end gap-1">
                {monthGroups.map((group) => {
                  const isActive = group.key === selectedKey;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setSelectedKey(group.key)}
                      className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium ${
                        isActive
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedRows.length === 0 ? (
              <p className="text-xs text-gray-500">Ingen LOS-oppdrag funnet for valgt maned.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Dato</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Ordrenr.</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Techlog</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Fartoy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {selectedRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-2 py-1.5 text-gray-900">{formatDisplayDate(row.date)}</td>
                          <td className="px-2 py-1.5 text-gray-900">{row.orderNumber || "-"}</td>
                          <td className="px-2 py-1.5 text-gray-900">{row.techlogNumber || "-"}</td>
                          <td className="px-2 py-1.5 text-gray-900">{row.vesselName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <details className="mt-3 rounded-md border border-gray-200 bg-white">
                  <summary className="cursor-pointer select-none px-3 py-1.5 text-xs font-medium text-blue-700">
                    Vis alle detaljer
                  </summary>
                  <div className="mt-2 max-h-64 overflow-y-auto border-t border-gray-100">
                    <div className="overflow-x-auto">
                      <ul className="divide-y divide-gray-100 font-mono text-[10px] sm:text-xs">
                        {selectedRows.map((row) => (
                          <li key={row.id} className="whitespace-nowrap px-2 py-1">
                            {row.details ?? "Detaljer ikke tilgjengelig for denne raden."}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </>
            )}
          </section>
        )}

        <div className="pt-2">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 underline">
            Tilbake til forsiden
          </Link>
        </div>
      </main>
    </div>
  );
}
