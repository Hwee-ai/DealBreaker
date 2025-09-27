import { randomBytes } from 'node:crypto';
import { SignJWT, importJWK, JWK } from 'jose';


export type Provider = 'singpass' | 'techpass';


export function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}


export async function generatePkce() {
 const verifier = b64url(randomBytes(32));
 const crypto = await import('node:crypto');
 const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
 return { verifier, challenge };
}


export function providerConfig(p: Provider) {
 if (p === 'singpass') {
  return {
    issuer: process.env.SINGPASS_ISSUER!,
    authorization_endpoint: process.env.SINGPASS_AUTHORIZATION_ENDPOINT!,
    token_endpoint: process.env.SINGPASS_TOKEN_ENDPOINT!,
    userinfo_endpoint: process.env.SINGPASS_USERINFO_ENDPOINT!,
    client_id: process.env.SINGPASS_CLIENT_ID!,
    client_jwk: JSON.parse(process.env.SINGPASS_CLIENT_JWK!) as JWK,
    redirect_uri: process.env.SINGPASS_REDIRECT_URI!,
    scope: 'openid',
  } as const;
 }
 return {
    issuer: process.env.TECHPASS_ISSUER!,
    authorization_endpoint: process.env.TECHPASS_AUTHORIZATION_ENDPOINT!,
    token_endpoint: process.env.TECHPASS_TOKEN_ENDPOINT!,
    userinfo_endpoint: process.env.TECHPASS_USERINFO_ENDPOINT!,
    client_id: process.env.TECHPASS_CLIENT_ID!,
    client_jwk: JSON.parse(process.env.TECHPASS_CLIENT_JWK!) as JWK,
    redirect_uri: process.env.TECHPASS_REDIRECT_URI!,
    scope: 'openid profile email',
 } as const;
}


export async function buildClientAssertion({
  clientId, tokenEndpoint, jwk, lifetimeSec = 60,
}: { clientId: string; tokenEndpoint: string; jwk: JWK; lifetimeSec?: number }) {
  const privateKey = await importJWK(jwk, (jwk.alg as any) || 'RS256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: clientId, sub: clientId, aud: tokenEndpoint, jti: b64url(randomBytes(16)) })
    .setProtectedHeader({ alg: (jwk.alg as any) || 'RS256', kid: (jwk as any).kid })
    .setIssuedAt(now)
    .setExpirationTime(now + lifetimeSec)
    .sign(privateKey);
}