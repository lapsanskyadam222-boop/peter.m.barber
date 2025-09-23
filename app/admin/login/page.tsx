// app/admin/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBaseUrlClient } from '@/lib/getBaseUrlClient';

export default function AdminLoginPage() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const base = getBaseUrlClient();
      const url  = `${base}/api/auth/login`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        setError(text || `Prihlásenie zlyhalo (HTTP ${res.status}).`);
      } else {
        router.replace('/admin');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Neznáma chyba.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold mb-4">Admin prihlásenie</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">E‑mail</label>
          <input
            type="email"
            className="w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Heslo</label>
          <input
            type="password"
            className="w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Prihlasujem…' : 'Prihlásiť'}
        </button>
      </form>
    </main>
  );
}
