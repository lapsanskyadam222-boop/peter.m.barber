// app/api/content/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  try {
    const base = process.env.NEXT_PUBLIC_CONTENT_JSON_URL;
    if (!base) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_CONTENT_JSON_URL' }, { status: 500 });
    }

    // bypass cache na všetkých úrovniach
    const url = `${base}?ts=${Date.now()}`;

    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed`, status: r.status, sourceUrlUsed: base },
        { status: 400 },
      );
    }

    const data = await r.json();
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Content fetch error' }, { status: 500 });
  }
}
