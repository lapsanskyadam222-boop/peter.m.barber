export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'res_mode';
const DEFAULTS = { reservationMode: 1 as 1 | 2 };

export async function GET() {
  try {
    const c = cookies();
    const v = Number(c.get(COOKIE_NAME)?.value ?? '1');
    const reservationMode: 1 | 2 = v === 2 ? 2 : 1;
    return NextResponse.json({ reservationMode });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const v = Number(body?.reservationMode);
    const reservationMode: 1 | 2 = v === 2 ? 2 : 1;

    const res = NextResponse.json({ ok: true, reservationMode });
    res.cookies.set(COOKIE_NAME, String(reservationMode), {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dní
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Neznáma chyba' }, { status: 400 });
  }
}
