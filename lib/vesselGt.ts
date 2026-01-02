import { getDb } from "./firebaseAdmin";

export function normalizeVesselKey(raw: string): string {
  let name = raw.toUpperCase();

  // Fjern eventuelle innrammende anførselstegn
  name = name.replace(/^"+|"+$/g, "");

  // Fjern eventuelle koder/registreringer i parentes til slutt,
  // f.eks. "ALFA FINLANDIA (C6D7Y)" -> "ALFA FINLANDIA".
  name = name.replace(/\s*\([^)]*\)\s*$/, "");

  // Normaliser mellomrom
  name = name.replace(/\s+/g, " ").trim();

	  // Håndter noen kjente skrivevarianter
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
	  if (name === "DEEPSEABABERDEEN") name = "DEEPSEA ABERDEEN";
	  if (name === "DEEPSEAABERDEEN") name = "DEEPSEA ABERDEEN";
	  if (name === "SOLITAIR") name = "SOLITAIRE";
	  if (name === "ALFANOURIOS") name = "AIFANOURIOS";
	  if (name === "AFANOURIOS") name = "AIFANOURIOS";
	  if (name === "EAGEL BALDER") name = "EAGLE BALDER";
	  if (name === "PACHIFIC EMERALD") name = "PACIFIC EMERALD";
	  if (name === "MAITIME VALOR") name = "MARITIME VALOR";
	  if (name === "ATLANTTIC JADE") name = "ATLANTIC JADE";
	  if (name === "ATLANTIV JADE") name = "ATLANTIC JADE";
	  if (name === "AQUQFREEDOM") name = "AQUAFREEDOM";
	  if (name === "KMARINE RIGOUR") name = "KMARIN RIGOUR";
	  if (name === "LEONTHIOS") name = "LEONTIOS H";
	  if (name === "SEAPEAK MAGILAN") name = "SEAPEAK MAGELLAN";
	  if (name === "DIMONDWAY") name = "DIAMONDWAY";
	  if (name === "ARCTIC PRINSESS") name = "ARCTIC PRINCESS";
	  if (name === "KMARIN RECORSE") name = "KMARIN RESOURCE";
	  if (name === "KMARINE RESOURCE") name = "KMARIN RESOURCE";
	  if (name === "ANDREAN SUN") name = "ANDEAN SUN";
	  if (name === "ALTHERA THULE") name = "ALTERA THULE";
	  if (name === "NJORD DF") name = "NJORD DF";
	  if (name === "Njord DF") name = "NJORD DF";
	  if (name === "MARAN HERMION") name = "MARAN HERMIONE";
	  if (name === "MARE NORSTRUM") name = "MARE NOSTRUM";
	  if (name === "ARTCTICA") name = "ARCTICA";
	  if (name === "TORILL KNUDSEN") name = "TORILL KNUTSEN";
	  if (name === "ALICANTE") name = "ATLANTIS ALICANTE";
	  if (name === "SEAWAYS TRIO") name = "SEAWAYS FRIO";

  return name;
}

