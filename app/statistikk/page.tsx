"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type TonnageBuckets = {
  under30000: number;
  between30000And60000: number;
  between60000And90000: number;
  between90000And120000: number;
  over120000: number;
};

type StatsResponse = {
  ok: boolean;
  totalClosed: number;
  totalWithGt: number;
  buckets: TonnageBuckets;
  month: number;
  year: number;
  bucketsByBase?: {
    all: TonnageBuckets;
    bergen: TonnageBuckets;
    hammerfest: TonnageBuckets;
  };
  error?: string;
};

type ManualMonthlyStats = {
  year: number;
  month: number; // 1 = januar
  label: string; // "Januar 2024" / "Januar 2025" etc.
  totalBoats: number;
  totalRigs: number;
  boatToBoatOps: number;
  locations: {
    mongstad: number;
    melkoya: number;
    sture: number;
    karsto: number;
    nyhamna: number;
    losOvrigBoats: number;
    losOvrigRigs: number;
  };
};

const SHORT_MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MANUAL_2023_MONTHLY_STATS: ManualMonthlyStats[] = [
  {
    year: 2023,
    month: 1,
    label: "Januar 2023",
    totalBoats: 106,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 56,
      melkoya: 16,
      sture: 22,
      karsto: 4,
      nyhamna: 0,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 2,
    label: "Februar 2023",
    totalBoats: 110,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 68,
      melkoya: 14,
      sture: 20,
      karsto: 4,
      nyhamna: 0,
      losOvrigBoats: 4,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 3,
    label: "Mars 2023",
    totalBoats: 116,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 71,
      melkoya: 16,
      sture: 17,
      karsto: 2,
      nyhamna: 2,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 4,
    label: "April 2023",
    totalBoats: 123,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 79,
      melkoya: 18,
      sture: 19,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 4,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 5,
    label: "Mai 2023",
    totalBoats: 112,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 67,
      melkoya: 10,
      sture: 23,
      karsto: 4,
      nyhamna: 1,
      losOvrigBoats: 7,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 6,
    label: "Juni 2023",
    totalBoats: 110,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 77,
      melkoya: 9,
      sture: 15,
      karsto: 1,
      nyhamna: 0,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 7,
    label: "Juli 2023",
    totalBoats: 125,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 75,
      melkoya: 19,
      sture: 22,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 7,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 8,
    label: "August 2023",
    totalBoats: 120,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 84,
      melkoya: 13,
      sture: 18,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 3,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 9,
    label: "September 2023",
    totalBoats: 124,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 78,
      melkoya: 17,
      sture: 19,
      karsto: 1,
      nyhamna: 2,
      losOvrigBoats: 7,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 10,
    label: "Oktober 2023",
    totalBoats: 120,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 75,
      melkoya: 16,
      sture: 20,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 11,
    label: "November 2023",
    totalBoats: 112,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 75,
      melkoya: 14,
      sture: 18,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 2,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2023,
    month: 12,
    label: "Desember 2023",
    totalBoats: 120,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 79,
      melkoya: 16,
      sture: 20,
      karsto: 5,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
];

const MANUAL_2024_MONTHLY_STATS: ManualMonthlyStats[] = [
  {
    year: 2024,
    month: 1,
    label: "Januar 2024",
    totalBoats: 118,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 76,
      melkoya: 14,
      sture: 21,
      karsto: 4,
      nyhamna: 0,
      losOvrigBoats: 3,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 2,
    label: "Februar 2024",
    totalBoats: 116,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 68,
      melkoya: 16,
      sture: 20,
      karsto: 4,
      nyhamna: 2,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 3,
    label: "Mars 2024",
    totalBoats: 115,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 67,
      melkoya: 17,
      sture: 20,
      karsto: 5,
      nyhamna: 1,
      losOvrigBoats: 5,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 4,
    label: "April 2024",
    totalBoats: 121,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 72,
      melkoya: 19,
      sture: 22,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 5,
    label: "Mai 2024",
    totalBoats: 119,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 72,
      melkoya: 17,
      sture: 24,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 4,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 6,
    label: "Juni 2024",
    totalBoats: 114,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 65,
      melkoya: 18,
      sture: 17,
      karsto: 3,
      nyhamna: 2,
      losOvrigBoats: 9,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 7,
    label: "Juli 2024",
    totalBoats: 129,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 79,
      melkoya: 16,
      sture: 20,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 12,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 8,
    label: "August 2024",
    totalBoats: 124,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 82,
      melkoya: 15,
      sture: 18,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 6,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 9,
    label: "September 2024",
    totalBoats: 121,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 74,
      melkoya: 18,
      sture: 20,
      karsto: 1,
      nyhamna: 0,
      losOvrigBoats: 8,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 10,
    label: "Oktober 2024",
    totalBoats: 123,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 78,
      melkoya: 16,
      sture: 18,
      karsto: 6,
      nyhamna: 2,
      losOvrigBoats: 3,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 11,
    label: "November 2024",
    totalBoats: 116,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 72,
      melkoya: 16,
      sture: 20,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 5,
      losOvrigRigs: 0,
    },
  },
  {
    year: 2024,
    month: 12,
    label: "Desember 2024",
    totalBoats: 129,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 86,
      melkoya: 17,
      sture: 22,
      karsto: 2,
      nyhamna: 0,
      losOvrigBoats: 2,
      losOvrigRigs: 0,
    },
  },
];

