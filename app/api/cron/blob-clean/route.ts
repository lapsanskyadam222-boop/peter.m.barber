export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

import { NextResponse } from 'next/server';
import { planCleanup } from '@/lib/blob-cleanup';
import { getServiceClient } from '@/lib/supabase';

/**
 * GET = volá Vercel cron. Spraví:
 *  - bezpečnostnú kontrolu CRON_TOKEN (ak je nastavený)
 *  - ľahký "ping" do Supabase (SELECT 1) – udrží projekt aktívny
 *  - cleanup iba v nedeľu (UTC), aby sme nemazali každý deň
 *
 * POST = manuálny trigger s možnosťou parametrov (napr. dryRun), ostáva BEZ ZMENY
 */

export async function GET(req: Request) {
  // --- jednoduchá ochrana: ak je CRON_TOKEN nastavený, vyžaduj ho
  const cronToken = process.env.CRON_TOKEN ?? '';
  const headerToken = req.headers.get('x-cron-token') ?? '';
  const urlToken = new URL(req.url).searchParams.get('token') ?? '';
  if (cronToken && headerToken !== cronToken && urlToken !== cronToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const now = new Date();
  const isSundayUTC = now.getUTCDay() === 0; // 0 = Sunday

  try {
    // 1) PING do Supabase – stačí ľahký SELECT, ktorý nič nemení
    try {
      const supabase = getServiceClient();
      const { error: pingError } = await supabase.from('site_settings').select('id').limit(1);
      if (pingError) throw pingError;
    } catch (pingErr: any) {
      // ping nesmie zablokovať cron — len zalogujeme do odpovede
      console.warn('Cron ping failed:', pingErr?.message ?? pingErr);
    }

    // 2) CLEANUP – iba v nedeľu (UTC).
    //    Na Hobby nastav cron denne (napr. 07:00 UTC) – ping pôjde denne,
    //    cleanup sa vykoná len v nedeľu, čiže 1× týždenne.
    let cleanupReport: any = null;
    if (isSundayUTC) {
      cleanupReport = await planCleanup({
        origin,
        daysOld: 30,        // zmaž staršie ako 30 dní
        keepRecentJson: 20, // nechaj 20 najnovších JSON snapshotov
        dryRun: false       // CRON MAŽE NAOZAJ
      });
    }

    return NextResponse.json({
      ok: true,
      at: now.toISOString(),
      didClean: isSundayUTC,
      report: cleanupReport,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'cron failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // ponechané bez zmeny – manuálne spustenie s tokenom a parametrami
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
