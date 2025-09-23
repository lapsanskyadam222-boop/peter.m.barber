// lib/blobJson.ts
import { put } from '@vercel/blob';

/** Načíta JSON zo zadaného URL (ak neexistuje, vráti null). */
export async function readJson<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Zapíše JSON do Vercel Blob pod daný "path".
 * - ak druhý parameter je funkcia, najprv načíta aktuálny JSON a zavolá updater.
 * - zapisuje s content-type application/json, bez náhodného sufixu (prepíše existujúci súbor).
 */
export async function writeJson<T = any>(
  path: string,
  dataOrUpdate: T | ((current: T | null) => T)
): Promise<{ url: string }> {
  const data =
    typeof dataOrUpdate === 'function'
      ? (dataOrUpdate as (c: T | null) => T)(await readJson<T>(path))
      : dataOrUpdate;

  const { url } = await put(
    path,
    JSON.stringify(data, null, 2),
    {
      contentType: 'application/json',
      access: 'public',
      addRandomSuffix: false,
    }
  );
  return { url };
}
