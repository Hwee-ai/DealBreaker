import { NextRequest, NextResponse } from 'next/server';
import { providerConfig, buildClientAssertion } from '@/lib/oidc';
import { setSession } from '@/lib/session';


export async function GET(req: NextRequest) {
 const url = new URL(req.url);
 const code = url.searchParams.get('code');
 const state = url.searchParams.get('state');
 const provider = req.cookies.get('auth_provider')?.value as 'singpass' | 'techpass';
 if (!code || !state || !provider) return NextResponse.json({ error: 'Invalid callback' }, { status: 400 });


 const cookieState = req.cookies.get('auth_state')?.value;
 if (cookieState !== state) return NextResponse.json({ error: 'State mismatch' }, { status: 400 });


 const cfg = providerConfig(provider);
 const verifier = req.cookies.get('pkce_verifier')?.value!;
 const clientAssertion = await buildClientAssertion({ clientId: cfg.client_id, tokenEndpoint: cfg.token_endpoint, jwk: cfg.client_jwk });


 const body = new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  redirect_uri: cfg.redirect_uri,
  client_id: cfg.client_id,
  code_verifier: verifier,
  client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
  client_assertion: clientAssertion,
 });


 const tokenRes = await fetch(cfg.token_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
 if (!tokenRes.ok) return NextResponse.json({ error: 'Token exchange failed', detail: await tokenRes.text() }, { status: 500 });
 const tokens = await tokenRes.json();
 const idToken = tokens.id_token as string;


// Minimal parse; TODO: verify against JWKS, check nonce/iss/aud/exp
 const [, payloadB64] = idToken.split('.');
 const payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));


 await setSession({ sub: payload.sub, provider, name: payload.name, email: payload.email });


 const res = NextResponse.redirect(new URL('/protected', req.url));
 ['pkce_verifier', 'auth_state', 'auth_nonce', 'auth_provider'].forEach((n) => res.cookies.set(n, '', { path: '/', maxAge: 0 }));
 return res;
}