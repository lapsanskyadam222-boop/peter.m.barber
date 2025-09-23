'use client';

import { useEffect, useState } from 'react';
import { FileDrop } from '@/components/FileDrop';

type Theme =
  | { mode: 'light' }
  | { mode: 'dark' }
  | { mode: 'custom'; bgColor: string; textColor: string };

type SavePayload = {
  logoUrl: string | null;
  carousel: string[];
  text: string;
  theme?: Theme;
};

export default function AdminPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [carousel, setCarousel] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string>('');
  const [err, setErr] = useState<string>('');

  const [theme, setTheme] = useState<Theme>({ mode: 'light' });
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fgColor, setFgColor] = useState('#111111');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/content', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        setLogoUrl(data.logoUrl ?? null);
        setCarousel(Array.isArray(data.carousel) ? data.carousel : []);
        setText(data.text ?? '');

        const t: Theme | undefined = data.theme;
        if (t?.mode === 'dark') {
          setTheme({ mode: 'dark' });
          setBgColor('#000000');
          setFgColor('#ffffff');
        } else if (t?.mode === 'custom') {
          const bg = t.bgColor || '#ffffff';
          const fg = t.textColor || '#111111';
          setTheme({ mode: 'custom', bgColor: bg, textColor: fg });
          setBgColor(bg);
          setFgColor(fg);
        } else {
          setTheme({ mode: 'light' });
          setBgColor('#ffffff');
          setFgColor('#111111');
        }
      } catch {}
    })();
  }, []);

  const removeCarouselAt = (idx: number) => {
    setCarousel(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    setBusy(true);
    setOk('');
    setErr('');

    if (carousel.length > 10) {
      setBusy(false);
      setErr('Maximálne 10 obrázkov v carousele.');
      return;
    }

    let themeToSave: Theme | undefined;
    if (theme.mode === 'light') {
      themeToSave = { mode: 'light' };
    } else if (theme.mode === 'dark') {
      themeToSave = { mode: 'dark' };
    } else {
      themeToSave = { mode: 'custom', bgColor, textColor: fgColor };
    }

    const payload: SavePayload = {
      logoUrl: logoUrl ?? null,
      carousel: [...carousel],
      text: text ?? '',
      theme: themeToSave,
    };

    try {
      const res = await fetch('/api/save-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Ukladanie zlyhalo');
      }
      setOk('Zverejnené ✅');
    } catch (e: any) {
      setErr(e?.message || 'Ukladanie zlyhalo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-xl mx-auto py-8 space-y-8">
      <h1 className="text-xl font-semibold">Admin editor</h1>

      <section className="space-y-3">
        <h2 className="font-medium">Logo (PNG/JPG, ≤10MB)</h2>
        <FileDrop
          label="Pridať logo"
          multiple={false}
          maxPerFileMB={10}
          accept="image/jpeg,image/png"
          onUploaded={(urls) => setLogoUrl(urls[0] ?? null)}
        />
        {logoUrl && (
          <div className="mt-2">
            <img src={logoUrl} alt="logo preview" className="h-16 w-auto" />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Carousel obrázky (1–10 JPG, ≤10MB/ks)</h2>
        <FileDrop
          label="Pridať fotky"
          multiple
          maxPerFileMB={10}
          accept="image/jpeg"
          onUploaded={(urls) => {
            setCarousel((prev) => {
              const next = [...prev, ...urls];
              return next.slice(0, 10);
            });
          }}
        />
        {carousel.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {carousel.map((src, i) => (
              <div key={src + i} className="relative border rounded p-1">
                <img src={src} alt={`img-${i + 1}`} className="w-full h-28 object-contain" />
                <button
                  type="button"
                  className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full px-2 py-1"
                  onClick={() => removeCarouselAt(i)}
                  aria-label={`Odstrániť ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Vzhľad</h2>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="theme"
              checked={theme.mode === 'light'}
              onChange={() => setTheme({ mode: 'light' })}
            />
            Svetlý (biele pozadie, tmavý text)
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="theme"
              checked={theme.mode === 'dark'}
              onChange={() => setTheme({ mode: 'dark' })}
            />
            Tmavý (čierne pozadie, biely text)
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="theme"
              checked={theme.mode === 'custom'}
              onChange={() => setTheme({ mode: 'custom', bgColor: bgColor, textColor: fgColor })}
            />
            Vlastné farby
          </label>

          {theme.mode === 'custom' && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <div className="text-sm opacity-80 mb-1">Pozadie</div>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
              </div>
              <div>
                <div className="text-sm opacity-80 mb-1">Text</div>
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Text</h2>
        <textarea
          className="w-full border rounded p-2"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={5000}
        />
      </section>

      <div className="space-y-2">
        <button
          onClick={submit}
          disabled={busy}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {busy ? 'Ukladám…' : 'Zverejniť'}
        </button>
        {ok && <p className="text-green-700 text-sm">{ok}</p>}
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <p className="text-xs text-gray-500">Zmeny sa okamžite prejavia – homepage ich číta vždy „no-store“.</p>
      </div>
    </main>
  );
}