const SEEDED_VESSEL_GT_RAW: Record<string, number> = {
  "ARCTIC AURORA": 100236,
  "HAIFENG": 62508,
  "RAN DF": 64461,
  "COBALT SUN": 64200,
  "PACIFIC EMERALD": 63555,
  "THORNBURY": 56115,
  "TORM HANNAH": 64245,
  "MARAN CURRENT": 85329,
  "SOLA TS": 62557,
  "NORDIC CYGNUS": 80779,
  "PENELOP": 63448,
  "ORCA PEARL": 59408,
  "OSLO TS": 62557,
  "LUZON SPIRIT": 60193,
  "MARAN TIDE": 85329,
  "JAARLI": 63532,
  "KMARIN RESOLUTION": 64309,
  "LANCING": 57164,
  "EAGLE BARENTS": 88099,
  "STAVANGER STAR": 62930,
  "PACIFIC GARNET": 63555,
  "NAVIG8 PASSION": 63338,
  "ADVANTAGE ATOM": 61668,
  "ARCTIC LADY": 121597,
  "SCOTT SPIRIT": 66563,
  "NORDIC TELLUS": 80779,
  "UNITY VENTURE": 60264,
  "ARCTIC DISCOVERER": 118571,
  "ALFA ALANDIA": 57164,
  "MARAN AMUNDSEN": 66563,
  "ALFA FINLANDIA": 60152,
  "SEAGALAXY": 63513,
  "ATLANTIC JADE": 64933,
  "STENA SURPRISE": 81299,
  "CATALAN SEA": 64089,
  "HILDA KNUTSEN": 80850,
  "EVRIDIKI": 42048,
  "JATULI": 63532,
  "HAFNIA LOIRE": 65145,
  "AL BATEEN": 65631,
  "AURORA SPIRIT": 85329,
  "KMARIN RELIANCE": 64309,
  "ATLANTIC DIAMOND": 62716,
  "FRONT ANTARES": 62849,
  "SAKURA GAS": 47964,
  "EAGLE BINTULU": 62150,
  "BERGEN TS": 62557,
  "FLOATEL SUPERIOR": 27920,
  "VIOLANDO": 84795,
  "DF MONTMARTRE": 65145,
  "JAL KAILASH": 29696,
  "CSK VANGUARD": 63497,
  "CAPE BENAT": 84160,
  "SAIPEM 7000": 117812,
  "STENA DON": 27851,
  "ASPEN": 62172,
  "ARCTIC VOYAGER": 118571,
  "BALLA": 62350,
  "SWORD": 57164,
  "EFFIE MAERSK": 85445,
  "BODIL KNUTSEN": 93759,
  "PEARY SPIRIT": 67188,
  "STI BROADWAY": 64875,
  "TRANSOCEAN ENABLER": 44143,
  "EAGLE BERGEN": 82789,
  "PARTHENON TS": 62557,
  "KAUPANG": 26614,
  "MARAN ORPHEUS": 84655,
  "NAVIG8 GUIDE": 30237,
	  "SEAPEAK MAGELLAN": 104484,
	  "RAINBOW SPIRIT": 85329,
	  "DELTA MED": 85522,
	  "SLEIPNIR": 187987,
	  "LEONTIOS H": 62557,
	  "ESTRELLA": 57312,
  "KANARIS 21": 81110,
  "AQUAFREEDOM": 81072,
  "BORDEIRA": 81380,
  "ADVANTAGE VICTORY": 156186,
  "SINDRE KNUTSEN": 85504,
  "ARCTICA": 65293,
  "ELIAS TSAKOS": 62557,
  "EAGLE FORD LADY": 25144,
  "SEAWAYS COLORADO": 81341,
  "ADVANTAGE ANGEL": 60751,
  "EBN HAWKEL": 60435,
  "FRONT FAVOUR": 62795,
  "PATRIOTIC": 82657,
  "PAUL B. LOYD JR": 27672,
  "NJORD DF": 64461,
  "ROSS SEA": 59794,
  "LNG ADVENTURE": 115408,
  "TRANSOCEAN ENCOURAGE": 44143,
  "SEA STAR": 62316,
  "NAVE DORADO": 63398,
  "CROSSWAY EAGLE": 9000,
  "ADVANTAGE PORTOFINO": 46509,
  "EAGLE VENICE": 154163,
  "FRONT SIRIUS": 62849,
  "COSL PROSPECTOR": 34526,
  "STI RAMBLA": 63704,
  "MARE PICENUM": 81499,
	"KMARIN RESPECT": 64309,
	"BOKA SWEEPER": 5901,
	"BOW TRIBUTE": 30521,
	"MILOS": 81630,
	"BRITISH ENGINEER": 30948,
	"FRONT CASCADE": 82515,
	"EAGLE BLANE": 85745,
	"DELTA HARMONY": 81619,
	"ALFA BALTICA": 57312,
	"ARDMORE ENGINEER": 30037,
	"STIKLESTAD": 26614,
	"NAVIG8 GAUNTLET": 30237,
	"MARAN GAS ALEXANDRIA": 105773,
	"PRIMERO": 57164,
	"CL TONI MORRISON": 30259,
	"DEEPSEA BOLLSTA": 35000,
	"FRIDA KNUTSEN": 85504,
	"TRANSOCEAN SPITSBERGEN": 37878,
	"FRONT CORAL": 82515,
	"BALDER": 75374,
	"TORM KRISTINA": 62914,
	"OCEAN GREATWHITE": 43860,
	"KMARIN REASON": 64309,
	"PIONEERING SPIRIT": 403342,
	"DEEPSEA ABERDEEN": 43758,
	"PACIFIC DIAMOND": 28778,
	"ITHAKI": 160487,
	"ITHAKI DF": 64461,
	"AIFANOURIOS": 64305,
	"FRONT ALTAIR": 62849,
	"KMARIN RESOURCE": 64309,
	"SOLITAIRE": 94855,
	"ARDMORE ENTERPRISE": 30063,
	"CHIOS DF": 64461,
	"FLOATEL ENDURANCE": 30803,
	"ARDMORE SEAVANTAGE": 30030,
	"SCARABEO 8": 35304,
	"ALPES": 62172,
	"EAGLE BALDER": 85745,
	"LYSIAS": 29993,
	"JASMINE KNUTSEN": 80918,
	"ATLANTIC EMERALD": 64933,
	"HAKATA PRINCESS": 29707,
	"HOURAI MARU": 25458,
	"TORILL KNUTSEN": 80850,
	"KMARIN RIGOUR": 64309,
	"RIO SPIRIT": 81394,
	"EURO": 81314,
	"TIDE SPIRIT": 85329,
	"ELANDRA MELODY": 30263,
	"ADVANTAGE SUN": 84203,
	"ARCTIC PRINCESS": 121597,
	"ALTERA WIND": 67383,
	"KMARIN RENOWN": 64309,
	"EMERALDWAY": 82752,
	"COOL RUNNER": 102097,
	"STRYMON": 62717,
	"SFL TIGER": 65696,
	  "DEEPSEA YANTAI": 29694,
	  "COSFLOURISH LAKE": 162542,
	  "STI GLADIATOR": 64245,
	  "LARGO ELEGANCE": 29416,
	  "HANOVER SQUARE": 64200,
	  "PINNACLE SPIRIT": 81732,
	  "CLIPPER JUPITER": 37366,
	  "MARITIME VALOR": 33355,
	  "DEEPSEA NORDKAPP": 45612,
	  "PACIFIC SAPPHIRE": 63555,
	  "MARCELLUS LADY": 25144,
	  "CL AGATHA CHRISTIE": 30259,
	  "EAGLE BARCELONA": 61504,
	  "NORDMARLIN": 61525,
	  "EVA MAERSK": 85445,
	  "CIELO DI CAGLIARI": 43984,
	  "NANSEN SPIRIT": 66563,
	  "EAGLE BRASILIA": 62150,
	  "AGIOS NIKOLAOS": 23339,
	  "STAMOS": 61320,
	  "SEADUKE": 160255,
	"AIGEORGIS": 64305,
	"MINERVA ZENOBIA": 63485,
	"PS NEW ORLEANS": 30560,
	"INGRID KNUTSEN": 66038,
	"GREAT THITA": 30237,
	"ANDEAN SUN": 30873,
	"CHRISTINA": 81315,
	"ION M": 29917,
	"PROTEUS PHILIPPA": 66982,
	"NISSOS CHRISTIANA": 62914,
	"MINERVA KYTHNOS": 61242,
	"DIAMONDWAY": 81545,
	"PACIFIC MOONSTONE": 30087,
	"FRONT COSMOS": 82515,
	"ACHILLEAS": 156915,
	"ARETEA": 62394,
	"NORDIC ZENITH": 81509,
	"COSL PIONEER": 26951,
	"ALTERA THULE": 86047,
	"SILVERWAY": 81545,
	"AQUASMERALDA": 29725,
	"PERSEUS STAR": 64305,
	"DUBAI CHARM": 63294,
	"BOW OLYMPUS": 34148,
	"CURRENT SPIRIT": 85329,
	"HAFNIA LILLESAND": 65145,
	"PENGUINS FPSO": 51065,
	"TRANSOCEAN NORGE": 35000,
	"SEAWAYS FRIO": 81708,
	"UZAVA": 30641,
	"BIDEFORD DOLPHIN": 6378,
	"SEARANGER": 63758,
	"LNG ENDURANCE": 115408,
	"MINERVA KALYPSO": 81361,
	"ERIK SPIRIT": 62929,
	"CL GEORGE ELIOT": 30259,
	"QOGIR": 115345,
	"SEASPRITE": 62394,
	"MARITIME TRANQUILITY": 33355,
	"DEEPSEA ATLANTIC": 42766,
	"WEST PHOENIX": 35568,
	"ALASKA": 85421,
	"ATLANTIS ALICANTE": 4034,
	"JOHAN CASTBERG": 91784,
	"MORNING HOPE": 152811,
	"ISABELLA": 115405,
	"MAERSK CAPRI": 29816,
	"SEA GARNET": 81364,
	"SOLAR SALLY": 30259,
	"SEARUNNER": 63758,
	"HEATHER KNUTSEN": 80918,
	"MARAN HERMIONE": 83055,
};

