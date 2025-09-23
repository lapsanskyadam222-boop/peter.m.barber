// app/api/reservations/route.ts
import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { buildICS } from '@/lib/ics';
import { sendReservationEmail } from '@/lib/sendEmail';

type VerifyResp = { success: boolean; "error-codes"?: string[] };

async function verifyTurnstile(token: string, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return { ok: false, reason: 'TURNSTILE_SECRET missing' };

  const form = new URLSearchParams();
  form.append('secret', secret);
  form.append('response', token);
  if (remoteIp) form.append('remoteip', remoteIp);

  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const json = (await r.json()) as VerifyResp;
  return { ok: !!json.success, reason: json["error-codes"]?.join(',') || '' };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slotId, name, email, phone, hp, cfToken, ts } = body as {
      slotId?: string; name?: string; email?: string; phone?: string;
      hp?: string; cfToken?: string; ts?: string;
    };

    // Základná validácia
    if (!slotId || !name || !email || !phone) {
      return NextResponse.json(
        { error: 'Chýba slotId, meno, e-mail alebo telefón.' },
        { status: 400 }
      );
    }

    // Honeypot – musí byť prázdny
    if (hp && String(hp).trim().length > 0) {
      return NextResponse.json({ error: 'Spam detected (honeypot).' }, { status: 400 });
    }

    // Timestamp – musí byť rozumný (±10 min)
    const now = Date.now();
    const tsNum = Number(ts ?? 0);
    if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > 10 * 60 * 1000) {
      return NextResponse.json({ error: 'Neplatný čas odoslania.' }, { status: 400 });
    }

    // Turnstile – povinné a musí prejsť
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (!cfToken) {
      return NextResponse.json({ error: 'Chýbajúce overenie (Turnstile).' }, { status: 400 });
    }
    const verify = await verifyTurnstile(cfToken, ip);
    if (!verify.ok) {
      return NextResponse.json({ error: 'Neúspešné overenie (Turnstile).' }, { status: 400 });
    }

    // Rezervácia cez Supabase RPC
    const supa = getServiceClient();
    const { data, error } = await supa.rpc('book_slot', {
      p_slot_id: slotId,
      p_name: name.trim(),
      p_email: email.trim(),
      p_phone: phone.trim(),
    });

    if (error) {
      if (String(error.message || '').includes('SLOT_NOT_AVAILABLE')) {
        return NextResponse.json({ error: 'Tento termín už nie je dostupný.' }, { status: 409 });
      }
      console.error('book_slot error:', error);
      return NextResponse.json({ error: 'Rezervácia zlyhala.' }, { status: 500 });
    }

    // funkcia vracia riadok s názvami v_date, v_time:
    const resv = Array.isArray(data) ? data[0] : data;
    const dateStr = String(resv.v_date); // "YYYY-MM-DD"
    const timeStr = String(resv.v_time); // "HH:MM"

    // ICS
    const ics = buildICS({
      title: `Rezervácia: ${name} (${phone})`,
      date: dateStr,
      time: timeStr,
      durationMinutes: 60,
      timezone: 'Europe/Bratislava',
      location: 'Lezenie s Nicol',
      description:
        `Rezervácia cez web.\n` +
        `Meno: ${name}\n` +
        `E-mail: ${email}\n` +
        `Telefón: ${phone}\n` +
        `Termín: ${dateStr} ${timeStr}`,
    });

    // Email
    await sendReservationEmail?.(
      `Nová rezervácia ${dateStr} ${timeStr} — ${name}`,
      `<p><strong>Nová rezervácia</strong></p>
       <ul>
         <li><b>Termín:</b> ${dateStr} ${timeStr}</li>
         <li><b>Meno:</b> ${name}</li>
         <li><b>E-mail:</b> ${email}</li>
         <li><b>Telefón:</b> ${phone}</li>
       </ul>`,
      { filename: 'rezervacia.ics', content: ics }
    );

    return NextResponse.json(
      { ok: true, reservation: { ...resv, date: dateStr, time: timeStr } },
      { status: 201 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? 'Neznáma chyba' }, { status: 500 });
  }
}
