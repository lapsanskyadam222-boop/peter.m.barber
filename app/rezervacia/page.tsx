// app/rezervacia/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ClientRezervacia from './Client';
import { getBaseUrlServer } from '@/lib/getBaseUrlServer';

type Slot = { id: string; date: string; time: string; locked?: boolean; booked?: boolean };

async function getSlots(): Promise<Slot[]> {
  try {
    const base = getBaseUrlServer();
    const res = await fetch(`${base}/api/slots?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.slots) ? (json.slots as Slot[]) : [];
  } catch {
    return [];
  }
}

export default async function RezervaciaPage() {
  const slots = await getSlots();
  return <ClientRezervacia slots={slots} />;
}
