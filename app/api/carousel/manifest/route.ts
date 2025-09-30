// app/api/carousel/manifest/route.ts
import { NextResponse } from 'next/server';
import { addItem, readManifest, removeItem } from '@/lib/carousel-manifest';

export const runtime = 'edge'; // rýchla, lacná
export const preferredRegion = 'fra1';

export async function GET() {
  try {
    const m = await readManifest();
    const res = NextResponse.json(m);
    // Cache: 1 hodina + SWR 5 min
    res.headers.set('cache-control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=300');
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'manifest read error' }, { status: 500 });
  }
}

// Admin update: POST { action: 'add'|'remove', item?: {url, alt, width, height}, url?: string }
export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-admin-token');
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body || {};

    if (action === 'add' && body?.item?.url) {
      const updated = await addItem(body.item);
      return NextResponse.json({ ok: true, manifest: updated });
    }

    if (action === 'remove' && body?.url) {
      const updated = await removeItem(body.url);
      return NextResponse.json({ ok: true, manifest: updated });
    }

    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'manifest write error' }, { status: 500 });
  }
}
