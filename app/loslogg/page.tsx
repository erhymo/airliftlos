import Link from "next/link";
import { getDb } from "../../lib/firebaseAdmin";
import LosLoggClient from "./LosLoggClient";

// Sørg for at denne siden alltid henter ferske data fra Firestore
// (ikke statisk bygges eller caches for lenge).
export const dynamic = "force-dynamic";

type DisplayBooking = {
	id: string;
	vesselName: string;
	date: string;
	fromLocation?: string | null;
	toLocation?: string | null;
};

	export default async function LosLoggHome() {
		let bookings: DisplayBooking[] = [];

		try {
				const db = getDb();
				let snapshot;

				// Forsøk først en mer effektiv spørring som bare henter åpne bestillinger.
				// Hvis den feiler (f.eks. manglende indeks i Firestore), faller vi trygt
				// tilbake til den opprinnelige spørringen som henter alle dokumenter.
				try {
						snapshot = await db
							.collection("losBookings")
							.where("status", "==", "open")
							.orderBy("createdAt", "desc")
							.get();
				} catch (innerError) {
						console.error(
							"LOS-logg: optimalisert Firestore-spørring for åpne bestillinger feilet, bruker fallback som henter alle dokumenter",
							innerError,
						);
						snapshot = await db
							.collection("losBookings")
							.orderBy("createdAt", "desc")
							.get();
				}

					bookings = snapshot.docs.reduce<DisplayBooking[]>((acc, doc) => {
						const data = doc.data() as {
							vesselName?: string;
							date?: string;
							fromLocation?: string | null;
							toLocation?: string | null;
							status?: string | null;
						};

						// Vis bare åpne bestillinger. De som har fått LOS-logg sendt til Excel blir
						// merket med status "closed" i Firestore, og kansellerte bestillinger får
						// status "cancelled". Begge skjules her.
						// Selv om spørringen over allerede filtrerer på status="open",
						// beholder vi denne sjekken for å sikre samme oppførsel hvis
						// spørringen skulle endres senere.
						if (data.status === "closed" || data.status === "cancelled") {
							return acc;
						}

						acc.push({
							id: doc.id,
							vesselName: data.vesselName ?? "Ukjent fartøy",
							date: data.date ?? new Date().toISOString().slice(0, 10),
							fromLocation: data.fromLocation ?? null,
							toLocation: data.toLocation ?? null,
						});
						return acc;
					}, []);
			} catch (error) {
				console.error("Klarte ikke å hente los-bookinger fra Firestore", error);
			}

		return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
					<header className="space-y-1">
						<div className="flex items-center justify-between gap-2">
							<h1 className="text-lg font-semibold">LOS-logg</h1>
							<Link
								href="/loslogg/arkiv"
								className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
							>
								Arkiv
							</Link>
						</div>
						<p className="text-sm text-gray-600">
							Her ser du åpne LOS-bestillinger fra Kystverket. Velg en bestilling, kontroller forhåndsutfylt info,
							fyll ut resten og trykk «Send LOS-logg». Når du sender, oppdateres LOS-logg og status i appen automatisk.
						</p>
					</header>

				<LosLoggClient initialBookings={bookings} />

					<div className="pt-2">
						<Link
							href="/"
							className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
						>
							Tilbake til forsiden
						</Link>
					</div>
			</main>
		</div>
	);
}
