"use client";

import { useEffect, useRef, useState } from "react";
import type { PolicePin, PoliceReportType } from "./types";

type GoogleLatLng = { lat: () => number; lng: () => number };
type GoogleMapEvent = { latLng?: GoogleLatLng };
type GoogleMap = {
	addListener: (name: string, cb: (event: GoogleMapEvent) => void) => { remove: () => void };
};
type GoogleMarker = { setMap: (map: GoogleMap | null) => void };
type GoogleApi = {
	maps: {
		Map: new (el: HTMLElement, options: Record<string, unknown>) => GoogleMap;
		Marker: new (options: Record<string, unknown>) => GoogleMarker;
		SymbolPath: { CIRCLE: number };
	};
};

declare global {
	interface Window {
		google?: GoogleApi;
	}
}

let googleMapsPromise: Promise<GoogleApi> | null = null;

function loadGoogleMaps(apiKey: string): Promise<GoogleApi> {
	if (typeof window === "undefined") return Promise.reject(new Error("No window"));
	if (window.google?.maps) return Promise.resolve(window.google);
	if (googleMapsPromise) return googleMapsPromise;

	googleMapsPromise = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
		script.async = true;
		script.defer = true;
		script.onload = () => (window.google ? resolve(window.google) : reject(new Error("Google Maps mangler")));
		script.onerror = () => reject(new Error("Klarte ikke å laste Google Maps"));
		document.head.appendChild(script);
	});

	return googleMapsPromise;
}

interface Props {
	pins: PolicePin[];
	onChangePins: (pins: PolicePin[]) => void;
	reportType: PoliceReportType;
}

export default function PoliceMapPicker({ pins, onChangePins, reportType }: Props) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	const mapRef = useRef<HTMLDivElement | null>(null);
	const googleRef = useRef<GoogleApi | null>(null);
	const mapInstanceRef = useRef<GoogleMap | null>(null);
	const markersRef = useRef<GoogleMarker[]>([]);
	const pinsRef = useRef<PolicePin[]>(pins);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		pinsRef.current = pins;
	}, [pins]);

	useEffect(() => {
		if (!apiKey || !mapRef.current || mapInstanceRef.current) return;
		loadGoogleMaps(apiKey)
			.then((google) => {
				googleRef.current = google;
				const map = new google.maps.Map(mapRef.current as HTMLElement, {
					center: { lat: 69.6492, lng: 18.9553 },
					zoom: 7,
					mapTypeId: "terrain",
					streetViewControl: false,
					fullscreenControl: false,
				});
				map.addListener("click", (event) => {
					if (!event.latLng) return;
					onChangePins([...pinsRef.current, { lat: event.latLng.lat(), lng: event.latLng.lng() }]);
				});
				mapInstanceRef.current = map;
			})
			.catch((err: Error) => setError(err.message));
	}, [apiKey, onChangePins]);

	useEffect(() => {
		const google = googleRef.current;
		const map = mapInstanceRef.current;
		if (!google || !map) return;
		markersRef.current.forEach((marker) => marker.setMap(null));
		const color = reportType === "mission" ? "#dc2626" : "#2563eb";
		markersRef.current = pins.map(
			(pin) =>
				new google.maps.Marker({
					position: pin,
					map,
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						fillColor: color,
						fillOpacity: 1,
						strokeColor: "#ffffff",
						strokeWeight: 2,
						scale: 9,
					},
					label: reportType === "mission" ? "M" : "T",
				}),
		);
	}, [pins, reportType]);

	if (!apiKey) {
		return (
			<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
				Google Maps er klart i koden, men `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` må settes i miljøet før kartet vises.
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div ref={mapRef} className="h-72 w-full overflow-hidden rounded-xl border border-gray-300 bg-gray-100" />
			{error && <p className="text-sm text-red-600">{error}</p>}
			<div className="flex items-center justify-between text-sm text-gray-600">
				<span>{pins.length} pins plassert</span>
				<button type="button" onClick={() => onChangePins([])} className="text-blue-700 underline">
					Nullstill pins
				</button>
			</div>
		</div>
	);
}