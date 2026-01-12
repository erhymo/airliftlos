export const runtime = "nodejs";

type BaseKey = "Bergen" | "Tromsø" | "Hammerfest";

const BASE_TO_AREA: Record<BaseKey, string> = {
  Bergen: "western_norway",
  Tromsø: "northern_norway",
  Hammerfest: "northern_norway",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const baseParam = (searchParams.get("base") ?? "Bergen") as BaseKey;

  const allowedBases: BaseKey[] = ["Bergen", "Tromsø", "Hammerfest"];
  const base: BaseKey = allowedBases.includes(baseParam) ? baseParam : "Bergen";

  const area = BASE_TO_AREA[base];
  const url =
    "https://api.met.no/weatherapi/offshoremaps/1.0/available.json?type=helicoptersignificantwaveheight&area=" +
    area;

  try {
    const res = await fetch(url, {
      headers: {
        // MET krever en tydelig User-Agent
        "User-Agent": "airliftlos/1.0 (kontakt: myhre.oyvind@gmail.com)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Upstream MET error", status: res.status }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = (await res.json()) as unknown;

    if (!Array.isArray(data)) {
      return new Response(
        JSON.stringify({ base, area, items: [] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    type OffshoreEntry = {
      params?: { time?: string };
      uri?: string;
      updated?: string;
    };

    const items = (data as OffshoreEntry[])
      .map((entry) => ({
        time: String(entry.params?.time ?? ""),
        uri: String(entry.uri ?? ""),
        updated: String(entry.updated ?? ""),
      }))
      .filter((item) => item.time && item.uri);

    // Sorter på tid (eldst først)
    items.sort((a, b) => a.time.localeCompare(b.time));

    // Vi ønsker de 8 neste kartene fra "nå" (rapporttidspunktet).
    // Tidene fra MET er ISO-strenger (UTC), så vi kan sammenligne som tekst.
    const nowIso = new Date().toISOString();
    const futureOrNow = items.filter((item) => item.time >= nowIso);

    let selected: { time: string; uri: string }[];
    if (futureOrNow.length >= 8) {
      selected = futureOrNow.slice(0, 8);
    } else {
      // Fallback: hvis det ikke finnes nok fremtidige kart, ta de siste 8 totalt
      selected = items.slice(-8);
    }

    const responseItems = selected.map(({ time, uri }) => ({ time, uri }));

    return new Response(
      JSON.stringify({ base, area, items: responseItems }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to contact MET" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
