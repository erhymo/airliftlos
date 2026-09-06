"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	CREW_CHANGE_REASONS,
	CREW_CHANGE_REASON_LABELS,
	type CrewChangeBase,
	type CrewChangeReason,
} from "../../lib/crewChangeEvents";

const BASE_STORAGE_KEY = "crew_change_last_base";

const OUTCOME_LABELS: Record<"postponed" | "cancelled", string> = {
	postponed: "Utsatt",
	cancelled: "Kansellert",
};

export default function CrewChangeIncidentForm({ outcome }: { outcome: "postponed" | "cancelled" }) {
	const router = useRouter();
	const [base, setBase] = useState<CrewChangeBase>("Bergen");
	const [reasons, setReasons] = useState<CrewChangeReason[]>([]);
	const [comment, setComment] = useState("");
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(BASE_STORAGE_KEY);
			if (stored === "Bergen" || stored === "Hammerfest") setBase(stored);
		} catch {}
	}, []);

	function chooseBase(next: CrewChangeBase) {
		setBase(next);
		try {
			window.localStorage.setItem(BASE_STORAGE_KEY, next);
		} catch {}
	}

	function toggleReason(reason: CrewChangeReason) {
		setReasons((current) => (current.includes(reason) ? current.filter((r) => r !== reason) : [...current, reason]));
	}

	async function handleSubmit() {
		setError(null);
		if (reasons.length === 0) {
			setError("Velg minst én årsak.");
			return;
		}
		setSending(true);
		try {
			const res = await fetch("/api/crew-change/incident", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ base, outcome, reasons, comment }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) throw new Error(data.error || "Klarte ikke å sende inn.");
			setSent(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Klarte ikke å sende inn.");
		} finally {
			setSending(false);
		}
	}

	const label = OUTCOME_LABELS[outcome];
	const activeReasonClass =
		outcome === "cancelled"
			? "border-red-600 bg-red-50 text-red-900"
			: "border-amber-600 bg-amber-50 text-amber-900";

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-3 sm:p-4">
			{sent && <IncidentReceiptModal label={label} onOk={() => router.push("/")} />}
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-5 sm:p-6">
				<header className="space-y-1">
					<div className="flex items-center justify-between gap-3">
						<h1 className="text-lg font-semibold">Crew change – {label}</h1>
						<Link href="/crew-change" className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
							← Tilbake
						</Link>
					</div>
					<p className="text-sm text-gray-600">Registrer base og årsak. Vær hentes automatisk.</p>
				</header>

				{!sent && (
					<div className="space-y-4">
						<div>
							<span className="mb-1 block text-sm font-medium text-gray-700">Base</span>
							<div className="grid grid-cols-2 gap-2">
								<button
									type="button"
									onClick={() => chooseBase("Bergen")}
									className={`rounded-lg border py-3 text-sm font-medium ${base === "Bergen" ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-300 bg-white text-gray-700"}`}
								>
									Bergen
								</button>
								<button
									type="button"
									onClick={() => chooseBase("Hammerfest")}
									className={`rounded-lg border py-3 text-sm font-medium ${base === "Hammerfest" ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-300 bg-white text-gray-700"}`}
								>
									Hammerfest
								</button>
							</div>
						</div>

						<div>
							<span className="mb-1 block text-sm font-medium text-gray-700">Årsak (velg én eller flere)</span>
							<div className="grid grid-cols-2 gap-2">
								{CREW_CHANGE_REASONS.map((reason) => {
									const active = reasons.includes(reason);
									return (
										<button
											key={reason}
											type="button"
											onClick={() => toggleReason(reason)}
											className={`rounded-lg border py-3 text-sm font-medium ${active ? activeReasonClass : "border-gray-300 bg-white text-gray-700"}`}
										>
											{CREW_CHANGE_REASON_LABELS[reason]}
										</button>
									);
								})}
							</div>
						</div>

						<label className="block space-y-1">
							<span className="text-sm font-medium text-gray-700">Kommentar (valgfritt)</span>
							<textarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								rows={3}
								className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900"
							/>
						</label>

						{error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

						<button
							type="button"
							onClick={handleSubmit}
							disabled={sending}
							className="w-full rounded-lg bg-blue-600 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
						>
							{sending ? "Sender..." : "Send inn"}
						</button>
						<Link href="/crew-change" className="block text-center text-sm text-gray-500 underline">
							Tilbake
						</Link>
					</div>
				)}
			</main>
		</div>
	);
}

function IncidentReceiptModal({ label, onOk }: { label: string; onOk: () => void }) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${label} registrert`}>
			<div className="w-full max-w-sm rounded-2xl border border-green-200 bg-white p-5 text-center shadow-2xl">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-700">✓</div>
				<h2 className="mt-4 text-xl font-semibold text-gray-900">{label} registrert</h2>
				<p className="mt-2 text-sm leading-6 text-gray-600">Oppdraget er registrert med vær og årsak. Trykk OK for å gå tilbake til forsiden.</p>
				<button type="button" onClick={onOk} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700">OK</button>
			</div>
		</div>
	);
}
