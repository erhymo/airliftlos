"use client";

import { useEffect, useState } from "react";

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

type MonthlyResponse = {
  rows: AdminRow[];
  months: MonthMeta[];
  defaultMonthKey: string | null;
};

export default function AdminMonthlyPage() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [months, setMonths] = useState<MonthMeta[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/los/monthly");
        if (!res.ok) {
          throw new Error(`Feil ved henting av månedsskjema (${res.status})`);
        }

        const data = (await res.json()) as MonthlyResponse;
        if (!isMounted) return;

        setRows(data.rows ?? []);
        setMonths(data.months ?? []);
        setSelectedMonth(data.defaultMonthKey ?? null);
      } catch (err) {
        console.error("Feil ved henting av admin månedsskjema", err);
        if (!isMounted) return;
        setError("Klarte ikke å hente månedsskjema. Prøv igjen senere.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleRows = selectedMonth
    ? rows.filter((row) => row.dateIso?.startsWith(selectedMonth))
    : rows;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4">
      <main className="mx-auto max-w-6xl space-y-4">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">LOS-oppdrag per måned</h1>
          <p className="text-sm text-gray-600">
            Oversikt over lukkede LOS-oppdrag hentet direkte fra systemet, ikke fra Excel.
          </p>
        </header>

        {months.length > 0 && (
          <section className="flex flex-wrap gap-2 pt-1">
            {months.map((m) => {
              const isActive = m.key === selectedMonth;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMonth(m.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </section>
        )}

        {loading && (
          <p className="text-sm text-gray-600">Laster månedsskjema …</p>
        )}

        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && visibleRows.length === 0 && (
          <p className="text-sm text-gray-600">Ingen rader å vise for valgt måned.</p>
        )}

        {!loading && !error && visibleRows.length > 0 && (
          <section className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">✔</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Dato</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Ordrenr</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Techlog</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Fartøy</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">GT</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Sted</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Type</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">LOS 1</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">LOS 2</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Til flyplass</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">ENFJ</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Heis</th>
                  <th className="px-2 py-2 border-b text-left font-medium text-gray-700">Kommentar</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.afterClosed
                        ? "bg-yellow-50 hover:bg-yellow-100"
                        : row.adminVerified
                          ? "bg-green-50 hover:bg-green-100"
                          : "hover:bg-gray-50"
                    }
                  >
                    <td className="px-2 py-1 border-b align-top">
                      <input
                        type="checkbox"
                        checked={row.adminVerified}
                        readOnly
                        className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.dateIso}</td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.orderNumber}</td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.techlogNumber}</td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.vesselName}</td>
                    <td className="px-2 py-1 border-b align-top text-right">{row.gt}</td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.location}</td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.losType}</td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.los1}</td>
                    <td className="px-2 py-1 border-b align-top whitespace-nowrap">{row.los2}</td>
                    <td className="px-2 py-1 border-b align-top text-center">{row.losToAirportCount}</td>
                    <td className="px-2 py-1 border-b align-top text-center">{row.enfjLandings}</td>
                    <td className="px-2 py-1 border-b align-top text-center">{row.hoistCount}</td>
                    <td className="px-2 py-1 border-b align-top min-w-[160px] max-w-[260px]">
                      <div className="max-h-16 overflow-y-auto whitespace-pre-wrap break-words">
                        {row.comment}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}
