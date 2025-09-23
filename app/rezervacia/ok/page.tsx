// app/rezervacia/ok/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from "next/link";

export default function RezervaciaOK() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-white text-gray-900">
      <div className="text-center p-6">
        <h1 className="text-2xl font-semibold mb-2">Rezervácia odoslaná ✅</h1>
        <p className="mb-6">Ďakujem! Čoskoro sa ti ozvem s potvrdením.</p>
        <Link
          href="/"
          className="inline-block rounded border px-4 py-2 hover:bg-gray-50"
        >
          Späť na úvod
        </Link>
      </div>
    </main>
  );
}
