import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

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
  try {
    // 1) Nájdeme presne "site-content.json" v tomto projekte (žiadne ENV)
    const { blobs } = await list({ prefix: 'site-content.json' });
    const file = blobs.find((b) => b.pathname === 'site-content.json');

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'site-content.json not found in project blob store' },
        { status: 404 }
      );
    }

    // 2) Stiahneme obsah zo "svojej" URL (pridáme cache-buster)
    const url = `${file.url}${file.url.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        {
          ok: false,
          error: 'Upstream fetch failed',
          status: res.status,
          statusText: res.statusText,
          sourceUrlUsed: file.url,
          fetchedUrl: url,
          upstreamBodySample: text.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as SiteContent;

    return NextResponse.json({
      ok: true,
      sourceUrlUsed: file.url,
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
      { ok: false, error: e?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
