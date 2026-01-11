"use client";

import { useState } from "react";

type ArchiveRow = {
	id: string;
	date: string;
	orderNumber: string;
	techlogNumber: string;
	vesselName: string;
};

const VISIBLE_LIMIT = 10;

function formatDisplayDate(isoDate: string): string {
	const d = new Date(isoDate);
	if (Number.isNaN(d.getTime())) return isoDate;
	return d.toLocaleDateString("nb-NO");
}

export default function ArchiveRowsTable({ rows }: { rows: ArchiveRow[] }) {
	const [showAll, setShowAll] = useState(false);
	const hasMore = rows.length > VISIBLE_LIMIT;
	const visibleRows = !hasMore || showAll ? rows : rows.slice(0, VISIBLE_LIMIT);

	return (
		<>
			<div className="overflow-x-auto rounded-md border border-gray-200">
				<table className="min-w-full divide-y divide-gray-200 text-xs">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-2 py-1.5 text-left font-semibold text-gray-700">Dato</th>
							<th className="px-2 py-1.5 text-left font-semibold text-gray-700">Ordrenr.</th>
							<th className="px-2 py-1.5 text-left font-semibold text-gray-700">Techlog</th>
							<th className="px-2 py-1.5 text-left font-semibold text-gray-700">Fartøy</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-white">
						{visibleRows.map((row) => (
							<tr key={row.id}>
								<td className="px-2 py-1.5 text-gray-900">
									{formatDisplayDate(row.date)}
								</td>
								<td className="px-2 py-1.5 text-gray-900">
									{row.orderNumber || "-"}
								</td>
								<td className="px-2 py-1.5 text-gray-900">
									{row.techlogNumber || "-"}
								</td>
								<td className="px-2 py-1.5 text-gray-900">
									{row.vesselName}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{hasMore && (
				<button
					type="button"
					onClick={() => setShowAll((prev) => !prev)}
					className="mt-2 inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-gray-50"
				>
					<span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
						{showAll ? "−" : "+"}
					</span>
					<span>
						{showAll ? "Skjul (vis kun 10 siste)" : `Vis alle ${rows.length} oppdrag`}
					</span>
				</button>
			)}
		</>
	);
}
