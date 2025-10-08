import React from 'react';
import { getServiceClient } from '@/lib/supabase';

export default async function FooterContact() {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'default')
    .limit(1)
    .maybeSingle();

  const phone = data?.phone?.trim() || '';
  const email = data?.email?.trim() || '';
  const ig = data?.instagram_url?.trim() || '';
  const fb = data?.facebook_url?.trim() || '';

  // tenké linky + farba z témy + bez podčiarknutia
  const linkStyle: React.CSSProperties = {
    color: 'var(--page-fg)',
    textDecoration: 'none',
    fontWeight: 400,
  };

  return (
    <footer className="py-6" style={{ color: 'var(--page-fg)' }}>
      {/* Nadpis nad kontaktmi – vycentrovaný a tenký */}
      <div style={{ marginBottom: 8, textAlign: 'center' }}>
        <span style={{ fontWeight: 400 }}>Kontakty:</span>
      </div>

      <div
        style={{
          marginBottom: 8,
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          textAlign: 'center',
        }}
      >
        {phone && (
          <a href={`tel:${phone}`} style={linkStyle} aria-label={`Zavolať ${phone}`}>
            📞 {phone}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} style={linkStyle} aria-label={`Napísať e-mail na ${email}`}>
            ✉️ {email}
          </a>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
          textAlign: 'center',
        }}
      >
        {ig && (
          <a href={ig} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Instagram
          </a>
        )}
        {fb && (
          <a href={fb} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Facebook
          </a>
        )}
      </div>
    </footer>
  );
}
