import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../lib/firebaseAdmin";

	const TO_ADDRESSES = [
	  "oyvind.myhre@airlift.no",
	  "tom.ostrem@airlift.no",
	];

interface ResumeDriftPayload {
	  subject: string;
	  body: string;
	  fromName?: string;
	  base?: string;
	  /** ID til driftsrapporten i Firestore (driftsrapporter/{id}).
	   *  Hvis satt, brukes denne for å hindre dobbel sending og for å lagre
	   *  gjenopptatt-status på rapporten. Hvis utelatt, oppfører API-et seg
	   *  som før (ingen Firestore-sjekk).
	   */
	  reportId?: string;
	  /** Valgt klokkeslett for gjenopptatt drift (0–23). */
	  gjenopptattKl?: number;
	  /** Eventuell kommentar som ble sendt ved gjenopptatt drift. */
	  gjenopptattKommentar?: string;
	}

type ResumeDriftResponseBody = {
	ok: boolean;
	/** True hvis rapporten allerede var markert som gjenopptatt i Firestore. */
	alreadyResumed?: boolean;
	/** Når e-posten om gjenopptatt drift ble (eller tidligere ble) sendt. */
	gjenopptattSendtAt?: number;
	error?: string;
	details?: string;
};

export async function POST(req: Request) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM;
  const accessCode = process.env.ACCESS_CODE;

  if (!apiKey || !fromEmail) {
    return NextResponse.json(
      { error: "Missing SENDGRID_API_KEY or SENDGRID_FROM" },
      { status: 500 }
    );
  }

  if (accessCode) {
    const cookieStore = await cookies();
    const accessCookie = cookieStore.get("airliftlos_access");
    if (!accessCookie || accessCookie.value !== "ok") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

	  let payload: ResumeDriftPayload;
  try {
    payload = (await req.json()) as ResumeDriftPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

			  const {
				  subject,
				  body: emailBody,
				  fromName,
				  base,
				  reportId,
				  gjenopptattKl,
				  gjenopptattKommentar,
			} = payload;

		  if (!subject || !emailBody) {
    return NextResponse.json(
      { error: "subject and body are required" },
      { status: 400 }
    );
  }

		  // Bruk samme mottakerlogikk som for selve driftsforstyrrelsen
		  let to: { email: string }[] = TO_ADDRESSES.map((email) => ({ email }));
		  let cc: { email: string }[] = [];

		  if (base === "Bergen") {
		    // Driftsforstyrrelse fra Bergen: samme liste som hovedrapporten
		    to = [
		      { email: "aina.giskeodegard.balsnes@kystverket.no" },
		      { email: "kjell.asle.djupevag@kystverket.no" },
		      { email: "losformidling.kvitsoy@kystverket.no" },
		    ];
		    cc = [
		      { email: "erlend.haugsbo@airlift.no" },
		      { email: "loshelikopter.bergen@airlift.no" },
		      { email: "tom.ostrem@airlift.no" },
		    ];
		  } else if (base === "Hammerfest") {
		    // Driftsforstyrrelse fra Hammerfest: samme liste som hovedrapporten
		    to = [
		      { email: "aina.giskeodegard.balsnes@kystverket.no" },
		      { email: "roy.arne.rotnes@kystverket.no" },
		      { email: "losformidling.nordland@kystverket.no" },
		    ];
		    cc = [
		      { email: "erlend.haugsbo@airlift.no" },
		      { email: "loshelikopter.hammerfest@airlift.no" },
		      { email: "tom.ostrem@airlift.no" },
		    ];
		  }

	  try {
			// Hvis vi har en reportId, bruker vi Firestore som fasit for om rapporten
			// allerede er gjenopptatt. Dette hindrer at samme rapport sender flere
			// «drift gjenopptatt»-eposter.
			let existingGjenopptattSendtAt: number | undefined;
			if (reportId) {
				try {
					const db = getDb();
					const docRef = db.collection("driftsrapporter").doc(reportId);
					const snap = await docRef.get();
					if (snap.exists) {
						const data = snap.data() as
							| { gjenopptattSendtAt?: unknown }
							| undefined;
						const ts = data && data.gjenopptattSendtAt;
						if (typeof ts === "number" && Number.isFinite(ts) && ts > 0) {
							existingGjenopptattSendtAt = ts;
						}
					}
				} catch (err) {
					console.error(
						"Firestore: klarte ikke å sjekke gjenopptatt-status for driftsrapport",
						(err as Error).message,
					);
				}
			}

				if (existingGjenopptattSendtAt) {
					const responseBody: ResumeDriftResponseBody = {
						ok: true,
						alreadyResumed: true,
						gjenopptattSendtAt: existingGjenopptattSendtAt,
					};
					return NextResponse.json(responseBody satisfies ResumeDriftResponseBody);
			}

		    const sgResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
	      method: "POST",
	      headers: {
	        "Content-Type": "application/json",
	        Authorization: `Bearer ${apiKey}`,
	      },
			      body: JSON.stringify({
		        personalizations: [
		          {
		            to,
		            ...(cc.length > 0 ? { cc } : {}),
		            subject,
		          },
		        ],
	        from: {
	          email: fromEmail,
	          name: fromName || "LOS Helikopter",
	        },
		        content: [
		          {
		            type: "text/plain",
		            value: emailBody,
		          },
		        ],
	      }),
	    });

	    if (!sgResponse.ok) {
	      const text = await sgResponse.text();
	      return NextResponse.json(
	        { error: "SendGrid error", details: text },
	        { status: 502 },
	      );
	    }

			// Forsøk å lagre gjenopptatt-status på rapporten i Firestore slik at alle
			// enheter ser at denne driftsforstyrrelsen er gjenopptatt.
			let gjenopptattSendtAt: number | undefined;
			if (reportId) {
				try {
					const db = getDb();
					gjenopptattSendtAt = Date.now();
					const update: Record<string, unknown> = {
						gjenopptattSendtAt,
					};
					if (typeof gjenopptattKl === "number" && Number.isFinite(gjenopptattKl)) {
						update.gjenopptattKl = gjenopptattKl;
					}
					if (typeof gjenopptattKommentar === "string") {
						update.gjenopptattKommentar = gjenopptattKommentar;
					}
					await db.collection("driftsrapporter").doc(reportId).set(update, {
						merge: true,
					});
				} catch (err) {
					console.error(
						"Firestore: klarte ikke å lagre gjenopptatt-status for driftsrapport",
						(err as Error).message,
					);
				}
			}

				const responseBody: ResumeDriftResponseBody = {
					ok: true,
					alreadyResumed: false,
					...(gjenopptattSendtAt ? { gjenopptattSendtAt } : {}),
				};
		    return NextResponse.json(responseBody satisfies ResumeDriftResponseBody);
	  } catch (error) {
	    console.error("Failed to send resume drift email", error);
	    return NextResponse.json(
	      { error: "Failed to send resume drift email" },
	      { status: 500 },
	    );
	  }
}

