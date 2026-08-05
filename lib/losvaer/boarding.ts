const MAX_WAVE_M = 6;
const MAX_MEAN_WIND_KT = 55;
const SEASPRAY_WAVE_M = 4;
const HIGH_SEASPRAY_WAVE_M = 4.5;

export type LosvaerWeatherPoint = {
	time: string;
	windSpeedMs: number | null;
	gustMs: number | null;
	windFromDeg: number | null;
	thunderProbabilityPercent: number | null;
	seaSurfaceWaveHeightM: number | null;
	waveFromDeg: number | null;
	airTemperatureC: number | null;
	dewPointTemperatureC: number | null;
	lowCloudCoverPercent: number | null;
	totalCloudCoverPercent: number | null;
	precipitationMm: number | null;
};

export type CloudBaseEstimate = {
	status: "estimate" | "fog-risk" | "unknown";
	heightFt: number | null;
	lowCloudCoverPercent: number | null;
	label: string;
};

export type FlyingWindowResult = {
	status: "best-time" | "no-good-window" | "unknown";
	time: string | null;
	reason: string;
};

export type BoardingHeadingRecommendation = {
	headingDeg: number | null;
	speedKt: number | null;
	status: "recommended" | "no-go" | "limited-data";
	label: string;
	color: string;
	reason: string;
	notice: string | null;
	score: number | null;
};

export function normalizeDeg(value: number) {
	return ((value % 360) + 360) % 360;
}

export function flowDirectionFrom(fromDeg: number) {
	return normalizeDeg(fromDeg + 180);
}

export function angleDeltaDeg(fromDeg: number, toDeg: number) {
	return ((((fromDeg - toDeg + 180) % 360) + 360) % 360) - 180;
}

export function msToKnots(ms: number) {
	return ms * 1.9438444924;
}

export function compassDirection(deg: number) {
	const labels = ["N", "NNØ", "NØ", "ØNØ", "Ø", "ØSØ", "SØ", "SSØ", "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"];
	return labels[Math.round(normalizeDeg(deg) / 22.5) % labels.length];
}

const FOG_RISK_SPREAD_C = 0.5;
// Grov tommelfingerregel brukt i luftfart: skybase (fot) ≈ (temperatur − duggpunkt i °C) × 400.
const FT_PER_DEGREE_C_SPREAD = 400;

/**
 * Anslår skybase ut fra forskjellen mellom temperatur og duggpunkt fra samme
 * værmodell-data som vind/svell hentes fra. Ikke en målt verdi, kun et
 * meteorologisk anslag. `lowCloudCoverPercent` (modellens eget anslag for
 * lavskydekke) tas med som et ekstra, uavhengig signal for å vurdere hvor
 * mye man bør stole på anslaget.
 */
export function estimateCloudBase(point: LosvaerWeatherPoint | null): CloudBaseEstimate {
	const lowCloudCoverPercent = point?.lowCloudCoverPercent ?? null;

	if (!point || point.airTemperatureC == null || point.dewPointTemperatureC == null) {
		return { status: "unknown", heightFt: null, lowCloudCoverPercent, label: "Mangler temperatur-/duggpunktsdata" };
	}

	const spreadC = point.airTemperatureC - point.dewPointTemperatureC;

	if (spreadC <= FOG_RISK_SPREAD_C) {
		return { status: "fog-risk", heightFt: null, lowCloudCoverPercent, label: "Tåkefare (liten temperatur-/duggpunktsforskjell)" };
	}

	const heightFt = Math.round((spreadC * FT_PER_DEGREE_C_SPREAD) / 100) * 100;
	return { status: "estimate", heightFt, lowCloudCoverPercent, label: "Anslag basert på temperatur-/duggpunktsforskjell" };
}

const FLYING_WINDOW_HOURS = 10;

function meanWindMs(point: LosvaerWeatherPoint) {
	if (point.windSpeedMs == null && point.gustMs == null) return null;
	if (point.windSpeedMs == null) return point.gustMs;
	if (point.gustMs == null) return point.windSpeedMs;
	return (point.windSpeedMs + point.gustMs) / 2;
}

// Rangerer punktene mot hverandre i stedet for mot faste grenser, siden vi
// bare trenger å si "hvilket tidspunkt er best i perioden", ikke gi et presist tall.
function normalizedScore(values: Array<number | null>, index: number, higherIsBetter: boolean) {
	const value = values[index];
	if (value == null) return 0.5; // nøytral score når data mangler for dette tidspunktet

	const known = values.filter((v): v is number => v != null);
	const min = Math.min(...known);
	const max = Math.max(...known);
	if (max === min) return 1;

	const fraction = (value - min) / (max - min);
	return higherIsBetter ? fraction : 1 - fraction;
}

