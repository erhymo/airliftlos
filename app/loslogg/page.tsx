import Link from "next/link";
import { getDb } from "../../lib/firebaseAdmin";

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

		bookings = snapshot.docs.map((doc) => {
			const data = doc.data() as {
				vesselName?: string;
				date?: string;
				fromLocation?: string | null;
				toLocation?: string | null;
			};

			return {
				id: doc.id,
				vesselName: data.vesselName ?? "Ukjent fartøy",
				date: data.date ?? new Date().toISOString().slice(0, 10),
				fromLocation: data.fromLocation ?? null,
				toLocation: data.toLocation ?? null,
			};
		});
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

					<section className="space-y-3">
						<div className="space-y-2">
							{displayBookings.map((booking) => (
								<Link
									key={booking.id}
									href={`/loslogg/${booking.id}`}
									className="flex items-center rounded-lg border border-gray-200 bg-blue-50 px-4 py-3 text-sm hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
								>
									<div className="flex w-full items-center justify-between gap-3">
										<div className="space-y-0.5">
											<p className="text-base font-semibold tracking-wide">{booking.vesselName}</p>
											<p className="text-xs text-gray-600">{formatDate(booking.date)}</p>
										</div>
										{(booking.fromLocation || booking.toLocation) && (
											<div className="text-right text-xs text-gray-700">
												<p className="font-medium truncate max-w-[120px]">
													{booking.fromLocation ?? ""}
												</p>
												<p className="text-[11px] text-gray-500 truncate max-w-[120px]">
													{booking.toLocation ? `→ ${booking.toLocation}` : ""}
												</p>
											</div>
										)}
									</div>
								</Link>
							))}
						</div>
					</section>

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
