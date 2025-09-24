import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { z } from 'zod';

const hexColor = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Neplatná farba');
const ThemeSchema = z.object({
  mode: z.enum(['light', 'dark', 'custom']).default('light'),
  bgColor: hexColor.optional(),
  textColor: hexColor.optional(),
});
const Schema = z.object({
  logoUrl: z.string().url().nullable(),
  carousel: z.array(z.string().url()).default([]),
  text: z.string().default(''),
  theme: ThemeSchema.optional(),
});

function normalizeTheme(t?: z.infer<typeof ThemeSchema>) {
  if (!t || t.mode === 'light') return { mode: 'light' as const };
  if (t.mode === 'dark') return { mode: 'dark' as const };
  const bg = t.bgColor ?? '#ffffff';
  const fg = t.textColor ?? '#111111';
  return { mode: 'custom' as const, bgColor: bg, textColor: fg };
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Chýba BLOB_READ_WRITE_TOKEN' }, { status: 500 });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Neplatné dáta' }, { status: 400 });
    }

    const payload = {
      logoUrl: parsed.data.logoUrl ?? null,
      carousel: parsed.data.carousel ?? [],
      text: parsed.data.text ?? '',
      theme: normalizeTheme(parsed.data.theme),
      updatedAt: new Date().toISOString(),
    };

    const key = 'site-content.json';

    const res = await put(key, JSON.stringify(payload, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, url: res.url, key }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Ukladanie zlyhalo' }, { status: 500 });
  }
}
