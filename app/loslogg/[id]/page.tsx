"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CAPTAINS, FIRST_OFFICERS } from "../../vaktapp/components/CrewPicker";

const LAST_TECHLOG_STORAGE_KEY = "loslogg_last_techlog_number";

const LOS_NAMES: string[] = [
  "Anders Andrè Andersen",
  "Anders Melingen",
  "Anders Norstrand",
  "Anders Sangolt",
  "Are Aksnes",
  "Arild Lofthus",
  "Arne Gunnleiv Sæthre",
  "Arne Halvorsen",
  "Arnfinn Olav Remøy",
  "Arnt Egil Bjellvåg",
  "Arve Bjørnulf Bøe",
  "Arve Gangåssæter",
  "Asbjørn Austevoll",
  "Asbjørn Birkeli",
  "Audun Olsen",
  "Bent Elias Berntsen",
  "Bjarte Hindenes",
  "Bjarte Røksund",
  "Bjørn Helge Hjelmeland",
  "Bjørn Richard Abrahamsen",
  "Bjørnar Sæther",
  "Bård Magne Lunde",
  "Carl Ellingsen",
  "Christian Wilhelmsen",
  "Dag-Erik Kvalheim",
  "Dagfinn Fjeldstad",
  "Dagfinn Olsen",
  "Eirik Eriksen",
  "Eivind Sangolt",
  "Erlend Vik",
  "Espen Alsaker",
  "Espen Johnsen",
  "Frank-Roy Moltu",
  "Frode Arnesen",
  "Frode Møllerhaug",
  "Gaute Dyregro Haukeland",
  "Geir Bøe",
  "Geir Heggeset",
  "Geir Ognøy",
  "Geir Pettersen",
  "Geir Sigve Thorsen",
  "Geir-Arne Jensen",
  "Geirmund Stormark",
  "Gisle Aasebø",
  "Hallvard Nygård",
  "Halvard Grøneng",
  "Halvard Høydalsvik",
  "Hans-Arne Fylkesnes",
  "Hans Christian Ådlandsvik",
  "Harald Magne Bakken",
  "Helge Didriksen",
  "Holger Kåre Pettersen",
  "Håvar Sandvik",
  "Idar Moldøen",
  "Inge Johan Fagerheim",
  "Inge Olaissen",
  "Inge Ottar Sætrevik",
  "Jan Erik Fjeldsbø",
  "Jan Erik Lerum",
  "Jan I Nilsen",
  "Jan Kenneth Flygansvær",
  "Jan Magne Fosse",
  "Jan Ola Flåhammer",
  "Jan Ståle Sørensen",
  "Jan Terje Skåtevik",
  "Jan Vevatne",
  "John Petter Strand",
  "John Sigurd Torvik",
  "Jon Inge Nilsen",
  "Jon Aasberg",
  "Jon Sigurd Trovik",
  "Jostein Galtung",
  "Jostein Larsen",
	"Karl Andreas Njåstad",
	"Karl Helge Haagensen",
  "Karstein Helge Økland",
  "Ken Tommy Pettersen",
  "Kenneth Eilif Karlsen",
  "Kenneth Sandmo",
  "Kjell Arne Nes",
  "Kjell Evensen",
  "Kjell-Inge Telle",
  "Kjetil Magnussen",
  "Knut Arne Mikalsen",
  "Knut Egil Dyngeland",
  "Knut Inge Melingen",
  "Knut Steffensen",
	"Kristoffer Eidissen",
  "Kristian Bratthammer",
  "Kristian Valberg",
  "Lars Engvik",
  "Laurits Sund",
  "Leif Morten Slotvik",
  "Martin Jensen",
  "Martin Strømdahl",
  "Modstein Hansen",
  "Morten G. Urheim",
  "Morten Gunnar Telle",
  "Oddbjørn Snorre Hårsvær",
  "Odd Marvin Holberg",
  "Odd Roger Grinde",
  "Ola Moen",
  "Ole Andreas Vatle-Dahl",
  "Ole J. Henjesand",
  "Ole Magnus Benestvedt",
  "Ole Wille",
  "Onar Jøsang",
  "Ottar Eide",
  "Ove Arild Alfheim",
  "Ove Henning Smelvær",
  "Ove Valderhaug",
  "Per Herman Syre",
  "Per Morten Brennvik",
  "Remi Endre Hagenes",
  "Roger Notøy",
  "Roger Vik",
  "Rolf Magne Hausken",
  "Ronald Rydningen",
  "Ronny Stokkan",
  "Roy Pedersen",
  "Sigbjørn Tjoflot",
  "Sindre Myhre",
  "Solgunn Breivik Homme",
  "Staale Lemvig",
  "Stian Fonnes",
  "Stig Petter Midtbø",
  "Ståle Fagerstad",
  "Svein Austrheim",
  "Svein Boge",
  "Svein Egil Monsen",
  "Svein Henning Waagene",
  "Terje Mjølsvik",
  "Terje Sudmann",
  "Torbjørn Vinnes",
  "Tore Anton Årvik",
  "Tore Espeland",
  "Tore Hella",
  "Tore Lund",
  "Tore Nystøyl",
  "Tormod Sivertsen",
  "Torry Sakkariassen",
  "Trond Myklevoll",
  "Trond Nybakk",
  "Tronn Stadsøy",
  "Vegard Hatland",
  "Vermund Halhjem",
  "Vidar Undertun",
  "Willy Olsen",
  "Ørjan Boge",
  "Ørjan Østrem",
  "Øystein Handegård",
  "Øystein Hesthamar",
].sort((a, b) => a.localeCompare(b, "nb-NO"));

