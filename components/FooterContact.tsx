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

  const phone = data?.phone || null;
  const email = data?.email || null;
  const ig = data?.instagram_url || null;
  const fb = data?.facebook_url || null;

  return (
    <footer style={{ padding: 24, textAlign: 'center' }}>
      <div style={{ marginBottom: 8 }}>
        {phone && (
          <a href={`tel:${phone}`} style={{ marginRight: 12 }}>
            📞 {phone}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} style={{ marginRight: 12 }}>
            ✉️ {email}
          </a>
        )}
      </div>
      <div>
        {ig && (
          <a href={ig} target="_blank" rel="noopener noreferrer" style={{ marginRight: 12 }}>
            Instagram
          </a>
        )}
        {fb && (
          <a href={fb} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
        )}
      </div>
    </footer>
  );
}
