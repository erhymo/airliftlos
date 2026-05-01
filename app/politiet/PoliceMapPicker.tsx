"use client";

import { useEffect, useRef, useState } from "react";
import type { PolicePin, PolicePinType, PoliceReportType } from "./types";

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
	onClose: () => void;
}

const PIN_TYPES: Array<{ type: PolicePinType; label: string; shortLabel: string; color: string }> = [
	{ type: "trainingArea", label: "Treningsområde", shortLabel: "T", color: "#2563eb" },
	{ type: "landingPoint", label: "Landingspunkt", shortLabel: "L", color: "#16a34a" },
	{ type: "other", label: "Annet", shortLabel: "A", color: "#6b7280" },
];

function pinTypeMeta(type: PolicePin["type"]) {
	return PIN_TYPES.find((item) => item.type === type) ?? PIN_TYPES[0];
}

export default function PoliceMapPicker({ pins, onChangePins, reportType, onClose }: Props) {
	const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
	const mapRef = useRef<HTMLDivElement | null>(null);
	const googleRef = useRef<GoogleApi | null>(null);
	const mapInstanceRef = useRef<GoogleMap | null>(null);
	const markersRef = useRef<GoogleMarker[]>([]);
	const pinsRef = useRef<PolicePin[]>(pins);
	const activePinTypeRef = useRef<PolicePinType>("trainingArea");
	const otherLabelRef = useRef("");
	const [activePinType, setActivePinType] = useState<PolicePinType>("trainingArea");
	const [otherLabel, setOtherLabel] = useState("");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		pinsRef.current = pins;
	}, [pins]);
	useEffect(() => {
		activePinTypeRef.current = activePinType;
	}, [activePinType]);
	useEffect(() => {
		otherLabelRef.current = otherLabel;
	}, [otherLabel]);

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
						const type = activePinTypeRef.current;
						const label = type === "other" ? otherLabelRef.current.trim() : "";
						onChangePins([...pinsRef.current, { lat: event.latLng.lat(), lng: event.latLng.lng(), type, ...(label ? { label } : {}) }]);
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
		markersRef.current = pins.map(
			(pin) =>
				new google.maps.Marker({
					position: pin,
					map,
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						fillColor: pinTypeMeta(pin.type).color,
						fillOpacity: 1,
						strokeColor: "#ffffff",
						strokeWeight: 2,
						scale: 9,
					},
					label: pinTypeMeta(pin.type).shortLabel,
					title: pin.label || pinTypeMeta(pin.type).label,
				}),
		);
	}, [pins, reportType]);

	function removePin(index: number) {
		onChangePins(pins.filter((_, pinIndex) => pinIndex !== index));
	}

	if (!apiKey) {
		return (
			<div className="fixed inset-0 z-[60] flex items-center justify-center bg-white p-4">
				<div className="max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-lg">
					Google Maps er klart i koden, men `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` må settes i miljøet før kartet vises.
					<button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 font-semibold text-gray-950">Lukk kart</button>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-[60] bg-white">
			<div ref={mapRef} className="absolute inset-0 bg-gray-100" />
			<div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
				<div className="pointer-events-auto rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
					<div className="flex items-start justify-between gap-3">
						<div>
							<div className="text-xs uppercase tracking-wide text-gray-500">{reportType === "mission" ? "Mission Report" : "Training Report"}</div>
							<h2 className="text-base font-semibold text-gray-950">Marker område i kart</h2>
							<p className="text-xs text-gray-600">Velg type og trykk i kartet for å legge til punkt.</p>
						</div>
						<button type="button" onClick={onClose} className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700">Ferdig</button>
					</div>
					<div className="mt-3 grid grid-cols-3 gap-2">
						{PIN_TYPES.map((item) => (
							<button key={item.type} type="button" onClick={() => setActivePinType(item.type)} className={`rounded-xl border px-2 py-2 text-xs font-semibold ${activePinType === item.type ? "border-blue-500 bg-blue-50 text-blue-900" : "border-gray-200 bg-white text-gray-700"}`}>{item.label}</button>
						))}
					</div>
					{activePinType === "other" && <input value={otherLabel} onChange={(event) => setOtherLabel(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" placeholder="Tekst for Annet-punkt" />}
				</div>

				<div className="pointer-events-auto max-h-[36vh] overflow-y-auto rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
					{error && <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="font-medium text-gray-900">{pins.length} kartpunkt plassert</span>
						<button type="button" onClick={() => onChangePins([])} className="text-blue-700 underline">Nullstill</button>
					</div>
					<div className="mt-2 space-y-2">
						{pins.map((pin, index) => (
							<div key={`${pin.lat}-${pin.lng}-${index}`} className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-2 text-xs">
								<div>
									<div className="font-medium text-gray-900">{index + 1}. {pinTypeMeta(pin.type).label}{pin.label ? ` - ${pin.label}` : ""}</div>
									<div className="text-gray-600">{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</div>
								</div>
								<button type="button" onClick={() => removePin(index)} className="rounded-full border border-gray-300 bg-white px-2 py-1 text-gray-700">Slett</button>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}