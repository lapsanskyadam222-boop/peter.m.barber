// lib/supabase.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRV = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// iba pre server – zapisuje
export function getServiceClient() {
  if (!URL || !SRV) throw new Error('Supabase SERVER env chýba.');
  return createClient(URL, SRV, { auth: { persistSession: false } });
}

// len ak by si niekde potreboval čítanie na serveri bez service key
export function getAnonClient() {
  if (!URL || !ANON) throw new Error('Supabase ANON env chýba.');
  return createClient(URL, ANON, { auth: { persistSession: false } });
}
