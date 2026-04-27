"use client";

import Link from "next/link";
import { useState } from "react";

export default function PoliceEntryClient() {
	const [visible, setVisible] = useState(false);

	return (
		<div className="mt-3 flex flex-col items-center gap-2 border-t border-gray-100 pt-3">
			<label className="flex cursor-pointer flex-col items-center gap-1 text-[11px] font-medium text-gray-500">
				<input
					type="checkbox"
					checked={visible}
					onChange={(event) => setVisible(event.target.checked)}
					className="h-3 w-3 rounded border-gray-300 text-blue-600"
				/>
				<span>Politiet</span>
			</label>

			{visible && (
				<Link
					href="/politiet"
					className="block w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-4 text-center text-base font-medium text-amber-950 shadow-sm hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
				>
					Politiet
				</Link>
			)}
		</div>
	);
}