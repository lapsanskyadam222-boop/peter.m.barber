import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const key = 'site-content.json';
    const json = JSON.stringify(body, null, 2);

    const blob = await put(key, json, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    // !!! Dôležité: vrátime URL do response
    return NextResponse.json({
      ok: true,
      url: blob.url,
      key: key,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'save failed' },
      { status: 500 }
    );
  }
}
