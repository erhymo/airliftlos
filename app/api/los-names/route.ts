import { NextResponse } from "next/server";
import { getDb } from "../../../lib/firebaseAdmin";

const COLLECTION_NAME = "losNames";

type LosNameDoc = {
  name: string;
};

export async function GET() {
  try {
    const db = getDb();
    const snapshot = await db.collection(COLLECTION_NAME).get();

    const names: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Partial<LosNameDoc>;
      if (data.name && typeof data.name === "string") {
        names.push(data.name.trim());
      }
    });

    const uniqueSorted = Array.from(new Set(names))
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b, "nb-NO"));

    return NextResponse.json({ ok: true, names: uniqueSorted });
  } catch (error) {
    console.error("LOS-names API: Klarte ikke å hente los-navn", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å hente los-navn." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { names?: unknown } | undefined;

    const rawNames = Array.isArray(body?.names) ? body?.names : [];
    const cleanedNames = rawNames
      .filter((n): n is string => typeof n === "string")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (cleanedNames.length === 0) {
      return NextResponse.json({ ok: true, names: [] });
    }

    const unique = Array.from(new Set(cleanedNames));

    const db = getDb();
    const col = db.collection(COLLECTION_NAME);

    await Promise.all(
      unique.map((name) =>
        // Bruk selve navnet som dokument-ID. Firestore støtter mellomrom,
        // og dette gjør det enkelt å unngå duplikater.
        col.doc(name).set({ name }, { merge: true }),
      ),
    );

    return NextResponse.json({ ok: true, names: unique });
  } catch (error) {
    console.error("LOS-names API: Klarte ikke å lagre los-navn", error);
    return NextResponse.json(
      { ok: false, error: "Klarte ikke å lagre los-navn." },
      { status: 500 },
    );
  }
}
