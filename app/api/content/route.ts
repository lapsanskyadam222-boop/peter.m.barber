import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  const empty = {
    logoUrl: null,
    carousel: [],
    text: '',
    theme: { mode: 'light' as const },
    updatedAt: '',
  };

  try {
    const { blobs } = await list({ prefix: 'site-content-' });
    if (!blobs.length) {
      return NextResponse.json(empty);
    }

    const latest = blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
    const res = await fetch(`${latest.url}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json(empty);

    const json = await res.json();

    return NextResponse.json({
      logoUrl: json.logoUrl ?? null,
      carousel: Array.isArray(json.carousel) ? json.carousel : [],
      text: json.text ?? '',
      theme: json.theme ?? { mode: 'light' },
      updatedAt: json.updatedAt ?? '',
    });
  } catch {
    return NextResponse.json(empty);
  }
}
