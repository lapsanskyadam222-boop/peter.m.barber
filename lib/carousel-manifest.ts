// lib/carousel-manifest.ts
import { put, head, del } from '@vercel/blob';

export type CarouselItem = {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  uploadedAt?: string; // ISO
};
export type CarouselManifest = {
  images: CarouselItem[];
  updatedAt: string; // ISO
};

const KEY = 'carousel/manifest.json';

export async function readManifest(): Promise<CarouselManifest> {
  // HEAD zistí, či existuje – ak nie, vráť prázdny manifest
  const exists = await head(KEY).catch(() => null);
  if (!exists) {
    return { images: [], updatedAt: new Date().toISOString() };
  }
  const res = await fetch(exists.url, { cache: 'no-store' });
  const json = (await res.json()) as CarouselManifest;
  return json;
}

export async function writeManifest(m: CarouselManifest) {
  const json = JSON.stringify(m, null, 2);
  await put(KEY, json, { access: 'public', contentType: 'application/json' });
}

export async function addItem(item: CarouselItem): Promise<CarouselManifest> {
  const m = await readManifest();
  // ak tam už je tá istá URL, nezdvojuj
  const exists = m.images.some(i => i.url === item.url);
  const images = exists ? m.images : [...m.images, { ...item, uploadedAt: item.uploadedAt ?? new Date().toISOString() }];
  const updated = { images, updatedAt: new Date().toISOString() };
  await writeManifest(updated);
  return updated;
}

export async function removeItem(url: string): Promise<CarouselManifest> {
  const m = await readManifest();
  const images = m.images.filter(i => i.url !== url);
  const updated = { images, updatedAt: new Date().toISOString() };
  await writeManifest(updated);
  return updated;
}
