"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DisplayBooking = {
	id: string;
	vesselName: string;
	date: string;
	fromLocation?: string | null;
	toLocation?: string | null;
};

type Props = {
	initialBookings: DisplayBooking[];
	initialVersion: number;
};

type MetaResponse = {
	meta?: {
		version?: number;
	};
};

type BookingsResponse = {
	bookings?: Array<Record<string, unknown>>;
};

const POLL_INTERVAL_MS = 120_000;

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("nb-NO");

function mapApiBookings(raw: Array<Record<string, unknown>>): DisplayBooking[] {
	return raw.map((doc) => {
		const vesselName = (doc.vesselName as string | undefined) ?? "Ukjent fartøy";
		const date = (doc.date as string | undefined) ?? new Date().toISOString().slice(0, 10);
		const fromLocation = (doc.fromLocation as string | null | undefined) ?? null;
		const toLocation = (doc.toLocation as string | null | undefined) ?? null;
		const id = doc.id as string;

		return { id, vesselName, date, fromLocation, toLocation };
	});
}


export default function LosLoggClient({ initialBookings, initialVersion }: Props) {
		const [bookings, setBookings] = useState<DisplayBooking[]>(initialBookings);

			useEffect(() => {
				setBookings(initialBookings);
			}, [initialBookings]);

		useEffect(() => {
		let cancelled = false;
			let knownVersion = initialVersion;
			let timeoutId: ReturnType<typeof setTimeout> | undefined;

			async function pollMeta() {
			if (cancelled) return;
			try {
					const metaRes = await fetch("/api/los-bookings/meta", { cache: "no-store" });
					if (!metaRes.ok) return;

					const metaData = (await metaRes.json()) as MetaResponse;
					const nextVersion =
						typeof metaData.meta?.version === "number" ? metaData.meta.version : knownVersion;

					if (nextVersion === knownVersion) {
						return;
					}

					const bookingsRes = await fetch("/api/los-bookings", { cache: "no-store" });
					if (!bookingsRes.ok) return;

					const data = (await bookingsRes.json()) as BookingsResponse;
					if (!cancelled) {
						// Oppdater alltid listen – også når den er tom – slik at
						// ferdigbehandlede bestillinger forsvinner fra UI-et.
						setBookings(mapApiBookings(data.bookings ?? []));
						knownVersion = nextVersion;
					}
			} catch {
				// Ignorer nettverksfeil
			} finally {
				if (!cancelled) {
						timeoutId = setTimeout(pollMeta, POLL_INTERVAL_MS);
				}
			}
		}

				void pollMeta();

			return () => {
				cancelled = true;
					if (timeoutId) {
						clearTimeout(timeoutId);
					}
			};
		}, [initialVersion]);

		const displayBookings = bookings;

	return (
		<section className="space-y-3">
			<div className="space-y-2">
				{displayBookings.length === 0 ? (
					<p className="text-xs text-gray-500">
						Ingen åpne LOS-bestillinger akkurat nå. Nye bestillinger dukker opp her automatisk.
					</p>
				) : (
					displayBookings.map((booking) => (
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
					))
				)}
			</div>
		</section>
	);
}
