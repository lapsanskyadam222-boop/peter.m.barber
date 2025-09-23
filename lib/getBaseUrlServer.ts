// lib/getBaseUrlServer.ts
import 'server-only';
import { headers } from 'next/headers';

/**
 * Server-side base URL (pre route handlers a server komponenty).
 * 1) Uprednostní NEXT_PUBLIC_BASE_URL, ak je nastavené.
 * 2) Potom skúsi VERCEL_URL (production / preview).
 * 3) Napokon zloží URL z X-Forwarded-* hlavičiek (alebo host/proto).
 */
export function getBaseUrlServer(): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, '');

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;

  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host  = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}
