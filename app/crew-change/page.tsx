"use client";

import Link from "next/link";

export default function CrewChangeChoicePage() {
	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-3 sm:p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-5 sm:p-6">
				<header className="space-y-1">
					<h1 className="text-lg font-semibold">Crew change</h1>
					<p className="text-sm text-gray-600">Hva gjelder dette oppdraget?</p>
				</header>

				<div className="space-y-3">
					<Link
						href="/crew-change/gjennomfort"
						className="block w-full rounded-lg bg-blue-600 py-4 text-center text-base font-medium text-white shadow-sm hover:bg-blue-700"
					>
						Gjennomført
					</Link>
					<Link
						href="/crew-change/utsatt"
						className="block w-full rounded-lg border border-amber-300 bg-amber-50 py-4 text-center text-base font-medium text-amber-900 hover:bg-amber-100"
					>
						Utsatt
					</Link>
					<Link
						href="/crew-change/kansellert"
						className="block w-full rounded-lg border border-red-300 bg-red-50 py-4 text-center text-base font-medium text-red-900 hover:bg-red-100"
					>
						Kansellert
					</Link>
				</div>

				<Link href="/" className="block text-center text-sm text-gray-500 underline">
					Tilbake til forsiden
				</Link>
			</main>
		</div>
	);
}
