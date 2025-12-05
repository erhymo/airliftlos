import Link from "next/link";

const MOCK_BOOKING = {
  id: "sola-ts-demo",
  vesselName: "SOLA TS",
  date: "2025-01-03",
  orderNumber: "123456",
  base: "Bergen",
  pilots: ["Los 1", "Los 2"],
};

interface LosLoggBookingPageProps {
  params: {
    id: string;
  };
}

export default function LosLoggBookingPage({ params }: LosLoggBookingPageProps) {
  const isDemo = params.id === MOCK_BOOKING.id;
  const booking = isDemo ? MOCK_BOOKING : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {booking ? (
          <>
            <header className="space-y-1">
              <h1 className="text-lg font-semibold">LOS-logg  {booking.vesselName}</h1>
              <p className="text-sm text-gray-600">
                Dette er en demo-visning av data som senere skal hentes fra
                bestillingsmail fra Kystverket.
              </p>
            </header>

            <section className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">
                Data fra bestillingsmail (demo)
              </h2>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Dato</dt>
                  <dd className="font-medium">{booking.date}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Ordrenr.</dt>
                  <dd className="font-medium">{booking.orderNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Fart4y</dt>
                  <dd className="font-medium">{booking.vesselName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Base</dt>
                  <dd className="font-medium">{booking.base}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Los(er)</dt>
                  <dd className="font-medium">{booking.pilots.join(", ")}</dd>
                </div>
              </dl>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-medium text-gray-700">
                Skjema for LOS-logg (kommer senere)
              </h2>
              <p className="text-sm text-gray-600">
                Her kommer felter for sign, techlognummer, sted, type, antall
                loser, ship landing, ENFJ-landinger, hoist og kommentar.
              </p>
            </section>
          </>
        ) : (
          <section className="space-y-2">
            <h1 className="text-lg font-semibold">LOS-logg</h1>
            <p className="text-sm text-gray-600">
              Fant ingen bestilling for denne adressen. Denne siden er forel1pig
              kun satt opp for en demo-bestilling (SOLA TS).
            </p>
          </section>
        )}

        <div className="pt-2 flex justify-between text-sm">
          <Link
            href="/loslogg"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Tilbake til LOS-logg
          </Link>
          <Link href="/" className="text-gray-500 hover:text-gray-700 underline">
            Forsiden
          </Link>
        </div>
      </main>
    </div>
  );
}

