// app/api/revalidate/route.ts
export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: Request) {
  const token = process.env.REBUILD_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing REBUILD_TOKEN' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const provided = String(body?.token || '');

    if (provided !== token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // podporujeme buď tags alebo paths
    const tags: string[] = Array.isArray(body?.tags) ? body.tags : [];
    const paths: string[] = Array.isArray(body?.paths) ? body.paths : [];

    tags.forEach(t => revalidateTag(t));
    paths.forEach(p => revalidatePath(p));

    return NextResponse.json({
      ok: true,
      revalidated: { tags, paths }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad request' }, { status: 400 });
  }
}
