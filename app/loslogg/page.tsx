import Link from "next/link";
import { getDb } from "../../lib/firebaseAdmin";
import { getOpenLosBookingsSnapshot, isOpenLosBooking } from "../../lib/losBookings";
import { getOrCreateLosBookingsMeta } from "../../lib/losBookingsMeta";
import LosLoggClient from "./LosLoggClient";

export const dynamic = "force-dynamic";

type DisplayBooking = {
	id: string;
	vesselName: string;
	date: string;
	scheduledTime?: string | null;
	fromLocation?: string | null;
	toLocation?: string | null;
};

	export default async function LosLoggHome() {
		let bookings: DisplayBooking[] = [];
			let initialVersion = 0;

		try {
					const db = getDb();
					const [meta, snapshot] = await Promise.all([
						getOrCreateLosBookingsMeta(db),
						getOpenLosBookingsSnapshot(db),
					]);
					initialVersion = meta.version;

					bookings = snapshot.docs.reduce<DisplayBooking[]>((acc, doc) => {
						const data = doc.data() as {
							vesselName?: string;
							date?: string;
						scheduledTime?: string | null;
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
							if (!isOpenLosBooking(data)) {
							return acc;
						}

						acc.push({
							id: doc.id,
							vesselName: data.vesselName ?? "Ukjent fartøy",
							date: data.date ?? new Date().toISOString().slice(0, 10),
						scheduledTime: data.scheduledTime ?? null,
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

				<LosLoggClient initialBookings={bookings} initialVersion={initialVersion} />

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
