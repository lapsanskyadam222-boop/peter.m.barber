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
  const url = process.env.NEXT_PUBLIC_CONTENT_JSON_URL;
  if (!url) {
    return NextResponse.json(EMPTY, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json(EMPTY, { headers: { 'Cache-Control': 'no-store' } });

    const json = await res.json();

    return NextResponse.json(
      {
        logoUrl: json.logoUrl ?? null,
        carousel: Array.isArray(json.carousel) ? json.carousel : [],
        text: json.text ?? '',
        theme: json.theme ?? { mode: 'light' },
        updatedAt: json.updatedAt ?? '',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(EMPTY, { headers: { 'Cache-Control': 'no-store' } });
  }
}