export const SEEDED_VESSEL_GT: Record<string, number> = Object.fromEntries(
  Object.entries(SEEDED_VESSEL_GT_RAW).map(([name, gt]) => [
    normalizeVesselKey(name),
    gt,
  ]),
);

export async function getGtFromLocalDatabase(
  vesselName: string | null | undefined,
): Promise<number | null> {
  if (!vesselName) return null;

  const key = normalizeVesselKey(vesselName);

  // 1) Sjekk om vi har en manuelt lagret verdi i Firestore
  try {
    const db = getDb();
    const snap = await db.collection("vesselGt").doc(key).get();
    if (snap.exists) {
      const data = snap.data() as { gt?: unknown };
      if (typeof data.gt === "number") {
        return data.gt;
      }
    }
  } catch (error) {
    console.warn("vesselGt: klarte ikke å lese fra Firestore", error);
  }

  // 2) Fall tilbake til seedet tabell
  const seeded = SEEDED_VESSEL_GT[key];
  return typeof seeded === "number" ? seeded : null;
}

export async function saveGtForVessel(
	vesselName: string,
	gt: number,
	source: "manual" | "seed" | "api" | "booking" | "vesselfinder" = "manual",
): Promise<void> {
  if (!vesselName || !Number.isFinite(gt)) return;

  const key = normalizeVesselKey(vesselName);
  const db = getDb();
  const ref = db.collection("vesselGt").doc(key);
  const now = Date.now();

  await ref.set(
    {
      name: vesselName,
      key,
      gt,
      source,
      updatedAt: now,
    },
    { merge: true },
  );
}
