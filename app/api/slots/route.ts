import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

type SlotRow = {
  id: string;
  date: string;
  time: string;
  capacity: number;
  locked: boolean;
  booked_count: number;
};

// ===== GET – zoznam slotov (na admin aj na všeobecné použitie)
export async function GET() {
  const supa = getServiceClient();
  const { data, error } = await supa
    .from('slots')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ slots: data ?? [] });
}

// ===== POST – pridanie jedného alebo viacerých slotov
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { date, time, times, capacity } = body as {
      date?: string;
      time?: string;
      times?: string[];
      capacity?: number;
    };

    if (!date || (!time && !Array.isArray(times)))
      return NextResponse.json({ error: 'Chýba dátum alebo čas/zoznam časov.' }, { status: 400 });

    const supa = getServiceClient();

    // 1 slot
    if (time) {
      const id = `${date}_${time.replace(':', '')}`;
      const toInsert: SlotRow = {
        id,
        date,
        time,
        capacity: Math.max(1, Number(capacity) || 1),
        locked: false,
        booked_count: 0,
      } as SlotRow;

      const { data, error } = await supa
        .from('slots')
        .upsert(toInsert, { onConflict: 'id' })
        .select('*');

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, created: data ?? [] });
    }

    // viac slotov
    const arr = (times || [])
      .filter((t: string) => /^\d{2}:\d{2}$/.test(t))
      .map((t: string) => ({
        id: `${date}_${t.replace(':', '')}`,
        date,
        time: t,
        capacity: Math.max(1, Number(capacity) || 1),
        locked: false,
        booked_count: 0,
      })) as SlotRow[];

    if (!arr.length) return NextResponse.json({ error: 'Žiadne validné časy.' }, { status: 400 });

    const { data, error } = await supa
      .from('slots')
      .upsert(arr, { onConflict: 'id' })
      .select('*');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, created: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Neznáma chyba' }, { status: 500 });
  }
}

// ===== PATCH – akcie nad slotmi: lock / unlock / capacity / delete / free
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, action, capacity } = body as {
      id?: string;
      action?: 'lock' | 'unlock' | 'capacity' | 'delete' | 'free';
      capacity?: number;
    };
    if (!id || !action) return NextResponse.json({ error: 'Chýba id alebo akcia.' }, { status: 400 });

    const supa = getServiceClient();

    if (action === 'lock') {
      const { error } = await supa.from('slots').update({ locked: true }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // pre spätnú kompatibilitu – vrátime celý zoznam
      const { data, error: e2 } = await supa
        .from('slots')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      return NextResponse.json({ ok: true, slots: data ?? [] });
    }

    if (action === 'unlock') {
      const { error } = await supa.from('slots').update({ locked: false }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data, error: e2 } = await supa
        .from('slots')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      return NextResponse.json({ ok: true, slots: data ?? [] });
    }

    if (action === 'capacity') {
      const cap = Math.max(1, Number(capacity) || 1);
      const { error } = await supa.from('slots').update({ capacity: cap }).eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data, error: e2 } = await supa
        .from('slots')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      return NextResponse.json({ ok: true, slots: data ?? [] });
    }

    if (action === 'delete') {
      // zmažeme aj súvisiace rezervácie (FK ON DELETE CASCADE by to zvládol tiež, ale istota je istota)
      await supa.from('reservations').delete().eq('slot_id', id);
      const { error } = await supa.from('slots').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const { data, error: e2 } = await supa
        .from('slots')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
      return NextResponse.json({ ok: true, slots: data ?? [] });
    }

    if (action === 'free') {
      // ✅ náhrada za rozbitú DB funkciu: vyčisti rezervácie + resetni slot
      const { error: e1 } = await supa.from('reservations').delete().eq('slot_id', id);
      if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

      const { error: e2 } = await supa
        .from('slots')
        .update({ locked: false, booked_count: 0 })
        .eq('id', id);
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

      // vrátime čerstvý stav konkrétneho slotu (admin UI si ho vie zapísať)
      const { data: slot, error: e3 } = await supa
        .from('slots')
        .select('*')
        .eq('id', id)
        .single();
      if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

      return NextResponse.json({ ok: true, slot });
    }

    return NextResponse.json({ error: 'Neznáma akcia.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Neznáma chyba' }, { status: 500 });
  }
}

// ===== DELETE – vymaž všetko (slots + reservations)
export async function DELETE() {
  const supa = getServiceClient();
  // najprv rezervácie (kvôli referenciám), potom sloty
  const { error: e1 } = await supa.from('reservations').delete().neq('slot_id', ''); // zmaž všetky
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { error: e2 } = await supa.from('slots').delete().neq('id', ''); // zmaž všetky
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
