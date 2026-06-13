export type LosvaerPlace = {
	id: string;
	name: string;
	lat: number;
	lon: number;
	coordinateLabel: string;
	description: string;
};

export const losvaerPlaces: LosvaerPlace[] = [
	{
		id: "holmengra",
		name: "Holmengrå",
		lat: 60.85,
		lon: 4.431667,
		coordinateLabel: "60°51.00'N 004°25.90'E",
		description: "Vurdering av vind, svell og anbefalt skipsretning for boarding.",
	},
	{
		id: "fruholmen",
		name: "Fruholmen",
		lat: 70.972259,
		lon: 23.51031,
		coordinateLabel: "70.972259°N 023.510310°E",
		description: "Losbordingsfelt med vurdering av vind, svell og anbefalt skipsretning.",
	},
	{
		id: "skudefjorden",
		name: "Skudefjorden",
		lat: 59.0333,
		lon: 5.1666,
		coordinateLabel: "59.033300°N 005.166600°E",
		description: "Vurdering av vind, svell og anbefalt skipsretning for boarding.",
	},
];

export function getLosvaerPlaceById(id: string) {
	return losvaerPlaces.find((place) => place.id === id) ?? null;
}