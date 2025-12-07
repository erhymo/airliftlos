"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CAPTAINS, FIRST_OFFICERS } from "../../vaktapp/components/CrewPicker";

const MOCK_BOOKING = {
	id: "sola-ts-demo",
	vesselName: "SOLA TS",
	date: "2025-01-03",
	orderNumber: "123456",
	base: "Bergen",
	pilots: ["Los 1", "Los 2"],
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("nb-NO");

type Location = "Mongstad" | "Sture" | "Melkøya" | "Kårstø" | "Los øvrig" | "Nyhamna";
type LosType = "Båt" | "Rigg";

export default function LosLoggBookingPage() {
			const params = useParams<{ id: string }>();
			const [booking, setBooking] = useState(MOCK_BOOKING);
			const [loadingBooking, setLoadingBooking] = useState(true);
			const [bookingError, setBookingError] = useState<string | null>(null);

			const [step, setStep] = useState(0);
	const [techlogNumber, setTechlogNumber] = useState(90377);
	const [location, setLocation] = useState<Location | null>(null);
	const [losType, setLosType] = useState<LosType | null>(null);
	const [shipLanding, setShipLanding] = useState(false);
	const [tokeBomtur, setTokeBomtur] = useState(false);
		const [losToAirportCount, setLosToAirportCount] = useState<number | null>(null);
		const [enfjLandings, setEnfjLandings] = useState<number | null>(null);
	const [hoistCount, setHoistCount] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [sign, setSign] = useState("");
		const [hasSent, setHasSent] = useState(false);
		const [sending, setSending] = useState(false);
		const [sendError, setSendError] = useState<string | null>(null);

		useEffect(() => {
			async function loadBooking() {
				try {
					const id = (params as { id?: string }).id;
					if (!id) {
						setLoadingBooking(false);
						return;
					}

					const res = await fetch(`/api/los-bookings?id=${id}`);
					if (!res.ok) {
						console.warn(
							"Klarte ikke ae hente los-booking, bruker demo-data i stedet",
							res.status,
						);
						setLoadingBooking(false);
						return;
					}

					const data = (await res.json()) as { booking?: Partial<typeof MOCK_BOOKING> & { id: string } };
					if (data.booking) {
						setBooking({
							id: data.booking.id,
							vesselName: data.booking.vesselName ?? MOCK_BOOKING.vesselName,
							date: data.booking.date ?? MOCK_BOOKING.date,
							orderNumber: data.booking.orderNumber ?? MOCK_BOOKING.orderNumber,
							base: data.booking.base ?? MOCK_BOOKING.base,
							pilots:
								Array.isArray(data.booking.pilots) && data.booking.pilots.length > 0
									? (data.booking.pilots as string[])
									: MOCK_BOOKING.pilots,
						});
					}
				} catch (error) {
					console.error("Klarte ikke ae hente los-booking", error);
					setBookingError("Klarte ikke ae hente bestilling. Viser demo-data.");
				} finally {
					setLoadingBooking(false);
				}
			}

			loadBooking();
		}, [params]);

	const signers = useMemo(
		() => [...CAPTAINS, ...FIRST_OFFICERS].sort((a, b) => a.localeCompare(b, "nb-NO")),
		[],
	);

		const canGoNext = () => {
			switch (step) {
				case 0:
					return true; // bare gjennomse auto-info
				case 1:
					return techlogNumber > 0;
				case 2:
					return location !== null;
				case 3:
					return losType !== null;
					case 4:
						return true; // ship landing / tåke / LOS til flyplass er valgfrie
					case 5:
						return true; // antall landinger ENFJ kan være tomt
				case 6:
					return hoistCount !== null;
				case 7:
					return true; // kommentar kan være tom
				case 8:
					return sign.length === 3;
				case 9:
					return true; // oppsummering, her bruker vi egen «Send»
				default:
					return false;
			}
		};

			const handleNext = () => {
			if (!canGoNext()) return;
				setStep((s) => Math.min(s + 1, 9));
		};

	const handlePrev = () => {
		setStep((s) => Math.max(s - 1, 0));
	};

		const handleSend = async () => {
			if (hasSent || sending) return;
			setSending(true);
			setSendError(null);
			try {
				const res = await fetch("/api/los-logg", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						bookingId: booking.id,
						date: booking.date,
						orderNumber: booking.orderNumber,
						vesselName: booking.vesselName,
						base: booking.base,
						pilots: booking.pilots,
						techlogNumber,
						location,
						losType,
						shipLanding,
						tokeBomtur,
						losToAirportCount,
						enfjLandings,
						hoistCount,
						comment,
						sign,
					}),
				});
				if (!res.ok) {
					let message = "Klarte ikke å sende LOS-logg.";
					try {
						const data = (await res.json()) as { error?: string };
						if (data.error) message = data.error;
					} catch {
						// ignorér JSON-feil
					}
					setSendError(message);
					return;
				}
				setHasSent(true);
			} catch (error) {
				console.error("Klarte ikke å sende LOS-logg", error);
				setSendError("Klarte ikke å sende LOS-logg.");
			} finally {
				setSending(false);
			}
		};

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
					<header className="space-y-1">
						<h1 className="text-lg font-semibold">LOS-logg – {booking.vesselName}</h1>
								<p className="text-xs text-gray-500">Steg {step + 1} av 10</p>
							{loadingBooking && (
								<p className="text-[11px] text-gray-500">Henter bestilling…</p>
							)}
							{bookingError && !loadingBooking && (
								<p className="text-[11px] text-red-600">{bookingError}</p>
							)}
				</header>

				{/* Steg 0: auto-info */}
				{step === 0 && (
					<section className="space-y-2">
						<h2 className="text-sm font-medium text-gray-700">Data fra bestillingsmail (demo)</h2>
						<dl className="space-y-1 text-sm">
								<div className="flex justify-between">
									<dt className="text-gray-600">Dato</dt>
									<dd className="font-medium">{formatDate(booking.date)}</dd>
								</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Ordrenr.</dt>
								<dd className="font-medium">{booking.orderNumber}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Fartøy</dt>
								<dd className="font-medium">{booking.vesselName}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Base</dt>
								<dd className="font-medium">{booking.base}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Los(er)</dt>
								<dd className="font-medium">{booking.pilots.join(", ")}</dd>
							</div>
						</dl>
						<p className="text-xs text-gray-500">
							Senere vil disse feltene fylles automatisk fra bestillingsmailen fra Kystverket.
						</p>
					</section>
				)}

				{/* Steg 1: techlognummer */}
				{step === 1 && (
					<section className="space-y-3">
						<h2 className="text-base sm:text-lg font-semibold text-gray-800">Techlognummer</h2>
						<div className="space-y-1 text-sm">
							<label className="flex items-center justify-between gap-3">
								<span className="text-base font-semibold text-gray-800">Techlognummer</span>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setTechlogNumber((n) => Math.max(0, n - 1))}
										className="h-9 w-9 rounded-md border border-gray-300 bg-gray-50 text-base font-semibold text-gray-700 hover:bg-gray-100"
									>
										-
									</button>
									<input
										type="number"
										inputMode="numeric"
										className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-right text-lg font-semibold tracking-wide"
										value={techlogNumber}
										onChange={(e) => {
											const value = parseInt(e.target.value, 10);
											if (!Number.isNaN(value)) {
												setTechlogNumber(value);
											}
										}}
									/>
									<button
										type="button"
										onClick={() => setTechlogNumber((n) => n + 1)}
										className="h-9 w-9 rounded-md border border-gray-300 bg-gray-50 text-base font-semibold text-gray-700 hover:bg-gray-100"
									>
										+
									</button>
								</div>
							</label>
							<p className="text-xs text-gray-500">
								Foreløpig er techlognummeret hardkodet til 90377 som startverdi for testing. Senere
									skal dette fylles automatisk med siste brukte nummer.
							</p>
						</div>
					</section>
				)}

				{/* Steg 2: sted */}
				{step === 2 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Sted</h2>
						<div className="space-y-2">
							{["Mongstad", "Sture", "Melkøya", "Kårstø", "Los øvrig", "Nyhamna"].map(
									(sted) => (
										<button
											key={sted}
											type="button"
											onClick={() => setLocation(sted as Location)}
											className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${
												location === sted
													? "bg-blue-50 border-blue-500 text-blue-900"
													: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
											}`}
										>
											{sted}
										</button>
									),
								)}
						</div>
					</section>
				)}

				{/* Steg 3: type */}
				{step === 3 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Type</h2>
						<div className="space-y-2">
							{["Båt", "Rigg"].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setLosType(t as LosType)}
									className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${
										losType === t
											? "bg-blue-50 border-blue-500 text-blue-900"
											: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
									}`}
								>
									{t}
								</button>
							))}
						</div>
					</section>
				)}

				{/* Steg 4: Ship landing / tåke / LOS til flyplass (valgfrie) */}
				{step === 4 && (
					<section className="space-y-4">
						<h2 className="text-sm font-medium text-gray-700">Ship landing / tåke / LOS til flyplass</h2>
						<div className="space-y-3">
							<div className="space-y-1">
								<button
									type="button"
									onClick={() => setShipLanding((v) => !v)}
									className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${
										shipLanding
											? "bg-blue-50 border-blue-500 text-blue-900"
											: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
									}`}
								>
									Ship landing
								</button>
								<p className="text-xs text-gray-500">
									Hvis du ikke trykker på noe her og går videre, registreres det som «ikke ship
									landing».
								</p>
							</div>
							<div className="space-y-1">
								<button
									type="button"
									onClick={() => setTokeBomtur((v) => !v)}
									className={`w-full text-left px-4 py-3 rounded-xl border text-sm ${
										tokeBomtur
											? "bg-blue-50 border-blue-500 text-blue-900"
											: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
									}`}
								>
									Tåke/bomtur ship
								</button>
								<p className="text-xs text-gray-500">
									Hvis du ikke trykker på noe her og går videre, registreres det som «nei».
								</p>
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-gray-700">Antall LOS til flyplass (valgfritt)</p>
								<div className="grid grid-cols-4 gap-2">
									{[1, 2, 3, 4].map((n) => (
										<button
											key={n}
											type="button"
											onClick={() => setLosToAirportCount(n)}
											className={`py-2 rounded-xl border text-sm ${
												losToAirportCount === n
													? "bg-blue-50 border-blue-500 text-blue-900"
													: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
											}`}
										>
											{n}
										</button>
									))}
								</div>
								<p className="text-xs text-gray-500">
									Hvis du ikke velger noe her, blir feltet tomt i Excel.
								</p>
							</div>
						</div>
					</section>
				)}

				{/* Steg 5: antall landinger ENFJ */}
				{step === 5 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Antall landinger ENFJ</h2>
						<div className="grid grid-cols-4 gap-2">
							{[1, 2, 3, 4].map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setEnfjLandings(n)}
									className={`py-2 rounded-xl border text-sm ${
										enfjLandings === n
											? "bg-blue-50 border-blue-500 text-blue-900"
											: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
									}`}
								>
									{n}
								</button>
							))}
						</div>
					</section>
				)}

				{/* Steg 6: antall hoist */}
				{step === 6 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Antall hoist</h2>
						<div className="grid grid-cols-4 gap-2">
							{[1, 2, 3, 4].map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setHoistCount(n)}
									className={`py-2 rounded-xl border text-sm ${
										hoistCount === n
										? "bg-blue-50 border-blue-500 text-blue-900"
										: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
									}`}
								>
									{n}
								</button>
							))}
						</div>
					</section>
				)}

				{/* Steg 7: kommentar */}
				{step === 7 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Kommentar</h2>
						<textarea
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							rows={3}
							className="w-full border rounded-xl p-3 text-sm text-gray-900"
							placeholder="Skriv eventuelt kommentar her"
						/>
						<button
							type="button"
							onClick={() => setComment("BÅT TIL BÅT")}
							className="w-full px-4 py-2 rounded-xl border border-gray-300 bg-gray-50 text-sm font-medium text-gray-900 hover:bg-gray-100"
						>
							BÅT TIL BÅT
						</button>
						<p className="text-xs text-gray-500">
							Trykk på «BÅT TIL BÅT» for å fylle inn standardtekst i kommentarfeltet.
						</p>
					</section>
				)}

				{/* Steg 8: signering (kapteiner + styrmenn) */}
				{step === 8 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Signering</h2>
						<p className="text-xs text-gray-600">
							Velg kaptein/styrmann. Vi viser samme database som vaktrapporten, men kun
							kapteiner og styrmenn.
						</p>
						<div className="grid grid-cols-3 gap-2">
							{signers.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => setSign(s)}
									className={`py-2 rounded-xl border text-sm ${
										sign === s
											? "bg-blue-50 border-blue-500 text-blue-900"
											: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
									}`}
								>
									{s}
								</button>
							))}
						</div>
						{sign && (
							<p className="text-xs text-gray-700">Valgt sign: {sign}</p>
						)}
					</section>
				)}

				{/* Steg 9: oppsummering */}
				{step === 9 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Oppsummering</h2>
						<dl className="space-y-1 text-sm">
							<div className="flex justify-between">
								<dt className="text-gray-600">Fartøy</dt>
								<dd className="font-medium">{booking.vesselName}</dd>
							</div>
								<div className="flex justify-between">
									<dt className="text-gray-600">Dato</dt>
									<dd className="font-medium">{formatDate(booking.date)}</dd>
								</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Ordrenr.</dt>
								<dd className="font-medium">{booking.orderNumber}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Techlog</dt>
								<dd className="font-medium">{techlogNumber}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Sted</dt>
								<dd className="font-medium">{location ?? "–"}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Type</dt>
								<dd className="font-medium">{losType ?? "–"}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Ship landing</dt>
								<dd className="font-medium">{shipLanding ? "Ja" : "Nei"}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Tåke/bomtur ship</dt>
								<dd className="font-medium">{tokeBomtur ? "Ja" : "Nei"}</dd>
							</div>
							<div className="flex justify-between">
									<dt className="text-gray-600">LOS til flyplass</dt>
									<dd className="font-medium">{losToAirportCount ?? "–"}</dd>
								</div>
								<div className="flex justify-between">
								<dt className="text-gray-600">Landinger ENFJ</dt>
								<dd className="font-medium">{enfjLandings ?? "–"}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Hoist</dt>
								<dd className="font-medium">{hoistCount ?? "–"}</dd>
							</div>
							<div className="space-y-1">
								<dt className="text-gray-600">Kommentar</dt>
								<dd className="font-medium whitespace-pre-wrap min-h-[1.5rem]">
									{comment || "(ingen)"}
								</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Sign</dt>
								<dd className="font-medium">{sign || "–"}</dd>
							</div>
						</dl>
							{sendError && (
								<p className="text-xs text-red-700">{sendError}</p>
							)}
							{hasSent && !sendError && (
								<p className="text-xs text-green-700">LOS-logg er sendt til Excel-loggen.</p>
							)}
						<button
							type="button"
							onClick={handleSend}
							className="mt-2 w-full px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
								disabled={hasSent || sending}
						>
								{sending ? "Sender…" : hasSent ? "Sendt" : "Send LOS-logg"}
						</button>
					</section>
				)}

				{/* Navigasjonsknapper */}
				<div className="pt-2 flex justify-between text-sm">
					<button
						type="button"
						onClick={handlePrev}
						className="px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-900 disabled:opacity-40"
						disabled={step === 0}
					>
						Forrige
					</button>
					<button
						type="button"
						onClick={handleNext}
						className="px-4 py-1.5 rounded-full bg-black text-white disabled:bg-gray-300 disabled:text-gray-600"
								disabled={!canGoNext() || step === 9}
					>
						Neste
					</button>
				</div>

				<div className="pt-2 flex justify-between text-xs text-gray-500">
					<Link href="/loslogg" className="hover:underline">
						Tilbake til LOS-logg
					</Link>
					<Link href="/" className="hover:underline">
						Forsiden
					</Link>
				</div>
			</main>
		</div>
	);
}
