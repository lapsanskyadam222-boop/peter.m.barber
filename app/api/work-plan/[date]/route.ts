export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

type WindowItem = { start: string; end: string };
type PlanRow = {
  date: string;
  windows: WindowItem[];
  slot_len_min: number;
  break_min: number;
  updated_at: string;
};

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}
function isHHMM(v: any) {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}
function cmpTime(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function normWindows(w: any): WindowItem[] | null {
  if (!Array.isArray(w)) return null;
  const arr: WindowItem[] = [];
  for (const i of w) {
    const s = i?.start, e = i?.end;
    if (!isHHMM(s) || !isHHMM(e) || cmpTime(s, e) >= 0) return null;
    arr.push({ start: s, end: e });
  }
  // zjednodušenie – zoradíme a spojíme prípadné prekrývania
  arr.sort((x, y) => cmpTime(x.start, y.start));
  const merged: WindowItem[] = [];
  for (const win of arr) {
    const last = merged[merged.length - 1];
    if (!last) merged.push(win);
    else if (cmpTime(win.start, last.end) <= 0) {
      if (cmpTime(win.end, last.end) > 0) last.end = win.end;
    } else merged.push(win);
  }
  return merged;
}

// GET /api/work-plan/2025-01-01
export async function GET(_: Request, ctx: { params: { date: string } }) {
  const date = ctx?.params?.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('Neplatný dátum.');
  const supa = getServiceClient();
  const { data, error } = await supa.from('work_plan').select('*').eq('date', date).maybeSingle();
  if (error) return bad(error.message, 500);
  if (!data) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: true, plan: data as PlanRow });
}

// PATCH /api/work-plan/2025-01-01  { windows:[{start,end}], slot_len_min, break_min }
export async function PATCH(req: Request, ctx: { params: { date: string } }) {
  try {
    const date = ctx?.params?.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad('Neplatný dátum.');

    const body = await req.json().catch(() => ({}));
    const windows = normWindows(body?.windows);
    const slot_len = Number(body?.slot_len_min);
    const brk = Number(body?.break_min);

    if (!windows || windows.length === 0) return bad('Zlé alebo prázdne okná.');
    if (!Number.isFinite(slot_len) || slot_len <= 0 || slot_len > 180) return bad('Neplatná dĺžka slotu (1–180).');
    if (!Number.isFinite(brk) || brk < 0 || brk >= 60) return bad('Neplatná prestávka (0–59).');

    const supa = getServiceClient();
    const up = {
      date,
      windows,
      slot_len_min: Math.round(slot_len),
      break_min: Math.round(brk),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supa.from('work_plan').upsert(up, { onConflict: 'date' }).select('*').single();
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, plan: data as PlanRow });
  } catch (e: any) {
    return bad(e?.message ?? 'Neznáma chyba', 500);
  }
}
