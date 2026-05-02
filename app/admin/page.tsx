"use client";

import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";

const ADMIN_STORAGE_KEY = "airliftlos_admin";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		let cancelled = false;
		const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
		if (stored !== "ok") {
			const timeout = window.setTimeout(() => setUnlocked(false), 0);
			return () => window.clearTimeout(timeout);
		}

		fetch("/api/admin/access", { cache: "no-store" })
			.then((res) => {
				if (cancelled) return;
				if (res.ok) {
					setUnlocked(true);
				} else {
					window.localStorage.removeItem(ADMIN_STORAGE_KEY);
					setUnlocked(false);
				}
			})
			.catch(() => {
				if (cancelled) return;
				setUnlocked(false);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		try {
			const res = await fetch("/api/admin/access", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password }),
			});

			if (!res.ok) {
				setError("Feil passord. Prøv igjen.");
				return;
			}

			if (typeof window !== "undefined") {
				window.localStorage.setItem(ADMIN_STORAGE_KEY, "ok");
			}
			setUnlocked(true);
			setPassword("");
		} catch {
			setError("Kunne ikke logge inn. Sjekk nettverket og prøv igjen.");
		}
	};

	const handleLogout = () => {
		if (typeof window !== "undefined") {
			window.localStorage.removeItem(ADMIN_STORAGE_KEY);
		}
		void fetch("/api/admin/access", { method: "DELETE" });
		setUnlocked(false);
		setPassword("");
		setError(null);
	};

  if (unlocked === null) {
    return null;
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
        <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <header className="space-y-1">
            <h1 className="text-lg font-semibold">Admin / statistikk</h1>
            <p className="text-sm text-gray-600">
              Skriv inn admin-passord for å åpne skjulte oversikter og statistikk.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700">
                Passord
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="off"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-medium shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Logg inn
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">Admin / statistikk</h1>
          <p className="text-sm text-gray-600">
            Du er logget inn som admin. Her finner du månedsskjema og senere statistikk for LOS-oppdrag.
          </p>
        </header>

        <section className="space-y-3 text-sm text-gray-700">
          <p>Første byggekloss er klar:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
            <li>Månedsskjema med én linje per oppdrag (samme kolonner som i Excel).</li>
            <li>Månedsvelger øverst slik at du kan bla bakover i tid.</li>
          </ul>

          <div className="pt-1">
            <Link
              href="/admin/skjema"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Åpne månedsskjema
            </Link>
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Logg ut
          </button>
        </div>
      </main>
    </div>
  );
}
