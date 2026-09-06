import Link from "next/link";

export default function RapporterPage() {
	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
				<header className="space-y-1">
					<h1 className="text-lg font-semibold">Rapporter</h1>
					<p className="text-sm text-gray-600">Velg hvilken statistikk du vil se.</p>
				</header>
				<Link
					href="/rapporter/crew-change"
					className="block w-full rounded-lg bg-blue-600 py-4 text-center text-base font-medium text-white shadow-sm hover:bg-blue-700"
				>
					Crew Change
				</Link>
			</main>
		</div>
	);
}
