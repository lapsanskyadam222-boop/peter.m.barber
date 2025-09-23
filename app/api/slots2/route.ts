export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

type WindowItem = { start: string; end: string };

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}
function isHHMM(v: any) {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}
function addMin(hm: string, min: number) {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  d.setMinutes(d.getMinutes() + min);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
function timesForWindow(win: WindowItem, stepMin: number, breakMin: number) {
  const out: string[] = [];
  let t = win.start;
  while (t < win.end) {
    // posledný slot musí **začať** pred end; end je exkluzívny
    if (addMin(t, stepMin) > win.end) break;
    out.push(t);
    t = addMin(t, stepMin + breakMin);
  }
  return out;
}

async function computeTimes(date: string, slot_len_min: number, break_min: number, windows: WindowItem[]) {
  const all: string[] = [];
  for (const w of windows) all.push(...timesForWindow(w, slot_len_min, break_min));
  // unikátne a zoradené
  const uniq = Array.from(new Set(all)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  // vyrob ID podľa tvojho formátu
  return uniq.map((time) => ({
    id: `${date}_${time.replace(':', '')}`,
    date,
    time,
  }));
}

// GET /api/slots2?date=YYYY-MM-DD  -> náhľad vyrátaných časov + existujúci stav
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('Neplatný dátum.');

  const supa = getServiceClient();
  const { data: plan, error: e1 } = await supa.from('work_plan').select('*').eq('date', date).maybeSingle();
  if (e1) return bad(e1.message, 500);
  if (!plan) return bad('Pre daný deň nie je plán.', 404);

  const times = await computeTimes(date, plan.slot_len_min, plan.break_min, plan.windows || []);
  const { data: existing, error: e2 } = await supa.from('slots').select('*').eq('date', date);
  if (e2) return bad(e2.message, 500);

  return NextResponse.json({ plan, proposal: times, existing: existing ?? [] });
}

// POST /api/slots2  { date, capacity? }  -> doplní chýbajúce sloty podľa plánu
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = String(body?.date ?? '');
    const capacity = Math.max(1, Number(body?.capacity) || 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('Neplatný dátum.');

    const supa = getServiceClient();
    const { data: plan, error: e1 } = await supa.from('work_plan').select('*').eq('date', date).maybeSingle();
    if (e1) return bad(e1.message, 500);
    if (!plan) return bad('Pre daný deň nie je plán.', 404);

    const proposal = await computeTimes(date, plan.slot_len_min, plan.break_min, plan.windows || []);
    if (proposal.length === 0) return bad('Plán negeneruje žiadne časy.');

    // Načítame existujúce sloty
    const { data: existing, error: e2 } = await supa.from('slots').select('id, time, capacity, booked_count, locked').eq('date', date);
    if (e2) return bad(e2.message, 500);
    const existIds = new Set((existing ?? []).map((s: any) => s.id));

    // Pripravíme len chýbajúce záznamy (bez mazania)
    const toInsert = proposal
      .filter((p) => !existIds.has(p.id))
      .map((p) => ({
        id: p.id,
        date: p.date,
        time: p.time,
        capacity,
        booked_count: 0,
        locked: false,
      }));

    if (toInsert.length > 0) {
      const { error: e3 } = await supa.from('slots').upsert(toInsert, { onConflict: 'id' });
      if (e3) return bad(e3.message, 500);
    }

    // vrátime celý zoznam na deň (aktuálny stav)
    const { data: out, error: e4 } = await supa
      .from('slots')
      .select('*')
      .eq('date', date)
      .order('time', { ascending: true });
    if (e4) return bad(e4.message, 500);

    return NextResponse.json({
      ok: true,
      added: toInsert.length,
      total: (out ?? []).length,
      slots: out ?? [],
    });
  } catch (e: any) {
    return bad(e?.message ?? 'Neznáma chyba', 500);
  }
}
