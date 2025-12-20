import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-4 space-y-4">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 relative">
        <header className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">LOS Helikopter</h1>
            <Link href="/statistikk" aria-label="Statistikk">
              <Image
                src="/Airlift-logo.png"
                alt="Airlift-logo"
                width={140}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <p className="text-sm text-gray-600">Velg hvilken rapport du vil fylle ut.</p>
        </header>

        <div className="grid grid-cols-1 gap-4">
          <Link
            href="/vaktapp"
            className="block w-full rounded-lg bg-blue-600 text-white text-center py-4 px-4 text-base font-medium shadow-sm hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Vaktrapport
          </Link>

          <Link
            href="/driftsrapport"
            className="block w-full rounded-lg bg-gray-100 text-gray-900 text-center py-4 px-4 text-base font-medium border border-gray-300 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Driftsforstyrrelse
          </Link>
        </div>

	        <div className="mt-6 border-t border-gray-200 pt-4">
	          <Link
	            href="/loslogg"
	            className="block w-full rounded-lg bg-gray-100 text-gray-900 text-center py-4 px-4 text-base font-medium border border-gray-300 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
	          >
	            LOS-logg
	          </Link>
	        </div>
      </main>
    </div>
  );
}
