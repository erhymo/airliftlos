import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/firebaseAdmin";

export const runtime = "nodejs";

// Engangs-jobb for å fylle inn techlogNumber på historiske LOS-bookinger.
// Kjøres kun i utvikling (deaktivert i produksjon).

type Mapping = {
  vesselName: string;
  techlogNumbers: number[];
};

const MAPPINGS: Mapping[] = [
  { vesselName: "SEAGALAXY", techlogNumbers: [80464, 80466] },
  { vesselName: "ARCTIC AURORA", techlogNumbers: [90209] },
  { vesselName: "ATLANTIC JADE", techlogNumbers: [80464] },
  { vesselName: "ALFA FINLANDIA", techlogNumbers: [80465] },
  { vesselName: "STENA SURPRISE", techlogNumbers: [80465] },
  { vesselName: "SOLA TS", techlogNumbers: [80466] },
  { vesselName: "MARAN AMUNDSEN", techlogNumbers: [80466] },
];

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "Disabled in production" },
      { status: 403 },
    );
  }

  const db = getDb();

  const snapshot = await db
    .collection("losBookings")
    .where("status", "==", "closed")
    .get();

  type DocWrap = {
    id: string;
    data: Record<string, unknown>;
  };

  const docs: DocWrap[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    data: doc.data() as Record<string, unknown>,
  }));

  const updates: Array<{
    id: string;
    vesselName: string;
    date: string;
    techlogNumber: number;
  }> = [];

  const warnings: string[] = [];

  for (const mapping of MAPPINGS) {
    const targetName = mapping.vesselName.toUpperCase();

    const matching = docs.filter((d) => {
      const vesselRaw = d.data.vesselName;
      const techlog = d.data.techlogNumber as unknown;
      const vessel =
        typeof vesselRaw === "string" ? vesselRaw.toUpperCase().trim() : "";
      const hasTechlog =
        techlog !== undefined && techlog !== null && techlog !== "";
      return vessel === targetName && !hasTechlog;
    });

    if (matching.length === 0) {
      warnings.push(
        `Fant ingen lukkede bookinger uten techlogNumber for ${mapping.vesselName}`,
      );
      continue;
    }

    const sorted = matching.slice().sort((a, b) => {
      const da = typeof a.data.date === "string" ? a.data.date : "";
      const db = typeof b.data.date === "string" ? b.data.date : "";
      return da.localeCompare(db);
    });

    const count = Math.min(sorted.length, mapping.techlogNumbers.length);

    if (sorted.length > mapping.techlogNumbers.length) {
      warnings.push(
        `Flere bookinger (${sorted.length}) enn techlog-numre (${mapping.techlogNumbers.length}) for ${mapping.vesselName} – noen blir stående uten nummer`,
      );
    }

    for (let i = 0; i < count; i += 1) {
      const doc = sorted[i];
      const techlogNumber = mapping.techlogNumbers[i];
      const date = typeof doc.data.date === "string" ? doc.data.date : "";

      await db
        .collection("losBookings")
        .doc(doc.id)
        .set({ techlogNumber }, { merge: true });

      updates.push({
        id: doc.id,
        vesselName: mapping.vesselName,
        date,
        techlogNumber,
      });
    }
  }

  return NextResponse.json({ ok: true, updates, warnings });
}

