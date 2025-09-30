// lib/blob-cleanup.ts
import { list, del } from '@vercel/blob';

export type CleanupOptions = {
  origin: string;          // napr. https://web-mobil-client-a.vercel.app
  daysOld?: number;        // zmaž staršie ako X dní (default 30)
  keepRecentJson?: number; // nechaj N najnovších JSON snapshotov (default 20)
  dryRun?: boolean;        // true = len náhľad (default true)
};

type BlobItem = {
  url: string;
  pathname?: string;
  uploadedAt?: string | Date;
  size?: number;
};

function olderThan(date: Date, days: number) {
  const limit = new Date();
  limit.setDate(limit.getDate() - days);
  return date < limit;
}

async function listAll(prefix: string) {
  const out: BlobItem[] = [];
  let cursor: string | undefined;
  do {
    const { blobs, cursor: next } = await list({ prefix, cursor });
    out.push(...(blobs as any));
    cursor = next || undefined;
  } while (cursor);
  return out;
}

// Načíta aktuálny verejný obsah, aby sme NIKDY nevymazali používané URL (logo+carousel)
async function getActiveUrls(origin: string): Promise<Set<string>> {
  try {
    const res = await fetch(`${origin}/api/content`, { cache: 'no-store' });
    if (!res.ok) return new Set();
    const data = await res.json();
    const urls: string[] = [];

    if (data?.logoUrl) urls.push(String(data.logoUrl));
    if (Array.isArray(data?.carousel)) {
      for (const it of data.carousel) {
        if (typeof it === 'string') urls.push(it);
        else if (it?.src) urls.push(it.src);
      }
    }
    return new Set(urls);
  } catch {
    return new Set();
  }
}

export async function planCleanup(opts: CleanupOptions) {
  const {
    origin,
    daysOld = 30,
    keepRecentJson = 20,
    dryRun = true,
  } = opts;

  const keepUrls = await getActiveUrls(origin);

  // ↙️ uprav prefixy, ak máš iné (podľa toho, kam ukladáš)
  const images = await listAll('carousel/');       // napr. carousel/xxx.jpg
  const logos  = await listAll('logo/');           // napr. logo/logo.png
  const jsons  = await listAll('site-content-');   // napr. site-content-*.json

  const now = new Date();

  // obrázky (carousel + logo): staré a NEPOUŽÍVANÉ
  const imgCandidates: BlobItem[] = [];
  for (const b of [...images, ...logos]) {
    const url = b.url;
    const uploadedAt = new Date(String(b.uploadedAt || now));
    const isOld = olderThan(uploadedAt, daysOld);
    const isActive = keepUrls.has(url);
    if (isOld && !isActive) imgCandidates.push(b);
  }

  // JSON: necháme N najnovších; ostatné staršie ako X dní zmažeme
  const jsonSorted = [...jsons].sort(
    (a, b) => +new Date(String(b.uploadedAt)) - +new Date(String(a.uploadedAt))
  );
  const jsonToKeep = new Set(jsonSorted.slice(0, Math.max(keepRecentJson, 1)).map(j => j.url));
  const jsonCandidates: BlobItem[] = [];
  for (const b of jsonSorted.slice(keepRecentJson)) {
    const uploadedAt = new Date(String(b.uploadedAt || now));
    if (olderThan(uploadedAt, daysOld)) jsonCandidates.push(b);
  }

  const plan = {
    dryRun,
    summary: {
      daysOld,
      keepRecentJson,
      totalImages: images.length + logos.length,
      totalJsons: jsons.length,
      deleteImages: imgCandidates.length,
      deleteJsons: jsonCandidates.length,
    },
    delete: {
      images: imgCandidates.map(b => ({ url: b.url, uploadedAt: b.uploadedAt, size: b.size })),
      jsons: jsonCandidates.map(b => ({ url: b.url, uploadedAt: b.uploadedAt, size: b.size })),
    },
  };

  if (!dryRun) {
    const targets = [...imgCandidates, ...jsonCandidates];
    for (const t of targets) {
      await del(t.url);
    }
  }

  return plan;
}
