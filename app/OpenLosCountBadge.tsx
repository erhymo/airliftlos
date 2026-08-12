"use client";

import { useEffect, useRef, useState } from "react";

type MetaResponse = { meta?: { openCount?: number } };

/**
 * Henter antall åpne LOS-bookinger på klienten og sjekker på nytt hver gang
 * appen kommer i forgrunnen igjen (visningen har vært skjult og blir synlig,
 * eller vinduet får fokus). Løser at man tidligere måtte laste siden på nytt
 * manuelt for å se om det hadde kommet inn en bestilling mens appen lå i
 * bakgrunnen. Kallet er ett lite, raskt Firestore-oppslag og skjer i
 * bakgrunnen uten å blokkere noe i grensesnittet.
 */
export default function OpenLosCountBadge() {
	const [count, setCount] = useState<number | null>(null);
	const fetchingRef = useRef(false);

	useEffect(() => {
		async function refresh() {
			if (fetchingRef.current) return;
			fetchingRef.current = true;
			try {
				const res = await fetch("/api/los-bookings/meta", { cache: "no-store" });
				if (!res.ok) return;
				const data = (await res.json()) as MetaResponse;
				if (typeof data.meta?.openCount === "number") {
					setCount(data.meta.openCount);
				}
			} catch {
				// Ignorer nettverksfeil, behold forrige kjente tall inntil neste forsøk
			} finally {
				fetchingRef.current = false;
			}
		}

		void refresh();

		function handleVisible() {
			if (document.visibilityState === "visible") void refresh();
		}

		document.addEventListener("visibilitychange", handleVisible);
		window.addEventListener("focus", handleVisible);
		return () => {
			document.removeEventListener("visibilitychange", handleVisible);
			window.removeEventListener("focus", handleVisible);
		};
	}, []);

	if (!count || count <= 0) return null;

	return (
		<span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
			{count}
		</span>
	);
}
