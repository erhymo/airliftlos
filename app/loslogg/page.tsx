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
			const snapshot = await db
				.collection("losBookings")
				.orderBy("createdAt", "desc")
				.get();

			bookings = snapshot.docs.reduce<DisplayBooking[]>((acc, doc) => {
				const data = doc.data() as {
					vesselName?: string;
					date?: string;
					fromLocation?: string | null;
					toLocation?: string | null;
					status?: string | null;
				};

				// Vis bare åpne bestillinger. De som har fått LOS-logg sendt til Excel blir
				// merket med status "closed" i Firestore og skjules her.
				if (data.status === "closed") {
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
					<h1 className="text-lg font-semibold">LOS-logg</h1>
					<p className="text-sm text-gray-600">
						Her ser du åpne LOS-bestillinger fra Kystverket som venter på at LOS-logg fylles ut.
					</p>
				</header>

				<LosLoggClient initialBookings={bookings} />

				<div className="pt-2">
					<Link
						href="/"
						className="text-sm text-blue-600 hover:text-blue-700 underline"
					>
						Tilbake til forsiden
					</Link>
				</div>
			</main>
		</div>
	);
}
