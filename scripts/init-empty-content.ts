// scripts/init-empty-content.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

import { put } from '@vercel/blob';

async function run() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Chýba BLOB_READ_WRITE_TOKEN v .env.local / Vercel ENV');
  }

  // počiatočný obsah webu
  const payload = {
    logoUrl: null as string | null,
    carousel: [] as string[],
    text: '',
    theme: { mode: 'light' as const },
    updatedAt: new Date().toISOString(),
  };

  // DÔLEŽITÉ: fixný kľúč bez náhodného suffixu
  const key = 'site-content.json';

  const res = await put(key, JSON.stringify(payload, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  console.log('✅ Content JSON created at:', res.url);
  console.log('➡️  Skopíruj túto URL do NEXT_PUBLIC_CONTENT_JSON_URL v .env.local a vo Vercel ENV');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
