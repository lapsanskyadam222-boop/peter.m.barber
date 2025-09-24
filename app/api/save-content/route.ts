// app/api/save-content/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // vždy zapisujeme do rovnakého súboru → stabilná URL
    const key = 'site-content.json';

    const blob = await put(key, JSON.stringify(payload, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    // 🔥 dôležité: vráť URL, ktorú máš dať do NEXT_PUBLIC_CONTENT_JSON_URL
    return NextResponse.json({ ok: true, url: blob.url, key });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'save failed' },
      { status: 500 },
    );
  }
}
