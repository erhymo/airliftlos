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

    const lastFive = lines.slice(-5);

    return new Response(
      JSON.stringify({ base, icao, lines: lastFive }),
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

