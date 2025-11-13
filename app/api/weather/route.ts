export const runtime = "nodejs";

type BaseKey = "Bergen" | "Tromsø" | "Hammerfest";

const BASE_TO_ICAO: Record<BaseKey, string> = {
  Bergen: "ENBR",
  Tromsø: "ENTC",
  Hammerfest: "ENHF",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const baseParam = (searchParams.get("base") ?? "Bergen") as BaseKey;

  const allowedBases: BaseKey[] = ["Bergen", "Tromsø", "Hammerfest"];
  const base: BaseKey = allowedBases.includes(baseParam) ? baseParam : "Bergen";

  const icao = BASE_TO_ICAO[base];
  const url = `https://api.met.no/weatherapi/tafmetar/1.0/tafmetar.txt?icao=${icao}`;

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
        }
      );
    }

    const text = await res.text();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const tafLines: string[] = [];
    const metarLines: string[] = [];

    for (const line of lines) {
      const parts = line.split(/\s+/);
      // Etter stasjonskode (ENxx) og tidspunkt (DDHHMMZ) kommer gyldighetsperiode for TAF,
      // som inneholder en "/" (f.eks. 1306/1406). METAR har ikke dette.
      if (parts.length >= 3 && parts[2].includes("/")) {
        tafLines.push(line);
      } else {
        metarLines.push(line);
      }
    }

    const lastTaf = tafLines.slice(-5);
    const lastMetar = metarLines.slice(-5);
    const combined = [...lastTaf, ...lastMetar];

    return new Response(
      JSON.stringify({ base, icao, lines: combined, taf: lastTaf, metar: lastMetar }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to contact MET" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

