import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Neplatná hex farba (#rgb alebo #rrggbb)');

const ThemeSchema = z.object({
  mode: z.enum(['light', 'dark', 'custom']).default('light'),
  bgColor: hexColor.optional(),   // používa sa iba pri custom
  textColor: hexColor.optional(), // používa sa iba pri custom
});

const Schema = z.object({
  logoUrl: z.string().url().nullable(),
  // dovolíme 0..10 fotiek (zostáva tvoje správanie)
  carousel: z.array(z.string().url()).min(0).max(10),
  text: z.string().max(5000),
  theme: ThemeSchema.optional(), // nové pole – nepovinné (kvôli spätn. kompatibilite)
});

function sanitizeTheme(input: unknown) {
  const parsed = ThemeSchema.safeParse(input);
  if (!parsed.success) {
    // neprišlo nič použiteľné → fallback na light
    return { mode: 'light' as const };
  }
  const t = parsed.data;
  if (t.mode !== 'custom') return { mode: t.mode } as const;
  // custom: doplň bezpečné defaulty ak chýbajú
  const bg = t.bgColor ?? '#ffffff';
  const fg = t.textColor ?? '#111111';
  return { mode: 'custom' as const, bgColor: bg, textColor: fg };
}

export async function POST(req: Request) {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Chýba BLOB_READ_WRITE_TOKEN' }, { status: 500 });
    }

    const json = await req.json();
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Neplatné dáta' }, { status: 400 });
    }

    const payload = {
      ...parsed.data,
      theme: sanitizeTheme(parsed.data.theme),
      updatedAt: new Date().toISOString(),
    };

    // unikátne meno súboru (zachovávame tvoje správanie)
    const key = `site-content-${Date.now()}.json`;

    const res = await put(key, JSON.stringify(payload, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: true,
    });

    return NextResponse.json({ ok: true, url: res.url, key }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Ukladanie zlyhalo' }, { status: 500 });
  }
}
