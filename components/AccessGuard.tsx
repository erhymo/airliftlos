"use client";

import { useState } from "react";

interface Props {
  children: React.ReactNode;
}

export function AccessGuard({ children }: Props) {
	  const [unlocked, setUnlocked] = useState<boolean | null>(() => {
	    if (typeof window === "undefined") return null;
	    try {
	      const stored = window.localStorage.getItem("airliftlos_access");
	      return stored === "ok";
	    } catch {
	      return false;
	    }
	  });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        setError("Feil kode. Prv igjen.");
        setSubmitting(false);
        return;
      }

      // Mark	r denne nettleseren/telefonen som godkjent
      if (typeof window !== "undefined") {
        window.localStorage.setItem("airliftlos_access", "ok");
      }
      setUnlocked(true);
    } catch {
      setError("Kunne ikke verifisere koden. Sjekk nett og prv igjen.");
      setSubmitting(false);
    }
  }

  if (unlocked === null) {
    // Unng srk flicker mens vi sjekker localStorage
    return null;
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">LOS Helikopter</h1>
          <p className="text-sm text-gray-600">
            Oppsett for rapport-appen. Skriv inn oppsettkoden du har f tt
            utdelt for  g bruke denne telefonen.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Oppsettkode
            </label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-base text-gray-900"
              placeholder="Skriv kode"
              autoComplete="off"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !code}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-base font-medium disabled:opacity-60"
          >
            {submitting ? "Sjekker kode..." : "L s opp denne telefonen"}
          </button>
        </form>

        <p className="text-xs text-gray-500">
          Koden trenger bare  taste inn  n gang per telefon. Nr den er
          godkjent kan alle som bruker denne telefonen sende
          vakt-/driftsrapporter.
        </p>
      </main>
    </div>
  );
}