// Skybase trenger egen scoring: "tåkefare" og "mangler data" ser like ut som
// heightFt (begge null), men er ikke det samme – tåkefare er det dårligste
// utfallet for denne parameteren, ikke et nøytralt "vet ikke".
function cloudBaseScores(points: LosvaerWeatherPoint[]) {
	const estimates = points.map((point) => estimateCloudBase(point));
	const knownHeights = estimates
		.map((estimate) => (estimate.status === "estimate" ? estimate.heightFt : null))
		.filter((height): height is number => height != null);
	const min = knownHeights.length ? Math.min(...knownHeights) : null;
	const max = knownHeights.length ? Math.max(...knownHeights) : null;

	return estimates.map((estimate) => {
		if (estimate.status === "fog-risk") return 0;
		if (estimate.status === "unknown") return 0.5;
		if (min == null || max == null || max === min) return 1;
		return (estimate.heightFt! - min) / (max - min);
	});
}

/**
 * Finner tidspunktet med best kombinasjon av høy skybase, lite vind, lite
 * bølger og lite nedbør de neste FLYING_WINDOW_HOURS timene. Utelater
 * tidspunkt som uansett er "no-go" (for høyt svell/vind), og rangerer
 * resten relativt til hverandre i perioden – ikke mot et absolutt fasit-tall.
 */
export function findBestFlyingWindow(points: LosvaerWeatherPoint[]): FlyingWindowResult {
	const now = Date.now();
	const horizon = now + FLYING_WINDOW_HOURS * 60 * 60 * 1000;

	const candidates = points.filter((point) => {
		const time = Date.parse(point.time);
		return Number.isFinite(time) && time >= now && time <= horizon;
	});

	if (candidates.length === 0) {
		return { status: "unknown", time: null, reason: `Mangler værdata for de neste ${FLYING_WINDOW_HOURS} timene.` };
	}

	const flyable = candidates.filter((point) => calculateBoardingHeading(point).status !== "no-go");

	if (flyable.length === 0) {
		return { status: "no-good-window", time: null, reason: `Ingen gode flyvinduer de neste ${FLYING_WINDOW_HOURS} timene.` };
	}

	const cloudBase = cloudBaseScores(flyable);
	const windMs = flyable.map(meanWindMs);
	const waveM = flyable.map((point) => point.seaSurfaceWaveHeightM);
	const precipMm = flyable.map((point) => point.precipitationMm);

	let bestIndex = 0;
	let bestScore = Number.NEGATIVE_INFINITY;
	flyable.forEach((_, index) => {
		const score =
			cloudBase[index] +
			normalizedScore(windMs, index, false) +
			normalizedScore(waveM, index, false) +
			normalizedScore(precipMm, index, false);
		if (score > bestScore) {
			bestScore = score;
			bestIndex = index;
		}
	});

	return {
		status: "best-time",
		time: flyable[bestIndex].time,
		reason: "Beste kombinasjon av skybase, vind, bølger og nedbør i perioden.",
	};
}

export function calculateBoardingHeading(point: LosvaerWeatherPoint | null): BoardingHeadingRecommendation {
	if (!point) return limited("Mangler værdata for valgt plass.");
	const waveHeightM = point.seaSurfaceWaveHeightM;
	const waveFromDeg = point.waveFromDeg ?? null;
	const windFromDeg = point.windFromDeg ?? null;
	const meanWindKt = point.windSpeedMs == null ? null : msToKnots(point.windSpeedMs);
	if (waveHeightM != null && waveHeightM > MAX_WAVE_M) return noGo(`Svell ${waveHeightM.toFixed(1)} m er over maks ${MAX_WAVE_M} m.`);
	if (meanWindKt != null && meanWindKt > MAX_MEAN_WIND_KT) return noGo(`Middelvind ${meanWindKt.toFixed(0)} kt er over maks ${MAX_MEAN_WIND_KT} kt.`);
	if (waveFromDeg == null && windFromDeg == null) return limited("Mangler retning for både svell og vind.");

	const lowWaveWindDominant = waveHeightM != null && waveHeightM < 1 && meanWindKt != null && meanWindKt >= 25;
	const seasprayMode = waveHeightM != null && waveHeightM >= SEASPRAY_WAVE_M;
	const strongWindMode = meanWindKt != null && meanWindKt >= 45;
	const preferDownwind = !lowWaveWindDominant && windFromDeg != null && (strongWindMode || (seasprayMode && meanWindKt != null && meanWindKt >= 20));
	let bestHeading = 0;
	let bestScore = Number.POSITIVE_INFINITY;
	for (let heading = 0; heading < 360; heading += 1) {
		const score = scoreHeading({ heading, waveHeightM, waveFromDeg, meanWindKt, windFromDeg, lowWaveWindDominant, preferDownwind });
		if (score < bestScore) {
			bestScore = score;
			bestHeading = heading;
		}
	}
	return { headingDeg: bestHeading, speedKt: recommendedSpeedKt(waveHeightM, meanWindKt), status: "recommended", label: "Anbefalt", color: seasprayMode ? "#facc15" : "#38bdf8", reason: reasonText({ waveHeightM, meanWindKt, preferDownwind, lowWaveWindDominant }), notice: noticeText({ meanWindKt, preferDownwind }), score: Math.round(bestScore * 100) / 100 };
}

