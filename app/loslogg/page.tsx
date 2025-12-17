import Link from "next/link";
import { getDb } from "../../lib/firebaseAdmin";
import LosLoggClient from "./LosLoggClient";

type DisplayBooking = {
	id: string;
	vesselName: string;
	date: string;
	fromLocation?: string | null;
	toLocation?: string | null;
};

	const mockBookings: DisplayBooking[] = [
	{
		id: "sola-ts-demo",
		vesselName: "SOLA TS",
		date: "2025-01-03",
		fromLocation: null,
		toLocation: null,
	},
	];

	const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("nb-NO");

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

		const displayBookings = bookings.length > 0 ? bookings : mockBookings;

		return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
				<header className="space-y-1">
					<h1 className="text-lg font-semibold">LOS-logg</h1>
						<p className="text-sm text-gray-600">
									Denne siden skal brukes til automatisk utfylling av LOS-logg fra bestillingsmail.
									Foreløpig viser vi enten åpne bestillinger (hvis noen finnes) eller en demo-bestilling.
						</p>
				</header>

					<LosLoggClient initialBookings={displayBookings} />

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
