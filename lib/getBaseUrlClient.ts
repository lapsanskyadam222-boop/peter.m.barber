// lib/getBaseUrlClient.ts
export function getBaseUrlClient(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? '';
}
