// Lav-presisjons sol-/månebane-formler (basert på Jean Meeus' "Astronomical
// Algorithms" og aa.quae.nl), samme type formler som brukes i mange
// åpne måne-verktøy. Nøyaktig nok til et NVG-lysanslag, ikke ment som
// et presist astronomisk verktøy.

const RAD = Math.PI / 180;
const DAY_MS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;
const SUN_DISTANCE_KM = 149598000;

function toDays(date: Date) {
	const julian = date.valueOf() / DAY_MS - 0.5 + J1970;
	return julian - J2000;
}

function rightAscension(eclipticLon: number, eclipticLat: number) {
	return Math.atan2(
		Math.sin(eclipticLon) * Math.cos(OBLIQUITY) - Math.tan(eclipticLat) * Math.sin(OBLIQUITY),
		Math.cos(eclipticLon),
	);
}

function declination(eclipticLon: number, eclipticLat: number) {
	return Math.asin(
		Math.sin(eclipticLat) * Math.cos(OBLIQUITY) + Math.cos(eclipticLat) * Math.sin(OBLIQUITY) * Math.sin(eclipticLon),
	);
}

function siderealTimeRad(d: number, longitudeRad: number) {
	return RAD * (280.16 + 360.9856235 * d) + longitudeRad;
}

function altitudeFromHourAngle(hourAngle: number, latRad: number, dec: number) {
	return Math.asin(Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(hourAngle));
}

function sunCoords(d: number) {
	const meanAnomaly = RAD * (357.5291 + 0.98560028 * d);
	const center = RAD * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly));
	const perihelion = RAD * 102.9372;
	const eclipticLon = meanAnomaly + center + perihelion + Math.PI;
	return { ra: rightAscension(eclipticLon, 0), dec: declination(eclipticLon, 0) };
}

function moonCoords(d: number) {
	const eclipticLon = RAD * (218.316 + 13.176396 * d);
	const meanAnomaly = RAD * (134.963 + 13.064993 * d);
	const meanDistance = RAD * (93.272 + 13.22935 * d);

	const l = eclipticLon + RAD * 6.289 * Math.sin(meanAnomaly);
	const b = RAD * 5.128 * Math.sin(meanDistance);
	const distanceKm = 385001 - 20905 * Math.cos(meanAnomaly);

	return { ra: rightAscension(l, b), dec: declination(l, b), distanceKm };
}

export type MoonState = {
	/** Hvor stor andel av måneskiven som er opplyst, 0–100 %. */
	illuminationPercent: number;
	/** Månens høyde over horisonten i grader. Negativ = under horisonten. */
	altitudeDeg: number;
};

export function getMoonState(date: Date, latitude: number, longitude: number): MoonState {
	const d = toDays(date);
	const sun = sunCoords(d);
	const moon = moonCoords(d);

	const elongation = Math.acos(
		Math.sin(sun.dec) * Math.sin(moon.dec) + Math.cos(sun.dec) * Math.cos(moon.dec) * Math.cos(sun.ra - moon.ra),
	);
	const phaseAngle = Math.atan2(
		SUN_DISTANCE_KM * Math.sin(elongation),
		moon.distanceKm - SUN_DISTANCE_KM * Math.cos(elongation),
	);
	const illuminatedFraction = (1 + Math.cos(phaseAngle)) / 2;

	const latRad = RAD * latitude;
	const lonRad = RAD * longitude;
	const hourAngle = siderealTimeRad(d, lonRad) - moon.ra;
	const altitudeRad = altitudeFromHourAngle(hourAngle, latRad, moon.dec);

	return {
		illuminationPercent: Math.round(illuminatedFraction * 100),
		altitudeDeg: altitudeRad / RAD,
	};
}

// Månen bidrar mer jo høyere den står; ved og under horisonten bidrar den ikke.
const MOON_ALTITUDE_FULL_EFFECT_DEG = 40;
// Skyer blokkerer det meste av måne-/stjernelys, men sjelden 100 %.
const MAX_CLOUD_BLOCK_FRACTION = 0.9;

/**
 * Grovt, ikke-vitenskapelig anslag (0–100 %) på hvor mye naturlig lys som er
 * tilgjengelig for NVG – kombinerer månens opplysningsgrad, høyde over
 * horisonten og skydekke. Ment som et utgangspunkt for planlegging, ikke en
 * målt verdi.
 */
export function estimateNvgLightPercent(moon: MoonState, cloudCoverPercent: number | null): number {
	const altitudeFactor = Math.max(0, Math.min(1, moon.altitudeDeg / MOON_ALTITUDE_FULL_EFFECT_DEG));
	const moonContribution = moon.illuminationPercent * altitudeFactor;

	const cloudFraction = cloudCoverPercent == null ? 0 : Math.max(0, Math.min(100, cloudCoverPercent)) / 100;
	const cloudFactor = 1 - cloudFraction * MAX_CLOUD_BLOCK_FRACTION;

	return Math.round(moonContribution * cloudFactor);
}