const MANUAL_2025_MONTHLY_STATS: ManualMonthlyStats[] = [
  {
    year: 2025,
    month: 1,
    label: "Januar 2025",
    totalBoats: 111,
    totalRigs: 2,
    boatToBoatOps: 22,
    locations: {
      mongstad: 83,
      melkoya: 9,
      sture: 16,
      karsto: 2,
      nyhamna: 1,
      losOvrigBoats: 0,
      losOvrigRigs: 2,
    },
  },
  {
    year: 2025,
    month: 2,
    label: "Februar 2025",
    totalBoats: 94,
    totalRigs: 4,
    boatToBoatOps: 9,
    locations: {
      mongstad: 53,
      melkoya: 12,
      sture: 26,
      karsto: 3,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 4,
    },
  },
  {
    year: 2025,
    month: 3,
    label: "Mars 2025",
    totalBoats: 103,
    totalRigs: 6,
    boatToBoatOps: 15,
    locations: {
      mongstad: 62,
      melkoya: 19,
      sture: 17,
      karsto: 2,
      nyhamna: 1,
      losOvrigBoats: 2,
      losOvrigRigs: 6,
    },
  },
  {
    year: 2025,
    month: 4,
    label: "April 2025",
    totalBoats: 107,
    totalRigs: 8,
    boatToBoatOps: 16,
    locations: {
      mongstad: 73,
      melkoya: 8,
      sture: 20,
      karsto: 3,
      nyhamna: 2,
      losOvrigBoats: 1,
      losOvrigRigs: 8,
    },
  },
  {
    year: 2025,
    month: 5,
    label: "Mai 2025",
    totalBoats: 102,
    totalRigs: 8,
    boatToBoatOps: 6,
    locations: {
      mongstad: 76,
      melkoya: 0,
      sture: 20,
      karsto: 5,
      nyhamna: 0,
      losOvrigBoats: 1,
      losOvrigRigs: 8,
    },
  },
];

