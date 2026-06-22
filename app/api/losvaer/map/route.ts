export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USER_AGENT = "airliftlos-losvaer/1.0 https://airlift.no";
const VALID_AREAS = new Set(["western_norway", "northern_norway"]);

export async function GET(req: Request) {
	const params = new URL(req.url).searchParams;
	const area = params.get("area") ?? "";
	const time = params.get("time") ?? "";
	if (!VALID_AREAS.has(area) || !Number.isFinite(Date.parse(time))) {
		return new Response("Ugyldig kartforespørsel", { status: 400 });
	}

	const metUrl = new URL("https://api.met.no/weatherapi/offshoremaps/1.0/helicoptertriggeredlightningindex");
	metUrl.searchParams.set("area", area);
	metUrl.searchParams.set("time", time);
	const res = await fetch(metUrl, { headers: { "User-Agent": USER_AGENT, Accept: "image/png" }, next: { revalidate: 300 } });
	if (!res.ok) return new Response("Klarte ikke å hente lynkart", { status: 502 });

	return new Response(res.body, {
		status: 200,
		headers: {
			"Content-Type": res.headers.get("Content-Type") ?? "image/png",
			"Cache-Control": "public, max-age=300",
		},
	});
}