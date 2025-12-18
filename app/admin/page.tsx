"use client";

import { useEffect, useState, FormEvent } from "react";

const ADMIN_STORAGE_KEY = "airliftlos_admin";
const ADMIN_PASSWORD = "annegrethe";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    setUnlocked(stored === "ok");
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password === ADMIN_PASSWORD) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ADMIN_STORAGE_KEY, "ok");
      }
      setUnlocked(true);
      setError(null);
      setPassword("");
    } else {
      setError("Feil passord. Prøv igjen.");
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
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
            Du er logget inn som admin. Her vil du etter hvert finne månedsskjema,
            verifisering og statistikk for LOS-oppdrag.
          </p>
        </header>

        <section className="space-y-2 text-sm text-gray-700">
          <p>
            I neste steg legger vi inn:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
            <li>Oversikt over alle oppdrag måned for måned, med avkrysning og låsing.</li>
            <li>Mulighet for å lukke en måned og sende PDF til Kystverket og Fedje.</li>
            <li>En egen knapp for statestikk med nøkkeltall og e-postutsending.</li>
          </ul>
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

