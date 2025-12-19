import Link from 'next/link';

export default function Statistikk() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Statistikk</h1>
        <p className="text-sm text-gray-600">
          Her kommer statistikk for LOS-oppdrag etter hvert.
        </p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Tilbake til forsiden
        </Link>
      </main>
    </div>
  );
}
