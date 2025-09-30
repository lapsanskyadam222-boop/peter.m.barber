import { NextResponse } from 'next/server';

export function jsonCached(data: any, sMaxAge = 60, stale = 120) {
  const res = NextResponse.json(data);
  res.headers.set('cache-control', `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${stale}`);
  return res;
}
