// Engangsscript for å:
// 1) Les...FDATER GT for alle båter der vi allerede har GT i losBookings
// 2) Eksportere en CSV med alle fartøy + nåværende GT, klar for VesselFinder-sjekk

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");

// Last inn .env.* slik Next gjør, slik at FIREBASE_*-variabler blir tilgjengelige
try {
	const { loadEnvConfig } = require("@next/env");
  loadEnvConfig(process.cwd());
} catch (e) {
  console.warn("Kunne ikke laste @next/env. Forutsetter at FIREBASE_*-variabler allerede er satt i miljøet.");
}

// Minimal kopi av lib/firebaseAdmin.ts for bruk i dette Node-scriptet (JS)
// Vi vil ikke importere TypeScript-filer direkte her.
const { cert, getApp, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

let cachedDb = null;

function getDb() {
  if (cachedDb) return cachedDb;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Mangler en eller flere Firebase-variabler (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)",
    );
  }

  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });

  cachedDb = getFirestore(app);
  return cachedDb;
}

// Kopi av normalizeVesselKey fra lib/vesselGt.ts (tilpasset til ren JS)
function normalizeVesselKey(raw) {
  if (!raw || typeof raw !== "string") return "";

  let name = raw.toUpperCase();

  // Fjern eventuelle innrammende anførselstegn
  name = name.replace(/^"+|"+$/g, "");

  // Fjern eventuelle koder/registreringer i parentes til slutt,
  // f.eks. "ALFA FINLANDIA (C6D7Y)" -> "ALFA FINLANDIA".
  name = name.replace(/\s*\([^)]*\)\s*$/, "");

  // Normaliser mellomrom
  name = name.replace(/\s+/g, " ").trim();

  // Håndter noen kjente skrivevarianter (samme som i lib/vesselGt.ts)
  if (name === "THORM HANNAH") name = "TORM HANNAH";
  if (name === "JARLI") name = "JAARLI";
  if (name === "HAFINA LOIRE") name = "HAFNIA LOIRE";
  if (name === "HAFNA LOIRE") name = "HAFNIA LOIRE";
  if (name === "NAVIQ 8 GUIDE") name = "NAVIG8 GUIDE";
  if (name === "RAM DF") name = "RAN DF";
  if (name === "DF MONMATRE") name = "DF MONTMARTRE";
  if (name === "DF MOTMARTRE") name = "DF MONTMARTRE";
  if (name === "COSLPROSPECTOR") name = "COSL PROSPECTOR";
  if (name === "HANIA LOIRE") name = "HAFNIA LOIRE";
  if (name === "PAUL B. LOYD") name = "PAUL B. LOYD JR";
  if (name === "ARTICA") name = "ARCTICA";
  if (name === "MARAN TIDA") name = "MARAN TIDE";
  if (name === "ST CLEMENS") name = "ST. CLEMENTS";
  if (name === "ST CLEMENTS") name = "ST. CLEMENTS";
  if (name === "ZARHA") name = "ZAHRA";
  if (name === "MARAN GAS ACHILLES") name = "MARAN GAS ACHILLES";
  if (name === "NORDIC CYGNUS") name = "NORDIC CYGNUS";
  if (name === "COUNT") name = "COUNT";
  if (name === "FRONT ORINOCO") name = "FRONT ORINOCO";
  if (name === "FRONT SIRIUS") name = "FRONT SIRIUS";

  return name;
}

// Kopi av parseGt fra app/api/statistics/route.ts (tilpasset til JS)
function parseGt(value) {
  if (typeof value === "number") {
    if (Number.isNaN(value)) return null;
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.replace(/\s+/g, "").replace(",", ".");
    const parsed = Number.parseFloat(trimmed);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }
  return null;
}

