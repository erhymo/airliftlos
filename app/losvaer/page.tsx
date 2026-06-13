import { losvaerPlaces } from "@/lib/losvaer/places";
import LosvaerDashboardClient from "./LosvaerDashboardClient";

export default function LosvaerPage() {
	return <LosvaerDashboardClient places={losvaerPlaces} />;
}
