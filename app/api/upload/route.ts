// app/api/upload/route.ts
export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!ALLOWED.some(t => contentType.includes(t.split('/')[1]))) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 415 });
    }

    const arrayBuf = await req.arrayBuffer();
    if (arrayBuf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const key = `uploads/${Date.now()}`;
    const saved = await put(key, arrayBuf, {
      access: 'public',
      contentType,
    });

    return NextResponse.json({ url: saved.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upload error' }, { status: 500 });
  }
}
