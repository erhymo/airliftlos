import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function requireApiAccess(): Promise<NextResponse | null> {
	const accessCode = process.env.ACCESS_CODE;
	if (!accessCode) return null;
	const cookieStore = await cookies();
	const accessCookie = cookieStore.get("airliftlos_access");
	if (!accessCookie || accessCookie.value !== "ok") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}
	return null;
}