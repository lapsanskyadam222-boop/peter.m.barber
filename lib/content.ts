// lib/content.ts
export type SiteContent = {
  logoUrl: string | null;
  carousel: string[];
  text: string;
  theme?: { mode: 'light' | 'dark' | 'custom'; bgColor?: string; textColor?: string };
  updatedAt?: string;
};

export async function fetchContent(): Promise<SiteContent> {
  const res = await fetch('/api/content', { cache: 'no-store' });
  if (!res.ok) throw new Error('Cannot load content');
  return res.json();
}

export async function saveContent(data: SiteContent) {
  const res = await fetch('/api/save-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Saving failed');
  return res.json();
}