function scoreHeading(input: { heading: number; waveHeightM: number | null; waveFromDeg: number | null; meanWindKt: number | null; windFromDeg: number | null; lowWaveWindDominant: boolean; preferDownwind: boolean }) {
	let score = 0;
	if (input.waveFromDeg != null && input.waveHeightM != null) {
		const waveAxisDeg = axisAngleDeg(input.waveFromDeg, input.heading);
		const rollPenalty = Math.sin((waveAxisDeg * Math.PI) / 180) ** 2;
		score += waveWeight(input.waveHeightM) * rollPenalty;
	}
	if (input.windFromDeg != null && input.meanWindKt != null) {
		const relativeWindDeg = Math.abs(angleDeltaDeg(input.windFromDeg, input.heading));
		const windPenalty = input.preferDownwind ? downwindPenalty(relativeWindDeg) : bowWindPenalty(relativeWindDeg);
		score += windWeight(input.meanWindKt, input.waveHeightM, input.lowWaveWindDominant, input.preferDownwind) * windPenalty;
	}
	return score;
}

function axisAngleDeg(fromDeg: number, headingDeg: number) {
	const relative = Math.abs(angleDeltaDeg(fromDeg, headingDeg));
	return Math.min(relative, 180 - relative);
}

function bowWindPenalty(relativeWindDeg: number) {
	if (relativeWindDeg <= 45) return 0;
	if (relativeWindDeg >= 150) return 0.45;
	return Math.min(1.25, ((relativeWindDeg - 45) / 45) ** 2);
}

function downwindPenalty(relativeWindDeg: number) {
	const relativeRad = (relativeWindDeg * Math.PI) / 180;
	const sidePenalty = Math.sin(relativeRad) ** 2;
	const bowBiasPenalty = (1 + Math.cos(relativeRad)) / 2;
	return sidePenalty + bowBiasPenalty * 0.45;
}

function waveWeight(waveHeightM: number) {
	if (waveHeightM < 1) return 0.7;
	if (waveHeightM < SEASPRAY_WAVE_M) return 4.5;
	if (waveHeightM < HIGH_SEASPRAY_WAVE_M) return 9;
	return 14;
}

function windWeight(meanWindKt: number, waveHeightM: number | null, lowWaveWindDominant: boolean, preferDownwind: boolean) {
	if (lowWaveWindDominant) return 8;
	if (preferDownwind) return meanWindKt >= 45 ? 6 : 4.5;
	if (waveHeightM == null) return 7;
	if (waveHeightM >= SEASPRAY_WAVE_M) return 2.3;
	if (waveHeightM >= 1) return 3.2;
	return meanWindKt >= 25 ? 6.5 : 3.5;
}

function recommendedSpeedKt(waveHeightM: number | null, meanWindKt: number | null) {
	if (waveHeightM != null && waveHeightM >= SEASPRAY_WAVE_M) {
		if (meanWindKt != null && meanWindKt >= 45) return 12;
		if (meanWindKt != null && meanWindKt >= 20) return 8;
		return 5;
	}
	if (meanWindKt != null && meanWindKt >= 45) return 12;
	return 8;
}

function reasonText(input: { waveHeightM: number | null; meanWindKt: number | null; preferDownwind: boolean; lowWaveWindDominant: boolean }) {
	if (input.lowWaveWindDominant) return "Lite svell og tydelig vind: prioriterer vind på baug.";
	if (input.preferDownwind && input.meanWindKt != null && input.meanWindKt >= 45) return "Sterk middelvind: anbefaler skipet med vinden.";
	if (input.preferDownwind) return "Seaspray-modus: prioriterer roll og skipet med vind/svell.";
	if (input.waveHeightM != null && input.waveHeightM >= SEASPRAY_WAVE_M) return "Prioriterer lav roll ved høyt svell.";
	return "Prioriterer lav roll og vind på baug innen 45° når mulig.";
}

function noticeText(input: { meanWindKt: number | null; preferDownwind: boolean }) {
	if (!input.preferDownwind) return null;
	if (input.meanWindKt != null && input.meanWindKt >= 45) return "Anbefaler med vinden pga. sterk middelvind.";
	return "Anbefaler med vind/svell pga. fare for sjøsprøyt.";
}

function limited(reason: string): BoardingHeadingRecommendation {
	return { headingDeg: null, speedKt: null, status: "limited-data", label: "Mangler data", color: "#94a3b8", reason, notice: null, score: null };
}

function noGo(reason: string): BoardingHeadingRecommendation {
	return { headingDeg: null, speedKt: null, status: "no-go", label: "Ikke heis", color: "#ef4444", reason, notice: null, score: null };
}