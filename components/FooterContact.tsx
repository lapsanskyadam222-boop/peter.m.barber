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

  // spoločná trieda pre odkazy: farba z témy, bez podčiarknutia, hrubšie písmo
  const linkCls =
    'no-underline font-semibold text-[var(--page-fg)] visited:text-[var(--page-fg)] hover:opacity-80 focus:opacity-80 active:opacity-70';

  return (
    <footer className="py-6 text-center">
      <div className="mb-2 space-x-3">
        {phone && (
          <a href={`tel:${phone}`} className={linkCls} aria-label={`Zavolať ${phone}`}>
            📞 {phone}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className={linkCls} aria-label={`Napísať e-mail na ${email}`}>
            ✉️ {email}
          </a>
        )}
      </div>

      <div className="space-x-3">
        {ig && (
          <a href={ig} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Instagram
          </a>
        )}
        {fb && (
          <a href={fb} target="_blank" rel="noopener noreferrer" className={linkCls}>
            Facebook
          </a>
        )}
      </div>
    </footer>
  );
}
