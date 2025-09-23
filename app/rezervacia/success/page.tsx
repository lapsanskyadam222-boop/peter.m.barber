// app/rezervacia/success/page.tsx
export default function SuccessPage() {
  return (
    <main className="mx-auto min-h-dvh flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold mb-3">Rezervácia odoslaná ✅</h1>
      <p className="text-lg text-gray-700 mb-6">
        Ďakujem! Čoskoro sa ti ozvem s potvrdením.
      </p>
      <a
        href="/"
        className="inline-block rounded-xl bg-black px-6 py-3 text-white hover:bg-gray-800 transition"
      >
        Späť na úvod
      </a>
    </main>
  );
}
