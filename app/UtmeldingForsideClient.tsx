"use client";

import { useEffect, useState } from "react";
import { getOrCreateDeviceId } from "../lib/deviceId";
import { loadLocalUtmeldinger, saveLocalUtmeldinger, type PoliceUtmeldingLite } from "../lib/policeUtmeldingLocal";

function formatDate(dateIso: string) {
	const match = dateIso.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	return match ? `${match[3]}.${match[2]}.${match[1]}` : dateIso;
}

export default function UtmeldingForsideClient() {
	const [deviceId, setDeviceId] = useState<string | null>(null);
	const [reports, setReports] = useState<PoliceUtmeldingLite[]>([]);
	const [sending, setSending] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [innmeldReport, setInnmeldReport] = useState<PoliceUtmeldingLite | null>(null);
	const [innmeldDate, setInnmeldDate] = useState("");
	const [innmeldTime, setInnmeldTime] = useState("");
	const [innmeldComment, setInnmeldComment] = useState("");
	const [innmeldError, setInnmeldError] = useState<string | null>(null);
	const [fetchingLatest, setFetchingLatest] = useState(false);
	const [fetchLatestError, setFetchLatestError] = useState<string | null>(null);
	const [deleteConfirmReport, setDeleteConfirmReport] = useState<PoliceUtmeldingLite | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		setDeviceId(getOrCreateDeviceId());
		setReports(loadLocalUtmeldinger());
	}, []);

	const activeReports = reports.filter(
		(r) => r.createdOnDeviceId === deviceId && !r.innmeldtSendtAt && !r.locallyClosed,
	);

	function openDeleteConfirm(report: PoliceUtmeldingLite) {
		setDeleteConfirmReport(report);
	}

	function handleDeleteConfirmed() {
		if (!deleteConfirmReport) return;
		setReports((prev) => {
			const next = prev.map((r) => (r.id === deleteConfirmReport.id ? { ...r, locallyClosed: true } : r));
			saveLocalUtmeldinger(next);
			return next;
		});
		setDeleteConfirmReport(null);
	}

	function startInnmelding(report: PoliceUtmeldingLite) {
		if (sending) return;
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		const hourLabel = String(now.getHours()).padStart(2, "0");
		const minuteLabel = String(now.getMinutes()).padStart(2, "0");

		setInnmeldReport(report);
		setInnmeldDate(`${year}-${month}-${day}`);
		setInnmeldTime(`${hourLabel}:${minuteLabel}`);
		setInnmeldComment("");
		setInnmeldError(null);
	}

	async function handleFetchLatest() {
		setFetchingLatest(true);
		setFetchLatestError(null);
		try {
			const res = await fetch("/api/police/utmelding/latest", { cache: "no-store" });
			const data = (await res.json().catch(() => ({}))) as {
				ok?: boolean;
				report?: { id: string; base: string; date: string; time: string; createdAt: number } | null;
				error?: string;
			};
			if (!res.ok || !data.ok) throw new Error(data.error || "Fant ingen utmelding å hente.");
			if (!data.report) {
				setFetchLatestError("Fant ingen utmeldinger som venter på innmelding.");
				return;
			}
			const next: PoliceUtmeldingLite = {
				id: data.report.id,
				base: data.report.base,
				date: data.report.date,
				time: data.report.time,
				createdAt: data.report.createdAt,
				createdOnDeviceId: deviceId ?? undefined,
			};
			setReports((prev) => {
				const merged = [next, ...prev.filter((r) => r.id !== next.id)];
				saveLocalUtmeldinger(merged);
				return merged;
			});
		} catch (error) {
			setFetchLatestError((error as Error).message);
		} finally {
			setFetchingLatest(false);
		}
	}

	async function handleInnmeldConfirm() {
		if (!innmeldReport) return;
		if (!innmeldDate || !innmeldTime) {
			setInnmeldError("Velg dato og tidspunkt for innmelding.");
			return;
		}

		const [yearStr, monthStr, dayStr] = innmeldDate.split("-");
		const [hourStr, minuteStrRaw] = innmeldTime.split(":");
		const hour = Number(hourStr);
		const minute = Number(minuteStrRaw ?? "0");
		if (!yearStr || !monthStr || !dayStr || Number.isNaN(hour) || hour < 0 || hour > 23) {
			setInnmeldError("Ugyldig dato eller klokkeslett.");
			return;
		}
		const safeMinute = Number.isNaN(minute) || minute < 0 || minute > 59 ? 0 : minute;
		const datoTekst = `${dayStr}.${monthStr}.${yearStr}`;
		const hourLabel = String(hour).padStart(2, "0");
		const minuteLabel = String(safeMinute).padStart(2, "0");

		setSending(true);
		try {
			const linjer = [
				"Airlift Politiberedskap – Innmelding",
				"",
				`Base: ${innmeldReport.base}`,
				`Gjelder utmelding sendt ${formatDate(innmeldReport.date)} kl ${innmeldReport.time}.`,
				"",
				`Politiberedskapen er gjeninnmeldt fra ${datoTekst} kl ${hourLabel}:${minuteLabel}.`,
				"",
				"Kommentar:",
				innmeldComment.trim() || "(ingen kommentar)",
			];
			const plainText = linjer.join("\n");
			const subject = `Airlift Politiberedskap – innmelding ${datoTekst}`;

			const response = await fetch("/api/police/innmelding", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					subject,
					body: plainText,
					reportId: innmeldReport.id,
					innmeldtDato: innmeldDate,
					innmeldtTid: `${hourLabel}:${minuteLabel}`,
					innmeldtKommentar: innmeldComment.trim(),
				}),
			});

			const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; details?: string; innmeldtSendtAt?: number };
			if (!response.ok || data.ok === false) {
				setInnmeldError(data.error || data.details || "Klarte ikke å sende innmelding. Prøv igjen senere.");
				return;
			}

			const sentAt = typeof data.innmeldtSendtAt === "number" ? data.innmeldtSendtAt : Date.now();
			setReports((prev) => {
				const next = prev.map((r) =>
					r.id === innmeldReport.id
						? { ...r, innmeldtSendtAt: sentAt, innmeldtDato: innmeldDate, innmeldtTid: `${hourLabel}:${minuteLabel}`, innmeldtKommentar: innmeldComment.trim() }
						: r,
				);
				saveLocalUtmeldinger(next);
				return next;
			});

			setShowSuccess(true);
			setInnmeldReport(null);
		} finally {
			setSending(false);
		}
	}

	if (!deviceId) return null;

	return (
		<>
			<div className="w-full space-y-2">
				{activeReports.map((report) => (
					<div key={report.id} className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-gray-900 shadow-md">
						<div className="mb-1.5 flex items-baseline gap-2">
							<span className="font-medium">Utmelding Politiet</span>
							<span className="text-xs text-gray-700">{formatDate(report.date)} kl {report.time}</span>
						</div>
						<button
							type="button"
							onClick={() => startInnmelding(report)}
							disabled={sending}
							className="w-full rounded-xl border border-red-700 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-500"
						>
							{sending && innmeldReport?.id === report.id ? "Sender..." : "Send innmelding"}
						</button>
						<button
							type="button"
							onClick={() => openDeleteConfirm(report)}
							disabled={sending}
							className="mt-1.5 w-full text-center text-xs text-gray-500 underline disabled:opacity-60"
						>
							Slett
						</button>
					</div>
				))}

				{activeReports.length === 0 && (
					<div className="text-right">
						<button type="button" onClick={handleFetchLatest} disabled={fetchingLatest} className="text-xs text-gray-400 underline disabled:opacity-60">
							{fetchingLatest ? "Henter..." : "Har dere en utmelding ute som ikke vises her? Hent den"}
						</button>
						{fetchLatestError && <p className="mt-1 text-xs text-red-600">{fetchLatestError}</p>}
					</div>
				)}
			</div>

			{innmeldReport && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
					<div className="mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-lg space-y-4">
						<h2 className="text-base font-semibold text-gray-900">Send innmelding</h2>
						<p className="text-sm text-gray-700">
							Dette gjelder utmeldingen sendt {formatDate(innmeldReport.date)} kl {innmeldReport.time}.
						</p>
						<div className="space-y-3">
							<div>
								<label className="block text-sm font-medium text-gray-900" htmlFor="innmeld-date">Dato for innmelding</label>
								<input id="innmeld-date" type="date" value={innmeldDate} onChange={(e) => setInnmeldDate(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-900" htmlFor="innmeld-time">Tidspunkt for innmelding</label>
								<input id="innmeld-time" type="time" value={innmeldTime} onChange={(e) => setInnmeldTime(e.target.value)} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-900" htmlFor="innmeld-comment">Kommentar (valgfritt)</label>
								<textarea id="innmeld-comment" value={innmeldComment} onChange={(e) => setInnmeldComment(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
							</div>
							{innmeldError && <p className="text-xs text-red-600">{innmeldError}</p>}
						</div>
						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => { if (sending) return; setInnmeldReport(null); setInnmeldError(null); }}
								className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white"
							>
								Avbryt
							</button>
							<button
								type="button"
								onClick={handleInnmeldConfirm}
								disabled={sending}
								className="px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white border border-red-700 disabled:opacity-60"
							>
								{sending ? "Sender..." : "Send"}
							</button>
						</div>
					</div>
				</div>
			)}

			{deleteConfirmReport && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
					<div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg space-y-4">
						<h2 className="text-base font-semibold text-gray-900">Slett varsel?</h2>
						<p className="text-sm text-gray-700">
							Dette fjerner varselet om utmeldingen sendt {formatDate(deleteConfirmReport.date)} kl {deleteConfirmReport.time} fra denne telefonen.
							Bruk dette hvis Politiet allerede er varslet om at beredskapen er tilbake på annen måte (f.eks. muntlig).
							Ingen e-post sendes, og ingenting registreres.
						</p>
						<div className="flex justify-end gap-2">
							<button type="button" onClick={() => setDeleteConfirmReport(null)} className="px-3 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 bg-white">
								Avbryt
							</button>
							<button type="button" onClick={handleDeleteConfirmed} className="px-3 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white border border-red-700">
								OK, slett
							</button>
						</div>
					</div>
				</div>
			)}

			{showSuccess && (
				<div className="fixed inset-x-0 top-20 z-40 flex justify-center px-4">
					<div className="w-full max-w-sm space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
						<p className="text-sm text-gray-900">Innmelding er sendt til Politiet.</p>
						<div className="flex justify-end">
							<button type="button" onClick={() => setShowSuccess(false)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">OK</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
