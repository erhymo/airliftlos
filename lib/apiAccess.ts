import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function requireApiAccess(): Promise<NextResponse | null> {
	const accessCode = process.env.ACCESS_CODE;
	if (!accessCode) {
		// Kun lov å hoppe over sjekken utenfor produksjon (lokal npm run dev).
		// I produksjon/preview skal en manglende ACCESS_CODE alltid nekte tilgang, ikke tillate den.
		if (process.env.NODE_ENV !== "production") return null;
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}
	const cookieStore = await cookies();
	const accessCookie = cookieStore.get("airliftlos_access");
	if (!accessCookie || accessCookie.value !== "ok") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}
	return null;
}