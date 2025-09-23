import { cookies } from 'next/headers';
import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

export const SESSION_COOKIE = 'session';

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET nie je nastavený');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(email: string): Promise<string> {
  return await new SignJWT({ sub: email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function getSession():
  Promise<(JWTPayload & { sub?: string; role?: string }) | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as JWTPayload & { sub?: string; role?: string };
  } catch {
    return null;
  }
}