const MANUAL_2023_TOTALS = MANUAL_2023_MONTHLY_STATS.reduce(
  (acc, m) => {
    acc.totalBoats += m.totalBoats;
    acc.totalRigs += m.totalRigs;
    acc.boatToBoatOps += m.boatToBoatOps;
    acc.locations.mongstad += m.locations.mongstad;
    acc.locations.melkoya += m.locations.melkoya;
    acc.locations.sture += m.locations.sture;
    acc.locations.karsto += m.locations.karsto;
    acc.locations.nyhamna += m.locations.nyhamna;
    acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
    acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
    return acc;
  },
  {
    totalBoats: 0,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 0,
      melkoya: 0,
      sture: 0,
      karsto: 0,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
);

const MANUAL_2024_TOTALS = MANUAL_2024_MONTHLY_STATS.reduce(
  (acc, m) => {
    acc.totalBoats += m.totalBoats;
    acc.totalRigs += m.totalRigs;
    acc.boatToBoatOps += m.boatToBoatOps;
    acc.locations.mongstad += m.locations.mongstad;
    acc.locations.melkoya += m.locations.melkoya;
    acc.locations.sture += m.locations.sture;
    acc.locations.karsto += m.locations.karsto;
    acc.locations.nyhamna += m.locations.nyhamna;
    acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
    acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
    return acc;
  },
  {
    totalBoats: 0,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 0,
      melkoya: 0,
      sture: 0,
      karsto: 0,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
);

const MANUAL_2025_TOTALS = MANUAL_2025_MONTHLY_STATS.reduce(
  (acc, m) => {
    acc.totalBoats += m.totalBoats;
    acc.totalRigs += m.totalRigs;
    acc.boatToBoatOps += m.boatToBoatOps;
    acc.locations.mongstad += m.locations.mongstad;
    acc.locations.melkoya += m.locations.melkoya;
    acc.locations.sture += m.locations.sture;
    acc.locations.karsto += m.locations.karsto;
    acc.locations.nyhamna += m.locations.nyhamna;
    acc.locations.losOvrigBoats += m.locations.losOvrigBoats;
    acc.locations.losOvrigRigs += m.locations.losOvrigRigs;
    return acc;
  },
  {
    totalBoats: 0,
    totalRigs: 0,
    boatToBoatOps: 0,
    locations: {
      mongstad: 0,
      melkoya: 0,
      sture: 0,
      karsto: 0,
      nyhamna: 0,
      losOvrigBoats: 0,
      losOvrigRigs: 0,
    },
  },
);

export default function StatistikkPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  const monthlyTotals2023 = MANUAL_2023_MONTHLY_STATS.map((m) => m.totalBoats);
  const monthlyTotals2024 = MANUAL_2024_MONTHLY_STATS.map((m) => m.totalBoats);
  const chartMaxY = Math.max(...monthlyTotals2023, ...monthlyTotals2024, 0);
  const safeChartMaxY = chartMaxY > 0 ? chartMaxY : 1;
  const chartWidth = 320;
  const chartHeight = 140;
  const xStep =
    SHORT_MONTH_LABELS.length > 1
      ? chartWidth / (SHORT_MONTH_LABELS.length - 1)
      : 0;

  const buildPoints = (values: number[]) =>
    values
      .map((value, index) => {
        const x = index * xStep;
        const y = chartHeight - (value / safeChartMaxY) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

  const points2023 = buildPoints(monthlyTotals2023);
  const points2024 = buildPoints(monthlyTotals2024);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = 12; // desember
        const url = `/api/statistics?year=${year}&month=${month}`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Klarte ikke å hente statistikk.");
        }

        const data = (await res.json()) as StatsResponse;
        if (!data.ok) {
          throw new Error(data.error || "Klarte ikke å hente statistikk.");
        }

        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Klarte ikke å hente statistikk.");
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
	      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">Statistikk for LOS-oppdrag</h1>
          <p className="text-sm text-gray-600">
            Øverst vises desember-statistikk (GT per base) hentet fra
	            fagsystemet. Nederst ligger manuelle årsoversikter for LOS-oppdrag
	            per sted (2023, 2024 og 2025).
          </p>
        </header>

        {loading && (
          <p className="text-sm text-gray-500">Henter statistikk …</p>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

	        {!loading && !error && stats && (
	          <section className="space-y-4 text-sm text-gray-800">
	            <p>
	              Antall lukkede LOS-oppdrag i desember {stats.year} med registrert
	              GT: {stats.totalWithGt} (av totalt {stats.totalClosed} lukkede
	              oppdrag i desember).
	            </p>

	            {stats.bucketsByBase && (
	              <div className="overflow-x-auto">
	                <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
	                  <thead className="bg-gray-50">
	                    <tr>
	                      <th className="border px-1 py-0.5 text-left">Størrelse (GT)</th>
	                      <th className="border px-1 py-0.5 text-right">Bergen</th>
	                      <th className="border px-1 py-0.5 text-right">Hammerfest</th>
	                      <th className="border px-1 py-0.5 text-right">Begge baser</th>
	                    </tr>
	                  </thead>
	                  <tbody>
	                    {(
	                      [
	                        { key: "under30000" as const, label: "< 30 000 tonn" },
	                        {
	                          key: "between30000And60000" as const,
	                          label: "30 000 – 60 000 tonn",
	                        },
	                        {
	                          key: "between60000And90000" as const,
	                          label: "60 000 – 90 000 tonn",
	                        },
	                        {
	                          key: "between90000And120000" as const,
	                          label: "90 000 – 120 000 tonn",
	                        },
	                        {
	                          key: "over120000" as const,
	                          label: ">= 120 000 tonn",
	                        },
	                      ] satisfies { key: keyof TonnageBuckets; label: string }[]
	                    ).map((row) => (
	                      <tr key={row.key}>
	                        <td className="border px-1 py-0.5 whitespace-nowrap">
	                          {row.label}
	                        </td>
	                        <td className="border px-1 py-0.5 text-right">
	                          {stats.bucketsByBase?.bergen[row.key] ?? 0}
	                        </td>
	                        <td className="border px-1 py-0.5 text-right">
	                          {stats.bucketsByBase?.hammerfest[row.key] ?? 0}
	                        </td>
	                        <td className="border px-1 py-0.5 text-right font-semibold">
	                          {stats.bucketsByBase?.all[row.key] ?? 0}
	                        </td>
	                      </tr>
	                    ))}
	                  </tbody>
	                </table>
	              </div>
	            )}
	          </section>
	        )}

	        <section className="space-y-3 text-sm text-gray-800 mt-6">
	          <h2 className="text-sm font-semibold">
	            Visuell trend 2023–2024 (totalt LOS-oppdrag per måned)
	          </h2>
	          <p className="text-xs text-gray-600">
	            En enkel linjegraf som viser antall båter per måned i 2023 og 2024.
	          </p>

	          <div className="overflow-x-auto">
	            <svg
	              viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`}
	              className="w-full max-w-full border border-gray-200 bg-white"
	            >
	              {/* horisontale hjelpelinjer og y-verdier */}
	              {Array.from({ length: 5 }).map((_, i) => {
	                const ratio = i / 4;
	                const y = chartHeight * ratio;
	                const value = Math.round(safeChartMaxY * (1 - ratio));
	                return (
	                  <g key={i}>
	                    <line
	                      x1={0}
	                      y1={y}
	                      x2={chartWidth}
	                      y2={y}
	                      stroke="#e5e7eb"
	                      strokeWidth={0.5}
	                    />
	                    <text
	                      x={2}
	                      y={y + 4}
	                      fontSize={6}
	                      fill="#6b7280"
	                    >
	                      {value}
	                    </text>
	                  </g>
	                );
	              })}

	              {/* linje for 2023 */}
	              <polyline
	                fill="none"
	                stroke="#2563eb"
	                strokeWidth={1.5}
	                points={points2023}
	              />

	              {/* linje for 2024 */}
	              <polyline
	                fill="none"
	                stroke="#16a34a"
	                strokeWidth={1.5}
	                points={points2024}
	              />

	              {/* månedsetiketter langs x-aksen */}
	              {SHORT_MONTH_LABELS.map((label, index) => {
	                const x = index * xStep;
	                return (
	                  <text
	                    key={label}
	                    x={x}
	                    y={chartHeight + 10}
	                    fontSize={6}
	                    textAnchor="middle"
	                    fill="#374151"
	                  >
	                    {label}
	                  </text>
	                );
	              })}
	            </svg>
	
	            <div className="mt-2 flex items-center gap-4 text-[10px] text-gray-700">
	              <div className="flex items-center gap-1">
	                <span className="inline-block w-3 h-0.5 bg-blue-600" />
	                <span>2023</span>
	              </div>
	              <div className="flex items-center gap-1">
	                <span className="inline-block w-3 h-0.5 bg-green-600" />
	                <span>2024</span>
	              </div>
	            </div>
	          </div>
	        </section>

	        <section className="space-y-3 text-sm text-gray-800 mt-6">
	          <h2 className="text-sm font-semibold">
	            Manuell statistikk 2023 (totalt LOS-oppdrag per sted)
	          </h2>
	          <p className="text-xs text-gray-600">
	            Basert på summerte tall fra "Logg_2023_samlet.csv" i prosjektet.
	          </p>

	          <div className="overflow-x-auto">
	            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
	              <thead className="bg-gray-50">
	                <tr>
	                  <th className="border px-1 py-0.5 text-left">Måned</th>
	                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
	                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
	                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
	                  <th className="border px-1 py-0.5 text-right">Sture</th>
	                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
	                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
	                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
	                </tr>
	              </thead>
	              <tbody>
	                {MANUAL_2023_MONTHLY_STATS.map((m) => (
	                  <tr key={`${m.year}-${m.month}`}>
	                    <td className="border px-1 py-0.5 whitespace-nowrap">
	                      {m.label}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.totalBoats}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.mongstad}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.melkoya}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.sture}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.karsto}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.nyhamna}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.losOvrigBoats}
	                    </td>
	                  </tr>
	                ))}
	              </tbody>
	              <tfoot>
	                <tr className="font-semibold bg-gray-50">
	                  <td className="border px-1 py-0.5 text-left">Sum 2023</td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2023_TOTALS.totalBoats}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2023_TOTALS.locations.mongstad}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2023_TOTALS.locations.melkoya}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2023_TOTALS.locations.sture}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2023_TOTALS.locations.karsto}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2023_TOTALS.locations.nyhamna}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2023_TOTALS.locations.losOvrigBoats}
	                  </td>
	                </tr>
	              </tfoot>
	            </table>
	          </div>
	        </section>

	        <section className="space-y-3 text-sm text-gray-800 mt-6">
	          <h2 className="text-sm font-semibold">
	            Manuell statistikk 2024 (totalt LOS-oppdrag per sted)
	          </h2>
	          <p className="text-xs text-gray-600">
	            Basert på summerte tall fra "Logg_2024_samlet.csv" i prosjektet.
	          </p>

	          <div className="overflow-x-auto">
	            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
	              <thead className="bg-gray-50">
	                <tr>
	                  <th className="border px-1 py-0.5 text-left">Måned</th>
	                  <th className="border px-1 py-0.5 text-right">Totalt LOS-oppdrag</th>
	                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
	                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
	                  <th className="border px-1 py-0.5 text-right">Sture</th>
	                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
	                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
	                  <th className="border px-1 py-0.5 text-right">Los øvrig</th>
	                </tr>
	              </thead>
	              <tbody>
	                {MANUAL_2024_MONTHLY_STATS.map((m) => (
	                  <tr key={`${m.year}-${m.month}`}>
	                    <td className="border px-1 py-0.5 whitespace-nowrap">
	                      {m.label}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.totalBoats}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.mongstad}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.melkoya}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.sture}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.karsto}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.nyhamna}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.losOvrigBoats}
	                    </td>
	                  </tr>
	                ))}
	              </tbody>
	              <tfoot>
	                <tr className="font-semibold bg-gray-50">
	                  <td className="border px-1 py-0.5 text-left">Sum 2024</td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2024_TOTALS.totalBoats}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2024_TOTALS.locations.mongstad}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2024_TOTALS.locations.melkoya}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2024_TOTALS.locations.sture}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2024_TOTALS.locations.karsto}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2024_TOTALS.locations.nyhamna}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2024_TOTALS.locations.losOvrigBoats}
	                  </td>
	                </tr>
	              </tfoot>
	            </table>
	          </div>
	        </section>

	        <section className="space-y-3 text-sm text-gray-800 mt-6">
	          <h2 className="text-sm font-semibold">
	            Manuell statistikk 2025 (båt/rigg per sted)
	          </h2>
	          <p className="text-xs text-gray-600">
	            Basert på manuell eksport av LOS-logg 2025 (januar–mai).
	          </p>

	          <div className="overflow-x-auto">
	            <table className="min-w-full border border-gray-200 text-[10px] sm:text-xs">
	              <thead className="bg-gray-50">
	                <tr>
	                  <th className="border px-1 py-0.5 text-left">Måned</th>
	                  <th className="border px-1 py-0.5 text-right">Totalt båter</th>
	                  <th className="border px-1 py-0.5 text-right">Totalt rigg</th>
	                  <th className="border px-1 py-0.5 text-right">Båt til båt</th>
	                  <th className="border px-1 py-0.5 text-right">Mongstad</th>
	                  <th className="border px-1 py-0.5 text-right">Melkøya</th>
	                  <th className="border px-1 py-0.5 text-right">Sture</th>
	                  <th className="border px-1 py-0.5 text-right">Kårstø</th>
	                  <th className="border px-1 py-0.5 text-right">Nyhamna</th>
	                  <th className="border px-1 py-0.5 text-right">Los øvrig (båt)</th>
	                  <th className="border px-1 py-0.5 text-right">Los øvrig (rigg)</th>
	                </tr>
	              </thead>
	              <tbody>
	                {MANUAL_2025_MONTHLY_STATS.map((m) => (
	                  <tr key={`${m.year}-${m.month}`}>
	                    <td className="border px-1 py-0.5 whitespace-nowrap">
	                      {m.label}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.totalBoats}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.totalRigs}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.boatToBoatOps}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.mongstad}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.melkoya}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.sture}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.karsto}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.nyhamna}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.losOvrigBoats}
	                    </td>
	                    <td className="border px-1 py-0.5 text-right">
	                      {m.locations.losOvrigRigs}
	                    </td>
	                  </tr>
	                ))}
	              </tbody>
	              <tfoot>
	                <tr className="font-semibold bg-gray-50">
	                  <td className="border px-1 py-0.5 text-left">Sum 2025</td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.totalBoats}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.totalRigs}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.boatToBoatOps}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.mongstad}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.melkoya}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.sture}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.karsto}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.nyhamna}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.losOvrigBoats}
	                  </td>
	                  <td className="border px-1 py-0.5 text-right">
	                    {MANUAL_2025_TOTALS.locations.losOvrigRigs}
	                  </td>
	                </tr>
	              </tfoot>
	            </table>
	          </div>
	        </section>

        <p className="text-xs text-gray-500">
          <Link href="/" className="underline">
            Tilbake til forsiden
          </Link>
        </p>
      </main>
    </div>
  );
}
