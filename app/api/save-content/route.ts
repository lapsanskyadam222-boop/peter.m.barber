// app/api/save-content/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // ✅ kľúč musí byť fixný, inak sa mení URL a frontend číta starý prázdny súbor
    const key = 'site-content.json';

    const res = await put(
      key,
      JSON.stringify(payload, null, 2),
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false, // ⬅️ dôležité: aby sa nemenilo URL
      }
    );

    return NextResponse.json({
      ok: true,
      url: res.url, // vždy rovnaké
      key,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Save failed' },
      { status: 400 }
    );
  }
}
