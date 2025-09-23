import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAdminEmail: !!process.env.ADMIN_EMAIL,
    hasPasswordHash: !!process.env.ADMIN_PASSWORD_HASH,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    vercelEnv: process.env.VERCEL_ENV ?? 'unknown',
  });
}
