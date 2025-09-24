// app/api/content/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 0;

type Theme = { mode: 'light' | 'dark' | 'custom'; bgColor?: string; textColor?: string };
const EMPTY = {
  logoUrl: null as string | null,
  carousel: [] as string[],
  text: '',
  theme: { mode: 'light' as const } as Theme,
  updatedAt: '',
};

export async function GET() {
  const raw = (process.env.NEXT_PUBLIC_CONTENT_JSON_URL || '').trim(); // ✅ orež skryté znaky
  if (!raw) {
    return NextResponse.json(
      { ...EMPTY, sourceUrlUsed: null, note: 'Missing NEXT_PUBLIC_CONTENT_JSON_URL' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    // cache-buster (minútový), no-store hlavičky
    const u = new URL(raw);
    u.searchParams.set('v', String(Math.floor(Date.now() / 60000)));

    const res = await fetch(u.toString(), {
      cache: 'no-store',
      headers: { pragma: 'no-cache', 'cache-control': 'no-cache' },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ...EMPTY, sourceUrlUsed: raw, note: `Upstream ${res.status}` },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const j = await res.json();

    return NextResponse.json(
      {
        logoUrl: j.logoUrl ?? null,
        carousel: Array.isArray(j.carousel) ? j.carousel : [],
        text: j.text ?? '',
        theme: (j.theme ?? { mode: 'light' }) as Theme,
        updatedAt: j.updatedAt ?? '',
        sourceUrlUsed: raw, // pomocná info; môžeš odstrániť
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { ...EMPTY, sourceUrlUsed: raw, note: 'Fetch error' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
