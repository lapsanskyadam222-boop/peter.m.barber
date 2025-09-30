export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

import { NextResponse } from 'next/server';
import { planCleanup } from '@/lib/blob-cleanup';

/**
 * GET = volá Vercel cron podľa vercel.json (automaticky, bez tokenu)
 * POST = manuálny trigger s možnosťou parametrov (napr. dryRun)
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  try {
    const report = await planCleanup({
      origin,
      daysOld: 30,        // zmaž staršie ako 30 dní
      keepRecentJson: 20, // nechaj 20 najnovších JSON snapshotov
      dryRun: false       // CRON MAŽE NAOZAJ
    });
    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'cron failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // voliteľné: manuálne spustenie s tokenom a parametrami
  const token = process.env.CLEANUP_TOKEN;
  if (!token) return NextResponse.json({ error: 'Missing CLEANUP_TOKEN' }, { status: 500 });

  let body: any = {};
  try { body = await req.json(); } catch {}

  if (body?.token !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const daysOld = Number(body?.daysOld ?? 30);
  const keepRecentJson = Number(body?.keepRecentJson ?? 20);
  const dryRun = body?.dryRun === true;

  try {
    const report = await planCleanup({ origin, daysOld, keepRecentJson, dryRun });
    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'manual cleanup failed' }, { status: 500 });
  }
}
