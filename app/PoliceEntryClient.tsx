"use client";

import Link from "next/link";
import { useState } from "react";

export default function PoliceEntryClient() {
	const [policeVisible, setPoliceVisible] = useState(false);
	const [crewChangeVisible, setCrewChangeVisible] = useState(false);

	return (
		<div className="mt-3 flex flex-col items-center gap-3 border-t border-gray-100 pt-4">
			<div className="flex w-full items-start justify-center gap-12 sm:gap-16">
				<label className="flex cursor-pointer flex-col items-center gap-1 text-[11px] font-medium text-gray-500">
					<input
						type="checkbox"
						checked={policeVisible}
						onChange={(event) => setPoliceVisible(event.target.checked)}
						className="h-3 w-3 rounded border-gray-300 text-blue-600"
					/>
					<span>Politiet</span>
				</label>

				<label className="flex cursor-pointer flex-col items-center gap-1 text-[11px] font-medium text-gray-500">
					<input
						type="checkbox"
						checked={crewChangeVisible}
						onChange={(event) => setCrewChangeVisible(event.target.checked)}
						className="h-3 w-3 rounded border-gray-300 text-blue-600"
					/>
					<span>Crew change</span>
				</label>
			</div>

			{policeVisible && (
				<Link
					href="/politiet"
					className="block w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-center text-base font-medium text-amber-950 shadow-sm hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
				>
					Politiet
				</Link>
			)}

			{crewChangeVisible && (
				<Link
					href="/crew-change"
					className="block w-full rounded-lg border border-blue-300 bg-blue-50 px-4 py-4 text-center text-base font-medium text-blue-950 shadow-sm hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
				>
					Crew change
				</Link>
			)}
		</div>
	);
}
