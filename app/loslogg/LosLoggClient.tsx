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
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("nb-NO");

function supportsNotifications() {
	if (typeof window === "undefined") return false;
	return "Notification" in window;
}

export default function LosLoggClient({ initialBookings }: Props) {
	const [bookings, setBookings] = useState<DisplayBooking[]>(initialBookings);
	const [notificationsEnabled, setNotificationsEnabled] = useState(false);
	const [notificationsSupported, setNotificationsSupported] = useState(true);

	useEffect(() => {
		if (!supportsNotifications()) {
			setNotificationsSupported(false);
			return;
		}
		setNotificationsSupported(true);
		if (Notification.permission === "granted") {
			setNotificationsEnabled(true);
		}
	}, []);

	const handleEnableNotifications = async () => {
		if (!supportsNotifications()) return;

		if (Notification.permission === "granted") {
			setNotificationsEnabled(true);
			return;
		}

		if (Notification.permission === "denied") {
			setNotificationsEnabled(false);
			return;
		}

		const result = await Notification.requestPermission();
		setNotificationsEnabled(result === "granted");
	};

	useEffect(() => {
		let cancelled = false;
		let knownIds = new Set(initialBookings.map((b) => b.id));

		async function poll() {
			if (cancelled) return;
			try {
				const res = await fetch("/api/los-bookings", { cache: "no-store" });
				if (!res.ok) return;

				const data = (await res.json()) as { bookings?: Array<Record<string, unknown>> };
				const raw = data.bookings ?? [];

				const mapped: DisplayBooking[] = raw.map((doc) => {
					const vesselName = (doc.vesselName as string | undefined) ?? "Ukjent fartøy";
					const date =
						(doc.date as string | undefined) ?? new Date().toISOString().slice(0, 10);
					const fromLocation = (doc.fromLocation as string | null | undefined) ?? null;
					const toLocation = (doc.toLocation as string | null | undefined) ?? null;
					const id = doc.id as string;

					return { id, vesselName, date, fromLocation, toLocation };
				});

				const newOnes = mapped.filter((b) => !knownIds.has(b.id));

				if (
					newOnes.length > 0 &&
					supportsNotifications() &&
					notificationsEnabled &&
					Notification.permission === "granted"
				) {
					for (const booking of newOnes) {
						try {
							new Notification("Ny LOS-bestilling", {
								body: `${booking.vesselName} – ${formatDate(booking.date)}`,
								tag: booking.id,
							});
						} catch {
							// Ignorer evt. feil fra Notification API
						}
					}
				}

				if (!cancelled) {
					// Oppdater alltid listen – også når den er tom – slik at
					// ferdigbehandlede bestillinger forsvinner fra UI-et.
					setBookings(mapped);
					knownIds = new Set(mapped.map((b) => b.id));
				}
			} catch {
				// Ignorer nettverksfeil
			} finally {
				if (!cancelled) {
					setTimeout(poll, 60_000);
				}
			}
		}

		poll();

		return () => {
			cancelled = true;
		};
	}, [initialBookings, notificationsEnabled]);

	const displayBookings = bookings;

	return (
		<section className="space-y-3">
			<div className="space-y-2 text-xs text-gray-600">
				<p>
					Hvis denne enheten tillater det, kan du få varsel når en ny LOS-bestilling dukker opp i
					listen under.
				</p>
				{notificationsSupported ? (
					<button
						type="button"
						onClick={handleEnableNotifications}
						className="inline-flex items-center rounded-full border border-blue-500 px-3 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
					>
						{notificationsEnabled ? "Varsler er slått på" : "Slå på varsler for nye bestillinger"}
					</button>
				) : (
					<p>Varsler støttes ikke av denne nettleseren/enheten.</p>
				)}
			</div>

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
