import { NextResponse } from 'next/server';

export const revalidate = 0;

const EMPTY = {
  logoUrl: null as string | null,
  carousel: [] as string[],
  text: '',
  theme: { mode: 'light' as const },
  updatedAt: '',
};

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_CONTENT_JSON_URL || '';

  if (!baseUrl) {
    return NextResponse.json(
      { ...EMPTY, sourceUrlUsed: null, note: 'Missing NEXT_PUBLIC_CONTENT_JSON_URL' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    // cache-buster: mení sa raz za minútu -> vyhneme sa CDN cache starého JSONu
    const u = new URL(baseUrl);
    u.searchParams.set('v', String(Math.floor(Date.now() / 60000)));

    const res = await fetch(u.toString(), {
      cache: 'no-store',
      headers: {
        'pragma': 'no-cache',
        'cache-control': 'no-cache',
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { ...EMPTY, sourceUrlUsed: baseUrl, note: `Upstream ${res.status}` },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const json = await res.json();

    return NextResponse.json(
      {
        logoUrl: json.logoUrl ?? null,
        carousel: Array.isArray(json.carousel) ? json.carousel : [],
        text: json.text ?? '',
        theme: json.theme ?? { mode: 'light' },
        updatedAt: json.updatedAt ?? '',
        // DEBUG info – pomáha overiť, z akej URL čítame (odstráň po doladení)
        sourceUrlUsed: baseUrl,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ...EMPTY, sourceUrlUsed: baseUrl, note: 'Fetch error' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
