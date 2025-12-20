"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessTokenFromStorage } from "../../lib/clientAuth";

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
        const token = getAccessTokenFromStorage();
        const now = new Date();
        const year = now.getFullYear();
        const month = 12; // Desember
        const url = `/api/statistics?year=${year}&month=${month}`;

        const res = await fetch(url, {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

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
            Foreløpig viser vi fordeling av ferdigbehandlede LOS-oppdrag i desember
            etter bruttotonnasje (GT). Senere kan vi bygge ut per måned og per år.
          </p>
        </header>

        {loading && <p className="text-sm text-gray-500">Henter statistikk …</p>}
        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && stats && (
          <section className="space-y-3 text-sm text-gray-800">
            <p>
              Antall lukkede LOS-oppdrag i desember {stats.year} med registrert GT: {" "}
              {stats.totalWithGt} (av totalt {stats.totalClosed} lukkede oppdrag i desember).
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>{"<"} 30 000 tonn: {stats.buckets.under30000}</li>
              <li>30 000 – 60 000 tonn: {stats.buckets.between30000And60000}</li>
              <li>60 000 – 90 000 tonn: {stats.buckets.between60000And90000}</li>
              <li>90 000 – 120 000 tonn: {stats.buckets.between90000And120000}</li>
              <li>{">="} 120 000 tonn: {stats.buckets.over120000}</li>
            </ul>
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