type Booking = {
	id: string;
	vesselName: string;
	date: string;
	orderNumber: string;
	base: string | null;
	pilots: string[];
	gt: number | null;
	  terminal?: string | null;
	  createdAt?: number | null;
};

const EMPTY_BOOKING: Booking = {
	id: "",
	vesselName: "",
	date: new Date().toISOString().slice(0, 10),
	orderNumber: "",
	base: "",
	pilots: [],
			gt: null,
			terminal: null,
			createdAt: null,
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("nb-NO");

type Location = "Mongstad" | "Sture" | "Melkøya" | "Kårstø" | "Los øvrig" | "Nyhamna";
type LosType = "Båt" | "Rigg";

		export default function LosLoggBookingPage() {
				const params = useParams<{ id: string }>();
				const router = useRouter();
				const [booking, setBooking] = useState<Booking>(EMPTY_BOOKING);
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
			const [manualPilotSelection, setManualPilotSelection] = useState(false);
			const [showSecondPilotSelect, setShowSecondPilotSelect] = useState(false);
			const [extraLosNames, setExtraLosNames] = useState<string[]>([]);
			const [comment, setComment] = useState("");
			const [sign, setSign] = useState("");
					const [hasSent, setHasSent] = useState(false);
					const [sending, setSending] = useState(false);
					const [sendError, setSendError] = useState<string | null>(null);
						const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
						const [showRemovedInfo, setShowRemovedInfo] = useState(false);
						const [removing, setRemoving] = useState(false);
						const [removeError, setRemoveError] = useState<string | null>(null);
						const [removeReason, setRemoveReason] = useState<string | null>(null);
						const [removeComment, setRemoveComment] = useState("");

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

						const data = (await res.json()) as { booking?: Partial<Booking> & { id: string } };
						if (data.booking) {
							const createdAtRaw = (data.booking as { createdAt?: unknown }).createdAt;
							const createdAt =
								typeof createdAtRaw === "number" && Number.isFinite(createdAtRaw) && createdAtRaw > 0
									? createdAtRaw
									: null;
							const hasPilots =
								Array.isArray(data.booking.pilots) && data.booking.pilots.length > 0;

							setBooking({
								id: data.booking.id,
								vesselName: data.booking.vesselName ?? "Ukjent fartøy",
								date: data.booking.date ?? new Date().toISOString().slice(0, 10),
								orderNumber: data.booking.orderNumber ?? "",
								base: data.booking.base ?? "",
								pilots: hasPilots ? (data.booking.pilots as string[]) : [],
								gt: typeof data.booking.gt === "number" ? data.booking.gt : null,
								terminal:
									typeof (data.booking as { terminal?: unknown }).terminal === "string"
										? ((data.booking as { terminal?: string | null }).terminal ?? null)
										: null,
								createdAt,
							});
							setManualPilotSelection(!hasPilots);
							setShowSecondPilotSelect(false);
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

			useEffect(() => {
				try {
					if (typeof window === "undefined") return;
					const stored = window.localStorage.getItem(LAST_TECHLOG_STORAGE_KEY);
					if (!stored) return;
					const parsed = Number.parseInt(stored, 10);
					if (Number.isNaN(parsed) || parsed <= 0) return;
					setTechlogNumber(parsed);
				} catch (error) {
					console.warn("Klarte ikke å lese siste techlognummer fra localStorage", error);
				}
			}, []);
		
				// Forhåndsvelg sted hvis vi har tolket terminal fra bestillingsmailen
				// (f.eks. Holmengraa/Fedje vest → Mongstad/Sture) og piloten ikke har
				// valgt noe selv ennå.
				useEffect(() => {
					if (location !== null) return;
			
					const terminal = booking.terminal;
					if (!terminal) return;
			
					const KNOWN_LOCATIONS: Location[] = [
						"Mongstad",
						"Sture",
						"Melkøya",
						"Kårstø",
						"Los øvrig",
						"Nyhamna",
					];
			
					if (KNOWN_LOCATIONS.includes(terminal as Location)) {
						setLocation(terminal as Location);
					}
				}, [booking.terminal, location]);
				
				useEffect(() => {
					async function loadExtraLosNames() {
						try {
							const res = await fetch("/api/los-names");
							if (!res.ok) return;
							const data = (await res.json()) as { ok?: boolean; names?: string[] };
							if (data.ok && Array.isArray(data.names)) {
								setExtraLosNames(data.names);
							}
						} catch (error) {
							console.error("Klarte ikke å hente ekstra los-navn", error);
						}
					}

					loadExtraLosNames();
				}, []);
			
			const signers = useMemo(
				() => [...CAPTAINS, ...FIRST_OFFICERS].sort((a, b) => a.localeCompare(b, "nb-NO")),
				[],
			);
		
				const allLosNames = useMemo(
					() => {
						const namesSet = new Set<string>();
						LOS_NAMES.forEach((name) => namesSet.add(name));
						extraLosNames.forEach((name) => namesSet.add(name));
						return Array.from(namesSet).sort((a, b) => a.localeCompare(b, "nb-NO"));
					},
					[extraLosNames],
				);
			
			const firstPilot = booking.pilots[0] ?? "";
			const secondPilot = booking.pilots[1] ?? "";
		
			// Sikre at eksisterende los-navn fortsatt vises i nedtrekksmenyen
			// selv om de ikke ligger i LOS_NAMES-listen fra før.
			const pilot1Options = useMemo(
				() =>
						firstPilot && !allLosNames.includes(firstPilot)
							? [firstPilot, ...allLosNames]
							: allLosNames,
					[firstPilot, allLosNames],
			);
		
			const pilot2Options = useMemo(
				() => {
					const baseList =
							secondPilot && !allLosNames.includes(secondPilot)
								? [secondPilot, ...allLosNames]
								: allLosNames;
					return baseList.filter((name) => name !== firstPilot);
				},
					[firstPilot, secondPilot, allLosNames],
			);
			
				useEffect(() => {
					const pilots = booking.pilots ?? [];
					const trimmed = pilots
						.map((name) => name.trim())
						.filter((name) => name.length > 0);

					if (trimmed.length === 0) return;

					const unknown = trimmed.filter((name) => !allLosNames.includes(name));
					const uniqueUnknown = Array.from(new Set(unknown));
					if (uniqueUnknown.length === 0) return;

					async function saveNewLosNames() {
						try {
							const res = await fetch("/api/los-names", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ names: uniqueUnknown }),
							});
							if (!res.ok) return;
							const data = (await res.json()) as { ok?: boolean; names?: string[] };
							if (data.ok && Array.isArray(data.names) && data.names.length > 0) {
								setExtraLosNames((prev) => {
									const set = new Set(prev);
									data.names?.forEach((name) => set.add(name));
									return Array.from(set);
								});
							}
						} catch (error) {
							console.error("Klarte ikke å lagre nye los-navn", error);
						}
					}

					saveNewLosNames();
				}, [booking.pilots, allLosNames]);

			const canGoNext = () => {
				switch (step) {
					case 0:
						return true; // bare gjennomse auto-info
					case 1:
						return techlogNumber > 0;
					case 2:
						return location !== null;
					case 3:
						// Fartøystype er påkrevd, resten er valgfrie
						return losType !== null;
					case 4:
						return true; // kommentar kan være tom
					case 5:
						return sign.length === 3; // signering krever 3 bokstaver
					case 6:
						return true; // oppsummering, her bruker vi egen «Send»
					default:
						return false;
				}
			};

					const handleNext = () => {
				if (!canGoNext()) return;
					setStep((s) => Math.min(s + 1, 6));
			};

	const handlePrev = () => {
		setStep((s) => Math.max(s - 1, 0));
	};

			const handleSend = async () => {
				if (hasSent || sending) return;
				if (!booking.id) {
					setSendError("Kan ikke sende LOS-logg uten gyldig bestilling.");
					return;
				}
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
							gt: booking.gt,
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
					try {
						if (typeof window !== "undefined") {
							window.localStorage.setItem(
								LAST_TECHLOG_STORAGE_KEY,
								String(techlogNumber),
							);
						}
					} catch {
						// ignore localStorage errors
					}
					setHasSent(true);
			} catch (error) {
				console.error("Klarte ikke å sende LOS-logg", error);
				setSendError("Klarte ikke å sende LOS-logg.");
			} finally {
					setSending(false);
			}
		};

			const canShowRemoveButton = (() => {
				if (!booking.id || !booking.createdAt) return false;
				const twoHoursMs = 2 * 60 * 60 * 1000;
				const diff = Date.now() - booking.createdAt;
				return diff >= twoHoursMs;
			})();

					const handleConfirmRemove = async () => {
						if (!booking.id) {
							setShowRemoveConfirm(false);
							return;
						}
						setRemoveError(null);
						setRemoving(true);
						try {
							const res = await fetch("/api/los-bookings/cancel", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({ id: booking.id }),
							});
							if (!res.ok) {
								let message = "Klarte ikke å fjerne båten. Prøv igjen.";
								try {
									const data = (await res.json()) as { error?: string };
									if (data.error) message = data.error;
								} catch {
									// ignorér JSON-feil
								}
								setRemoveError(message);
								return;
							}
							setShowRemoveConfirm(false);
							setRemoveReason(null);
							setRemoveComment("");
							setShowRemovedInfo(true);
						} catch (error) {
							console.error("Klarte ikke å fjerne LOS-bestilling", error);
							setRemoveError("Klarte ikke å fjerne båten. Sjekk nettverk og prøv igjen.");
						} finally {
							setRemoving(false);
						}
					};

						const handleConfirmRemoveWithReason = async () => {
							if (!booking.id) {
								setShowRemoveConfirm(false);
								return;
							}
							if (!removeReason) {
								setRemoveError("Velg årsak før du går videre.");
								return;
							}
							// Hvis brukeren kun vil rydde i listen, bruk eksisterende kanselleringsflyt uten logging.
							if (removeReason === "Bare fjern fra listen") {
								setRemoveError(null);
								await handleConfirmRemove();
								return;
							}

							// For kanselleringer som skal logges i LOS-logg, krever vi sign (3 bokstaver),
							// siden backenden også validerer dette.
							if (!sign || sign.length !== 3) {
								setRemoveError("Velg sign (3 bokstaver) før du går videre.");
								return;
							}

							setRemoveError(null);
							setRemoving(true);

							// For andre årsaker skal vi logge til LOS-logg (SharePoint) og samtidig fjerne båten.
							// Kommentaren starter alltid med valgt årsak.
							const trimmedComment = removeComment.trim();
							const finalComment =
								trimmedComment.length > 0
									? `${removeReason} - ${trimmedComment}`
									: removeReason;

							try {
								const res = await fetch("/api/los-logg", {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										bookingId: booking.id,
										date: booking.date,
										orderNumber: booking.orderNumber,
										vesselName: booking.vesselName,
										gt: booking.gt,
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
										comment: finalComment,
										sign,
										isCancellation: true,
									}),
								});
								if (!res.ok) {
									let message = "Klarte ikke å sende kansellering til LOS-logg.";
									try {
										const data = (await res.json()) as { error?: string };
										if (data.error) message = data.error;
									} catch {
										// ignorér JSON-feil
									}
									setRemoveError(message);
									setRemoving(false);
									return;
								}

								// Hvis vi kommer hit, er raden skrevet til Excel og booking markert som lukket i Firestore.
								// Vi gjenbruker "sendt"-overlayen som allerede finnes for vanlig LOS-logg.
								setShowRemoveConfirm(false);
								setRemoveReason(null);
								setRemoveComment("");
								setHasSent(true);
							} catch (error) {
								console.error("Klarte ikke å sende kansellering til LOS-logg", error);
								setRemoveError("Klarte ikke å sende kansellering til LOS-logg. Sjekk nettverk og prøv igjen.");
								setRemoving(false);
							}
						};

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
						<header className="space-y-1">
							<h1 className="text-lg font-semibold">LOS-logg – {booking.vesselName}</h1>
									<p className="text-xs text-gray-500">Steg {step + 1} av 7</p>
								{loadingBooking && (
									<p className="text-[11px] text-gray-500">Henter bestilling…</p>
								)}
								{bookingError && !loadingBooking && (
									<p className="text-[11px] text-red-600">
										Klarte ikke å hente bestilling. Gå tilbake til LOS-logg og prøv igjen.
									</p>
								)}
				</header>

					{/* Steg 0: auto-info */}
					{step === 0 && (
						<section className="space-y-2">
							<h2 className="text-sm font-medium text-gray-700">Data fra bestillingsmail</h2>
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
								<dt className="text-gray-600">GT (bruttotonnasje)</dt>
								<dd className="font-medium">
									{typeof booking.gt === "number" ? booking.gt.toLocaleString("nb-NO") : "–"}
								</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Base</dt>
								<dd className="font-medium">{booking.base}</dd>
							</div>
								<div className="flex justify-between">
									<dt className="text-gray-600">Terminal (tolket)</dt>
									<dd className="font-medium">{booking.terminal ?? "–"}</dd>
								</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Los(er)</dt>
								<dd className="font-medium">
									{!manualPilotSelection ? (
										booking.pilots.length > 0 ? (
											<div className="flex items-start justify-end gap-2">
												{booking.pilots.length === 1 && (
													<button
														type="button"
														onClick={() => {
															setManualPilotSelection(true);
															setShowSecondPilotSelect(true);
														}}
														className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
														aria-label="Legg til ekstra los"
													>
														+
													</button>
												)}
												<span className="flex flex-col items-end text-right">
													{booking.pilots.map((name) => (
														<span key={name}>{name}</span>
													))}
												</span>
											</div>
										) : (
											"–"
										)
									) : (
										<div className="flex flex-col items-end gap-1">
										<div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-900">
											<span>Manuell registrering av los</span>
										</div>
										<select
											className="w-44 sm:w-52 rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white self-end"
											value={booking.pilots[0] ?? ""}
											onChange={(e) => {
												const value = e.target.value;
												setBooking((prev) => {
													const [, second] = prev.pilots;
													if (!value) {
														return {
															...prev,
															pilots: second ? [second] : [],
														};
													}
													const pilots: string[] = [value];
													if (second && second !== value) {
														pilots.push(second);
													}
													return { ...prev, pilots };
												});
											}}
										>
						<option value="">Velg los</option>
						{pilot1Options.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
										</select>
										{booking.pilots[0] && !showSecondPilotSelect && (
											<button
												type="button"
												onClick={() => setShowSecondPilotSelect(true)}
												className="mt-1 inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-xs text-gray-700 bg-white hover:bg-gray-50 w-fit self-end"
											>
												+
											</button>
										)}
										{(showSecondPilotSelect || booking.pilots.length > 1) && (
											<select
												className="w-44 sm:w-52 rounded-md border border-gray-300 px-3 py-1.5 text-sm bg-white self-end"
												value={booking.pilots[1] ?? ""}
												onChange={(e) => {
													const value = e.target.value;
													setBooking((prev) => {
														const first = prev.pilots[0] ?? "";
														if (!value) {
															return {
																...prev,
																pilots: first ? [first] : [],
															};
														}
														const pilots: string[] = [];
														if (first) pilots.push(first);
														if (!first || value !== first) pilots.push(value);
														return { ...prev, pilots };
													});
												}}
											>
						<option value="">Velg los 2 (valgfritt)</option>
						{pilot2Options.map((name) => (
							<option key={name} value={name}>
								{name}
							</option>
						))}
											</select>
										)}
									</div>
								)}
							</dd>
						</div>
						</dl>
						<p className="text-xs text-gray-500">
							Disse feltene er hentet fra bestillingsmailen fra Kystverket.
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
								Forrige brukte techlognummer vises her. Juster opp eller ned ved behov.
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
						<div className="mt-4 space-y-1">
							<label className="text-sm font-medium text-gray-700" htmlFor="gt-input">
									GT (bruttotonnasje)
							</label>
							<input
								id="gt-input"
								type="number"
								inputMode="numeric"
								className="w-full rounded-md border border-gray-300 px-3 py-2 text-right text-sm"
								value={booking.gt ?? ""}
								onChange={(e) => {
									const value = e.target.value.trim();
									if (value === "") {
										setBooking((prev) => ({ ...prev, gt: null }));
										return;
									}
									const parsed = Number.parseInt(value, 10);
									if (Number.isNaN(parsed)) return;
									setBooking((prev) => ({ ...prev, gt: parsed }));
								}}
							/>
								<p className="text-[11px] text-gray-500">
									Feltet fylles vanligvis ut automatisk når vi finner GT i våre systemer. Sjekk at tallet stemmer,
									eller skriv inn riktig GT manuelt.
								</p>
						</div>
					</section>
				)}

					{/* Steg 3: fartøystype + levering (Ship landing/hoist/ENFJ/LOS til flyplass/tåke) */}
					{step === 3 && (
						<section className="space-y-5">
							<div className="space-y-2">
								<h2 className="text-sm font-medium text-gray-700">Fartøystype</h2>
								<div className="grid grid-cols-2 gap-2">
									{["Båt", "Rigg"].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => setLosType(t as LosType)}
											className={`w-full px-4 py-3 rounded-xl border text-sm ${
												losType === t
													? "bg-blue-50 border-blue-500 text-blue-900"
													: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
											}`}
										>
											{t}
										</button>
									))}
								</div>
							<p className="text-[11px] text-gray-500">
								Velg om dette er båt eller rigg. Dette brukes i rapporteringen til LOS-loggen.
							</p>
							</div>

							<div className="space-y-4">
								<div className="space-y-2">
									<h2 className="text-sm font-medium text-gray-700">Levering</h2>
									<div className="grid grid-cols-2 gap-2">
										<button
											type="button"
											onClick={() => setHoistCount((v) => (v === 1 ? null : 1))}
											className={`w-full px-4 py-3 rounded-xl border text-sm ${
												hoistCount === 1
													? "bg-blue-50 border-blue-500 text-blue-900"
													: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
											}`}
										>
											Hoist
										</button>
										<button
											type="button"
											onClick={() => setShipLanding((v) => !v)}
											className={`w-full px-4 py-3 rounded-xl border text-sm ${
												shipLanding
													? "bg-blue-50 border-blue-500 text-blue-900"
													: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
											}`}
									>
										Ship landing
									</button>
								</div>
								<p className="text-[11px] text-gray-500">
									Velg bare det som faktisk ble gjennomført. Hoist og ship landing er valgfrie.
								</p>
							</div>

								<div className="space-y-2">
									<h2 className="text-sm font-medium text-gray-700">Antall landinger Fedje</h2>
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
								<p className="text-[11px] text-gray-500">
									Velg antall landinger på Fedje, eller la stå tomt hvis det ikke var landinger.
								</p>
							</div>

								<div className="space-y-2">
									<h2 className="text-sm font-medium text-gray-700">Antall los til flyplass</h2>
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
								<p className="text-[11px] text-gray-500">
									Velg hvor mange loser som faktisk ble fløyet til eller fra flyplass (antall personer),
									eller la stå tomt hvis ingen.
								</p>
							</div>

							<div className="space-y-2">
								<h2 className="text-sm font-medium text-gray-700">Ikke utført</h2>
								<button
									type="button"
									onClick={() => setTokeBomtur((v) => !v)}
									className={`w-full px-4 py-3 rounded-xl border text-sm ${
											tokeBomtur
												? "bg-blue-50 border-blue-500 text-blue-900"
												: "bg-white border-gray-200 text-gray-900 hover:bg-gray-50"
										}`}
								>
									Tåke/bomtur
								</button>
								<p className="text-[11px] text-gray-500">
									Brukes når turen ikke ble gjennomført, for eksempel på grunn av vær eller andre forhold.
								</p>
							</div>
							</div>
						</section>
					)}
					
					{/* Steg 4: kommentar */}
					{step === 4 && (
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
					
					{/* Steg 5: signering (kapteiner + styrmenn) */}
					{step === 5 && (
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
					
					{/* Steg 6: oppsummering */}
					{step === 6 && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-gray-700">Oppsummering</h2>
						<dl className="space-y-1 text-sm">
							<div className="flex justify-between">
								<dt className="text-gray-600">Fartøy</dt>
								<dd className="font-medium">{booking.vesselName}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">GT</dt>
								<dd className="font-medium">
									{typeof booking.gt === "number" ? booking.gt.toLocaleString("nb-NO") : "–"}
								</dd>
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
									<dt className="text-gray-600">Fartøystype</dt>
								<dd className="font-medium">{losType ?? "–"}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-gray-600">Ship landing</dt>
								<dd className="font-medium">{shipLanding ? "Ja" : "Nei"}</dd>
							</div>
								<div className="flex justify-between">
									<dt className="text-gray-600">Tåke/bomtur</dt>
									<dd className="font-medium">{tokeBomtur ? "Ja" : "Nei"}</dd>
								</div>
							<div className="flex justify-between">
									<dt className="text-gray-600">LOS til flyplass</dt>
									<dd className="font-medium">{losToAirportCount ?? "–"}</dd>
								</div>
								<div className="flex justify-between">
									<dt className="text-gray-600">Landinger Fedje</dt>
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

					{/* Navigasjonsknapper + ev. "Fjern bt/kansellert" */}
					<div className="pt-2 space-y-2">
						<div className="flex justify-between text-sm">
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
											disabled={!canGoNext() || step === 6}
							>
								Neste
							</button>
						</div>
						{step === 0 && canShowRemoveButton && !hasSent && (
							<button
								type="button"
								onClick={() => setShowRemoveConfirm(true)}
								className="mx-auto inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900"
							>
								Fjern båt/kansellert
							</button>
						)}
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

						{showRemoveConfirm && (
							<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 overflow-y-auto">
								<div className="mx-4 my-8 max-w-md w-full max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-lg space-y-4">
								<h2 className="text-base font-semibold text-gray-900">Fjern båt / kansellert</h2>
								<p className="text-sm text-gray-700">
									Velg årsak til at båten ikke skal gjennomføres. Hvis du bare vil rydde i listen uten å
									registrere noe, velger du «Bare fjern fra listen».
								</p>
								<div className="space-y-2">
									{["Tåke", "Lyn", "Sikt/Skydekke", "Vind/Bølgehøyde", "Teknisk", "Annet", "Bare fjern fra listen"].map((reason) => (
										<label
											key={reason}
											className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
										>
											<input
												type="radio"
												name="remove-reason"
												value={reason}
												checked={removeReason === reason}
												onChange={() => setRemoveReason(reason)}
											/>
											<span>{reason}</span>
										</label>
									))}
								</div>
							{removeReason && removeReason !== "Bare fjern fra listen" && (
								<div className="space-y-3 pt-2">
									<div className="space-y-1">
										<label className="text-sm font-medium text-gray-700" htmlFor="remove-comment">
											Kommentar
										</label>
										<textarea
											id="remove-comment"
											rows={3}
											className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
											value={removeComment}
											onChange={(e) => setRemoveComment(e.target.value)}
											placeholder={`${removeReason} – skriv kort forklaring her (valgfritt)`}
										/>
									</div>
									<div className="space-y-1">
										<span className="text-sm font-medium text-gray-700">Sign (3 bokstaver)</span>
										<select
											className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
											value={sign}
											onChange={(e) => setSign(e.target.value)}
										>
											<option value="">Velg sign</option>
											{signers.map((s) => (
												<option key={s} value={s}>
													{s}
												</option>
											))}
										</select>
										<p className="text-[11px] text-gray-500">
											Dette er samme sign-liste som i vaktrapporten (kapteiner og styrmenn).
										</p>
									</div>
								</div>
							)}
									{removeError && <p className="text-xs text-red-600">{removeError}</p>}
									<div className="flex justify-between items-center pt-2">
										<button
											type="button"
											onClick={() => {
												setShowRemoveConfirm(false);
												setRemoveReason(null);
												setRemoveComment("");
											}}
											className="px-3 py-1.5 rounded-full border border-gray-300 bg-white text-xs font-medium text-gray-700"
										>
											Avbryt
										</button>
										<button
											type="button"
											onClick={() => handleConfirmRemoveWithReason()}
											disabled={!removeReason || removing}
											className="px-4 py-1.5 rounded-full bg-red-600 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
										>
											{removing ? "Jobber…" : removeReason === "Bare fjern fra listen" ? "Fjern fra listen" : "Send og fjern"}
										</button>
									</div>
								</div>
							</div>
						)}

					{showRemovedInfo && (
						<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
							<div className="mx-4 max-w-sm rounded-2xl bg-white p-5 shadow-lg space-y-3">
								<p className="text-sm text-gray-900">
									Båten er fjernet fra LOS-logg i denne appen.
								</p>
								<button
									type="button"
									onClick={() => {
										setShowRemovedInfo(false);
										router.push("/loslogg");
									}}
									className="block w-full rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
								>
									OK
								</button>
							</div>
						</div>
					)}

					{hasSent && !sendError && (
						<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
							<div className="mx-4 max-w-sm rounded-2xl bg-white p-5 shadow-lg space-y-3">
								<p className="text-sm text-gray-900">LOS-logg er sendt til SharePoint.</p>
								<Link
										href="/"
										className="block w-full rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
									>
										OK
									</Link>
							</div>
						</div>
					)}
			</div>
	);
}
