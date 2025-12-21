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

export default function StatistikkPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

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
            Ferdigbehandlede LOS-oppdrag i desember, fordelt på bruttotonnasje
            (GT) per base.
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

        <p className="text-xs text-gray-500">
          <Link href="/" className="underline">
            Tilbake til forsiden
          </Link>
        </p>
      </main>
    </div>
  );
}
