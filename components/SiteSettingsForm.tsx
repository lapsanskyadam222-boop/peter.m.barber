'use client';

import React, { useEffect, useState } from 'react';

type Settings = {
  phone?: string | null;
  email?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
};

export default function SiteSettingsForm() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then((r) => r.json())
      .then((j) => j?.data && setSettings(j.data))
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const adminPassword = prompt('Zadaj admin heslo (ADMIN_PASSWORD) pre uloženie:') || '';

    const res = await fetch('/api/admin/site-settings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-admin-password': adminPassword,
      },
      body: JSON.stringify(settings),
    });

    const json = await res.json();
    if (res.ok) setMsg('Nastavenia uložené.');
    else setMsg('Chyba: ' + (json?.error ?? 'unknown'));

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 16 }}>
      <h2>Kontaktné údaje webu</h2>

      <form onSubmit={save}>
        <label>
          Telefón (napr. +421901234567)
          <input
            value={settings.phone ?? ''}
            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            placeholder="+421901234567"
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>

        <label>
          E-mail
          <input
            value={settings.email ?? ''}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            placeholder="kontakt@firma.sk"
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>

        <label>
          Instagram URL
          <input
            value={settings.instagram_url ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, instagram_url: e.target.value })
            }
            placeholder="https://www.instagram.com/uzivatel"
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>

        <label>
          Facebook URL
          <input
            value={settings.facebook_url ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, facebook_url: e.target.value })
            }
            placeholder="https://www.facebook.com/stranka"
            style={{ width: '100%', padding: 8, marginBottom: 12 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Ukladám…' : 'Uložiť'}
          </button>
          <button
            type="button"
            onClick={() =>
              setSettings({
                phone: '',
                email: '',
                instagram_url: '',
                facebook_url: '',
              })
            }
          >
            Vymazať
          </button>
        </div>

        {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      </form>
    </div>
  );
}
