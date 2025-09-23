export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { buildICS } from '@/lib/ics';
import { sendReservationEmail } from '@/lib/sendEmail';

/**
 * POST /api/book-seq
 * Body: { date: 'YYYY-MM-DD', start: 'HH:MM', duration_min: number, name, email, phone, turnstileToken }
 * Rezervuje po sebe idúce sloty počas dňa tak, aby pokryli trvanie služby (Režim 2).
 * Pri zlyhaní rollbackne vytvorené rezervácie.
 */
function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}
function isYMD(v: any) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
function isHM(v: any) { return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v); }
function toMin(hm: string) { const [h,m] = hm.split(':').map(Number); return h*60+m; }

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, start, duration_min, name, email, phone } = body || {};
    if (!isYMD(date)) return bad('Nesprávny dátum.');
    if (!isHM(start)) return bad('Nesprávny čas.');
    const dur = Number(duration_min);
    if (!Number.isFinite(dur) || dur <= 0) return bad('Nesprávne trvanie služby.');
    if (!name || !email || !phone) return bad('Meno, e-mail a telefón sú povinné.');

    // Načítaj sloty dňa v poradí
    const supa = getServiceClient();
    const { data: daySlots, error: e1 } = await supa
      .from('slots')
      .select('*')
      .eq('date', date)
      .order('time', { ascending: true });
    if (e1) return bad(e1.message, 500);

    // Index štartovacieho slotu
    const idx = (daySlots || []).findIndex(s => s.time === start && !s.locked);
    if (idx < 0) return bad('Počiatočný termín nie je dostupný.', 409);

    // Zisti krok (slot_len + medzera) — predpoklad uniformity v Režime 2
    const next = daySlots[idx + 1];
    if (!next) return bad('Nedostatočný počet slotov.');
    const step = toMin(next.time) - toMin(daySlots[idx].time);
    if (!Number.isFinite(step) || step <= 0) return bad('Neplatná konfigurácia slotov.', 500);

    // Koľko slotov potrebujeme na pokrytie trvania
    const needSteps = Math.max(1, Math.ceil(dur / step));
    const chain = (daySlots || []).slice(idx, idx + needSteps);

    if (chain.length < needSteps) return bad('V tento deň nie je dostatok naväzujúcich termínov.', 409);
    if (chain.some(s => s.locked)) return bad('Niektorý z požadovaných termínov už nie je voľný.', 409);

    // Rezervuj sekvenčne cez RPC book_slot; pri chybe rollback
    const createdResIds: string[] = [];
    for (const s of chain) {
      const { data, error } = await supa.rpc('book_slot', {
        p_slot_id: s.id,
        p_name: name.trim(),
        p_email: email.trim(),
        p_phone: phone.trim(),
      });
      if (error) {
        if (createdResIds.length) {
          await supa.from('reservations').delete().in('id', createdResIds);
        }
        if (String(error.message || '').includes('SLOT_NOT_AVAILABLE')) {
          return bad('Termín bol práve obsadený.', 409);
        }
        return bad(error.message || 'Chyba pri rezervácii.', 500);
      }
      const resv = Array.isArray(data) ? data[0] : data;
      if (resv?.id) createdResIds.push(resv.id);
    }

    // Vytvor ICS (od start po start + duration)
    const [Y, M, D] = date.split('-').map((n: string) => parseInt(n, 10));
    const [h0, m0] = start.split(':').map((n: string) => parseInt(n, 10));
    // Ukladáme v UTC; kalendáre si to prispôsobia zóne zariadenia
    const startDate = new Date(Date.UTC(Y, M - 1, D, h0, m0));
    const endDate = new Date(startDate.getTime() + dur * 60 * 1000);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const dateStr = `${D}.${M}.${Y}`;
    const timeStr = `${pad(h0)}:${pad(m0)}`;

    // Pozn.: typ IcsOpts v projekte má inak definované polia; castneme pre kompatibilitu
    const ics = buildICS({
      title: 'Rezervácia',
      description: `Rezervácia: ${name}`,
      start: startDate,
      end: endDate,
      location: '',
    } as any);

    await sendReservationEmail?.(
      `Nová rezervácia ${dateStr} ${timeStr} — ${name}`,
      `<p><strong>Nová rezervácia</strong></p>
       <ul>
         <li><b>Termín:</b> ${dateStr} ${timeStr} (trvanie ${dur} min)</li>
         <li><b>Meno:</b> ${name}</li>
         <li><b>E-mail:</b> ${email}</li>
         <li><b>Telefón:</b> ${phone}</li>
       </ul>`,
      { filename: 'rezervacia.ics', content: ics }
    );

    return NextResponse.json(
      { ok: true, reservation: { date, start, duration_min: dur } },
      { status: 201 }
    );
  } catch (e: any) {
    console.error(e);
    return bad(e?.message ?? 'Neznáma chyba', 500);
  }
}
