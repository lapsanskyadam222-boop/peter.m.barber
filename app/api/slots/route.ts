export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}
function isYMD(v: any) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
function isHM(v: any) { return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v); }

/**
 * GET /api/slots?date=YYYY-MM-DD
 * (voliteľné) vráti sloty dňa – užitočné pre admin UI
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const supa = getServiceClient();
    const q = supa.from('slots').select('*').order('time', { ascending: true });
    const { data, error } = isYMD(date!) ? await q.eq('date', date) : await q;
    if (error) return bad(error.message, 500);
    return NextResponse.json({ slots: data ?? [] });
  } catch (e: any) {
    return bad(e?.message ?? 'Unknown error', 500);
  }
}

/**
 * POST /api/slots
 * Body: { date:'YYYY-MM-DD', time:'HH:MM', capacity?:number }
 * Vytvorí/aktualizuje slot. ID nikdy neposielame – generuje ho DB (UUID).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, time, capacity } = body || {};
    if (!isYMD(date)) return bad('Nesprávny dátum.');
    if (!isHM(time)) return bad('Nesprávny čas.');

    const cap = Number.isFinite(+capacity) && +capacity > 0 ? +capacity : 1;

    const supa = getServiceClient();
    // upsert podľa unikátu (date,time) – id necháme na default UUID
    const { data, error } = await supa
      .from('slots')
      .upsert(
        { date, time, capacity: cap, locked: false }, // booked_count necháme na default (0)
        { onConflict: 'date, time' }
      )
      .select('*')
      .single();

    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, slot: data }, { status: 201 });
  } catch (e: any) {
    return bad(e?.message ?? 'Unknown error', 500);
  }
}

/**
 * DELETE /api/slots
 * Body: { date:'YYYY-MM-DD', time:'HH:MM' }
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, time } = body || {};
    if (!isYMD(date) || !isHM(time)) return bad('Nesprávny vstup.');
    const supa = getServiceClient();
    const { error } = await supa.from('slots').delete().eq('date', date).eq('time', time);
    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return bad(e?.message ?? 'Unknown error', 500);
  }
}
