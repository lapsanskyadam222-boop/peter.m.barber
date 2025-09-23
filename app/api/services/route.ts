export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

type ServiceRow = {
  id: string;
  name: string;
  duration_min: number;
  active: boolean;
  created_at: string;
};

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}
function isNonEmptyString(x: any) {
  return typeof x === 'string' && x.trim().length > 0;
}
function parseDuration(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n) || n <= 0 || n > 600) return null;
  return Math.round(n);
}

// GET /api/services  -> zoznam aktívnych aj neaktívnych (pre admin)
export async function GET() {
  const supa = getServiceClient();
  const { data, error } = await supa
    .from('services')
    .select('*')
    .order('active', { ascending: false })
    .order('name', { ascending: true });

  if (error) return bad(error.message, 500);
  return NextResponse.json({ services: (data ?? []) as ServiceRow[] });
}

// POST /api/services {name, duration_min}
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? '').trim();
    const d = parseDuration(body?.duration_min);
    if (!isNonEmptyString(name)) return bad('Chýba názov služby.');
    if (!d) return bad('Neplatné trvanie (1–600 min).');

    const supa = getServiceClient();
    const { data, error } = await supa
      .from('services')
      .insert({ name, duration_min: d })
      .select('*')
      .single();

    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, service: data as ServiceRow }, { status: 201 });
  } catch (e: any) {
    return bad(e?.message ?? 'Neznáma chyba', 500);
  }
}

// PATCH /api/services {id, name?, duration_min?, active?}
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id ?? '');
    if (!isNonEmptyString(id)) return bad('Chýba id.');

    const update: Record<string, any> = {};
    if (body?.name !== undefined) {
      const nm = String(body.name).trim();
      if (!isNonEmptyString(nm)) return bad('Neplatný názov.');
      update.name = nm;
    }
    if (body?.duration_min !== undefined) {
      const d = parseDuration(body.duration_min);
      if (!d) return bad('Neplatné trvanie (1–600).');
      update.duration_min = d;
    }
    if (body?.active !== undefined) {
      update.active = !!body.active;
    }
    if (Object.keys(update).length === 0) return bad('Žiadne zmeny.');

    const supa = getServiceClient();
    const { data, error } = await supa
      .from('services')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return bad(error.message, 500);
    return NextResponse.json({ ok: true, service: data as ServiceRow });
  } catch (e: any) {
    return bad(e?.message ?? 'Neznáma chyba', 500);
  }
}

// DELETE /api/services?id=...
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id') || '';
  if (!isNonEmptyString(id)) return bad('Chýba id.');
  const supa = getServiceClient();

  // tvrdé zmazanie (je to admin endpoint)
  const { error } = await supa.from('services').delete().eq('id', id);
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true });
}
