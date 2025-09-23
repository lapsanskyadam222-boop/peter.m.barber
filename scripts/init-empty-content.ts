// scripts/init-empty-content.ts
import { config } from 'dotenv';
config({ path: '.env.local' }); // načíta lokálne env premenné

import { put } from '@vercel/blob';

async function run() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('Chýba BLOB_READ_WRITE_TOKEN v env (.env.local alebo Vercel ENV).');
  }

  // voliteľne: overíme, že bežíme s RW tokenom (len info)
  console.log('Using BLOB_READ_WRITE_TOKEN (prefix):', token.slice(0, 18) + '…');

  const payload = {
    logoUrl: null,
    carousel: [],
    text: '',
    updatedAt: new Date().toISOString(),
  };

  const pathname = `site-content-${Date.now()}.json`;

  const res = await put(pathname, JSON.stringify(payload, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });

  console.log('Init content created at:', res.url);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
