import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/firebaseAdmin";

type FirestoreDriftsReport = {
	id: string;
	[key: string]: unknown;
};

export async function GET() {
  const accessCode = process.env.ACCESS_CODE;

  if (accessCode) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get("airliftlos_access");
    if (!accessCookie || accessCookie.value !== "ok") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

	  try {
	    const db = getDb();
	    const snapshot = await db
	      .collection("driftsrapporter")
	      .orderBy("createdAt", "desc")
	      .get();

	    const reports: FirestoreDriftsReport[] = snapshot.docs.map((doc) => {
	      const data = doc.data() as Record<string, unknown>;
	      return {
	        id: doc.id,
	        ...data,
	      };
	    });

	    return NextResponse.json({ ok: true, reports });
	  } catch (error) {
    console.error("Failed to fetch driftsrapporter from Firestore", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente driftsrapporter fra Firestore" },
      { status: 500 }
    );
  }
}


export async function DELETE(req: Request) {
	const accessCode = process.env.ACCESS_CODE;

	if (accessCode) {
		const cookieStore = await cookies();
		const accessCookie = cookieStore.get("airliftlos_access");
		if (!accessCookie || accessCookie.value !== "ok") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
		}
	}

	let payload: { id?: string };
	try {
		payload = (await req.json()) as { id?: string };
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const { id } = payload;
	if (!id || typeof id !== "string") {
		return NextResponse.json({ error: "Missing id" }, { status: 400 });
	}

	try {
		const db = getDb();
		await db.collection("driftsrapporter").doc(id).delete();
		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("Failed to delete driftsrapport from Firestore", error);
		return NextResponse.json(
			{
				ok: false,
				error: "Klarte ikke å slette driftsrapport fra Firestore",
			},
			{ status: 500 }
		);
	}
}

