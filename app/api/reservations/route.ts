// app/api/reservations/route.ts
import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { buildICS } from '@/lib/ics';
import { sendReservationEmail } from '@/lib/sendEmail';

type VerifyResp = { success: boolean; 'error-codes'?: string[] };

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
  return { ok: !!json.success, reason: json['error-codes']?.join(',') || '' };
}

/* ---------- bezpečné formátovanie dátumu/času ---------- */
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

function formatDateSafe(raw: unknown): { pretty: string; ymd?: string } {
  const s = String(raw || '').trim();

  // 2025-09-24
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return { pretty: `${pad(d)}.${pad(m)}.${y}`, ymd: s };
  }

  // 24.09.2025
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) {
    const [d, m, y] = s.split('.').map((x) => parseInt(x, 10));
    return { pretty: `${pad(d)}.${pad(m)}.${y}`, ymd: `${y}-${pad(m)}-${pad(d)}` };
  }

  // 2025/9/24 alebo 2025.9.24 a pod.
  const m = s.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const d = parseInt(m[3], 10);
    return { pretty: `${pad(d)}.${pad(mo)}.${y}`, ymd: `${y}-${pad(mo)}-${pad(d)}` };
  }

  return { pretty: s || '—' };
}

function formatTimeSafe(raw: unknown): { pretty: string; hm?: string } {
  const s = String(raw || '').trim();

  // 14:30 alebo 14:30:00
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    return { pretty: `${pad(h)}:${pad(mi)}`, hm: `${pad(h)}:${pad(mi)}` };
  }

  return { pretty: s || '—' };
}
/* -------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // token skúsime z viacerých názvov + aj z hlavičky
    const { slotId, name, email, phone, hp, ts } = body as {
      slotId?: string;
      name?: string;
      email?: string;
      phone?: string;
      hp?: string;
      ts?: string;
    };

    const cfToken =
      (body?.cfToken ??
        body?.token ??
        body?.turnstileToken ??
        body?.cf_token ??
        req.headers.get('cf-turnstile-token') ??
        '') + '';

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
    if (!cfToken) {
      console.warn('[TURNSTILE] Missing token in body/header');
      return NextResponse.json({ error: 'Chýbajúce overenie (Turnstile).' }, { status: 400 });
    }
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const verify = await verifyTurnstile(cfToken, ip);
    if (!verify.ok) {
      console.warn('[TURNSTILE] verify failed');
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

    // Výstup z RPC – dátum/čas môžu mať rôzne polia podľa schémy
    const resv = Array.isArray(data) ? data[0] : data;

    const rawDate =
      resv?.v_date ?? resv?.date ?? resv?.day ?? resv?.d ?? '';
    const rawTime =
      resv?.v_time ?? resv?.time ?? resv?.start_time ?? resv?.t ?? '';

    const fDate = formatDateSafe(rawDate);
    const fTime = formatTimeSafe(rawTime);

    const dateStr = fDate.pretty; // nikdy nie NaN
    const timeStr = fTime.pretty;

    // Podmienené ICS – len pri 100% validných hodnotách
    let icsAttachment: { filename: string; content: string } | undefined;
    if (fDate.ymd && fTime.hm) {
      const ics = buildICS({
        title: `Rezervácia: ${name} (${phone})`,
        date: fDate.ymd, // "YYYY-MM-DD"
        time: fTime.hm,  // "HH:MM"
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
      icsAttachment = { filename: 'rezervacia.ics', content: ics };
    }

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
      icsAttachment
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
