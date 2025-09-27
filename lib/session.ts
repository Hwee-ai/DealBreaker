import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';


const COOKIE = process.env.SESSION_COOKIE_NAME || 'ab_sess';
const secret = new TextEncoder().encode(process.env.SESSION_JWE_SECRET || 'dev-secret-change-me');


export type Session = { sub: string; provider: 'singpass' | 'techpass'; name?: string; email?: string };


export async function setSession(value: Session) {
  const token = await new EncryptJWT(value as any)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .encrypt(secret);
  cookies().set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
}


export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secret);
    return payload as any as Session;
  } catch {
    return null;
  }
}


export function clearSession() {
  cookies().set(COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
}