async function main() {
  const db = getDb();

  console.log("[vesselGt-backfill] Leser eksisterende vesselGt-dokumenter...");
  const vesselGtSnap = await db.collection("vesselGt").get();
  const vesselGtByKey = new Map();

  vesselGtSnap.forEach((doc) => {
    const data = doc.data() || {};
    const key = doc.id;
    vesselGtByKey.set(key, data);
  });

  console.log(
    `[vesselGt-backfill] Fant ${vesselGtByKey.size} eksisterende vesselGt-dokumenter.`,
  );

  console.log("[vesselGt-backfill] Leser alle losBookings...");
  const bookingsSnap = await db.collection("losBookings").get();
  console.log(`[vesselGt-backfill] Antall losBookings: ${bookingsSnap.size}`);

  const candidates = new Map(); // key -> { name, gts: Set<number>, bookingCount }

  bookingsSnap.forEach((doc) => {
    const data = doc.data() || {};

    const rawName =
      typeof data.vesselName === "string" && data.vesselName.trim().length > 0
        ? data.vesselName.trim()
        : "";
    if (!rawName) return;

    const key = normalizeVesselKey(rawName);
    if (!key) return;
    if (key === "UKJENT" || key === "UKJENT FARTØY" || key === "UNKNOWN") return;

    const directGt = parseGt(data.gt ?? null);
    const adminGt = parseGt(
      data.adminRowData && typeof data.adminRowData.gt !== "undefined"
        ? data.adminRowData.gt
        : null,
    );
    const gt = directGt != null ? directGt : adminGt;

    let entry = candidates.get(key);
    if (!entry) {
      entry = { name: rawName, gts: new Set(), bookingCount: 0 };
      candidates.set(key, entry);
    }
    entry.bookingCount += 1;
    if (gt != null) {
      entry.gts.add(gt);
    }
  });

  console.log(
    `[vesselGt-backfill] Antall unike fartøysnøkler funnet i losBookings: ${candidates.size}`,
  );

  // Oppdater vesselGt med nye nøkler der vi har GT, men ikke allerede har et dokument.
  const updates = [];

  for (const [key, entry] of candidates.entries()) {
    const existing = vesselGtByKey.get(key);
    if (existing && typeof existing.gt === "number" && !Number.isNaN(existing.gt)) {
      // Vi lar eksisterende vesselGt stå; endelig VesselFinder-import vil uansett kunne overskrive senere.
      continue;
    }

    if (entry.gts.size === 0) continue;

    const uniqueGts = Array.from(entry.gts.values());
    let chosenGt = uniqueGts[0];
    if (uniqueGts.length > 1) {
      // Hvis det er flere forskjellige verdier, logg en advarsel og velg maks som et enkelt kompromiss.
      const maxGt = Math.max(...uniqueGts);
      console.warn(
        `[vesselGt-backfill] Flere ulike GT-verdier for ${key}: ${uniqueGts.join(", ")} -> velger ${maxGt}`,
      );
      chosenGt = maxGt;
    }

    updates.push({ key, name: entry.name, gt: chosenGt });
  }

  console.log(
    `[vesselGt-backfill] Antall nye/oppdaterbare vesselGt-dokumenter basert på losBookings: ${updates.length}`,
  );

  for (const u of updates) {
    const ref = db.collection("vesselGt").doc(u.key);
    await ref.set(
      {
        name: u.name,
        key: u.key,
        gt: u.gt,
        source: "booking",
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  }

  console.log("[vesselGt-backfill] Ferdig med å skrive vesselGt-basert backfill.");

  // Oppdater vesselGtByKey med de nye verdiene slik at eksporten bruker ferske tall
  const refreshedSnap = await db.collection("vesselGt").get();
  vesselGtByKey.clear();
  refreshedSnap.forEach((doc) => {
    const data = doc.data() || {};
    vesselGtByKey.set(doc.id, data);
  });

  // Bygg komplett liste over alle fartøy vi kjenner til (fra vesselGt og fra bookings)
  const allKeys = new Set();
  for (const key of vesselGtByKey.keys()) {
    allKeys.add(key);
  }
  for (const key of candidates.keys()) {
    allKeys.add(key);
  }

  const sortedKeys = Array.from(allKeys.values()).sort();

  const header = [
    "name",
    "key",
    "bookingCount",
    "currentGt",
    "source",
    "vesselfinderGt",
  ];

  const rows = [header.join(";")];

  for (const key of sortedKeys) {
    if (!key || key === "UKJENT" || key === "UKJENT FARTØY" || key === "UNKNOWN") {
      continue;
    }

    const vesselEntry = vesselGtByKey.get(key) || {};
    const candidateEntry = candidates.get(key) || {
      name: key,
      gts: new Set(),
      bookingCount: 0,
    };

    const name =
      (typeof vesselEntry.name === "string" && vesselEntry.name.trim().length > 0
        ? vesselEntry.name.trim()
        : candidateEntry.name) || key;

    let currentGt = null;
    let source = "";

    if (typeof vesselEntry.gt === "number" && !Number.isNaN(vesselEntry.gt)) {
      currentGt = vesselEntry.gt;
      source = typeof vesselEntry.source === "string" ? vesselEntry.source : "db";
    } else if (candidateEntry.gts && candidateEntry.gts.size > 0) {
      const values = Array.from(candidateEntry.gts.values());
      currentGt = values[0];
      source = "booking";
    }

    const bookingCount = candidateEntry.bookingCount || 0;

    rows.push(
      [
        name.replace(/;/g, ","),
        key,
        String(bookingCount),
        currentGt != null ? String(currentGt) : "",
        source,
        "", // vesselfinderGt fylles inn manuelt senere
      ].join(";"),
    );
  }

  const outPath = path.join(process.cwd(), "airliftlos logger", "vesselGt_export_for_vesselfinder.csv");
  fs.writeFileSync(outPath, rows.join("\n"), "utf8");

  console.log(
    `[vesselGt-backfill] Skrev eksport-CSV med ${rows.length - 1} fartøy til: ${outPath}`,
  );
}

main()
  .then(() => {
    console.log("[vesselGt-backfill] Ferdig uten fatale feil.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[vesselGt-backfill] FEIL:", err);
    process.exit(1);
  });
