import type { Firestore } from "firebase-admin/firestore";

type LosBookingStatusData = {
	status?: string | null;
};

export function isOpenLosBooking(data: LosBookingStatusData) {
	return data.status !== "closed" && data.status !== "cancelled";
}

export async function getOpenLosBookingsSnapshot(db: Firestore) {
	try {
		return await db
			.collection("losBookings")
			.where("status", "==", "open")
			.orderBy("createdAt", "desc")
			.get();
	} catch (error) {
		console.error(
			"losBookings: optimalisert Firestore-spørring for åpne bestillinger feilet, bruker fallback som henter alle dokumenter",
			error,
		);
		return db.collection("losBookings").orderBy("createdAt", "desc").get();
	}
}