// app/api/save-content/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

type Theme = { mode: 'light' | 'dark' | 'custom'; bgColor?: string; textColor?: string };

type SavePayload = {
  logoUrl: string | null;
  carousel: string[];
  text: string;
  theme?: Theme;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SavePayload>;

    // jednoduchá sanitizácia
    const payload: SavePayload = {
      logoUrl: body.logoUrl ?? null,
      carousel: Array.isArray(body.carousel) ? body.carousel.slice(0, 10) : [],
      text: typeof body.text === 'string' ? body.text : '',
      theme:
        body.theme?.mode === 'dark'
          ? { mode: 'dark' }
          : body.theme?.mode === 'custom'
          ? { mode: 'custom', bgColor: body.theme.bgColor ?? '#ffffff', textColor: body.theme.textColor ?? '#111111' }
          : { mode: 'light' },
    };

    const key = 'site-content.json';

    // voliteľne doplníme updatedAt
    const withStamp = { ...payload, updatedAt: new Date().toISOString() };

    const blob = await put('site-content.json', JSON.stringify(withStamp, null, 2), {
  access: 'public',
  contentType: 'application/json',
  addRandomSuffix: false,   // ← DÔLEŽITÉ
});

    return NextResponse.json({ ok: true, url: blob.url, key });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'save failed' }, { status: 500 });
  }
}
