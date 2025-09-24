// app/api/content/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

type Theme =
  | { mode: 'light' }
  | { mode: 'dark' }
  | { mode: 'custom'; bgColor: string; textColor: string };

type SiteContent = {
  logoUrl: string | null;
  carousel: string[];
  text: string;
  theme?: Theme;
  updatedAt?: string;
};

export async function GET() {
  // 1) ENV + tvrdý TRIM (odstráni aj \r, \n a nevytlačiteľné znaky)
  const rawEnv = process.env.NEXT_PUBLIC_CONTENT_JSON_URL ?? '';
  const source = rawEnv.replace(/[\s\r\n]+$/g, '').replace(/^\s+/g, '');

  // 2) Cache-buster + no-store (aby si nikdy nevidel starý JSON)
  const url = source ? `${source}${source.includes('?') ? '&' : '?'}_=${Date.now()}` : '';

  if (!source) {
    return NextResponse.json(
      {
        ok: false,
        error: 'NEXT_PUBLIC_CONTENT_JSON_URL is empty',
        rawEnv,
        sourceUrlUsed: source,
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(url, { cache: 'no-store' });

    // 3) Keď padne upstream, pošleme späť maximum informácií
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        {
          ok: false,
          error: 'Upstream fetch failed',
          status: res.status,
          statusText: res.statusText,
          sourceUrlUsed: source,
          fetchedUrl: url,
          upstreamBodySample: text.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as SiteContent;
    // 4) Minimálne defaulty, nech sa to v UI nevybúra
    return NextResponse.json({
      ok: true,
      sourceUrlUsed: source,
      fetchedUrl: url,
      data: {
        logoUrl: data.logoUrl ?? null,
        carousel: Array.isArray(data.carousel) ? data.carousel : [],
        text: data.text ?? '',
        theme: data.theme ?? { mode: 'light' as const },
        updatedAt: data.updatedAt ?? '',
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || 'Unknown fetch error',
        sourceUrlUsed: source,
        fetchedUrl: url,
      },
      { status: 500 }
    );
  }
}
