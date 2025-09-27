import { NextRequest, NextResponse } from 'next/server';
import { providerConfig, generatePkce } from '@/lib/oidc';


export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const provider = (searchParams.get('provider') || 'singpass') as 'singpass' | 'techpass';
    const cfg = providerConfig(provider);


    const { verifier, challenge } = await generatePkce();
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();


    const res = NextResponse.redirect(
        `${cfg.authorization_endpoint}?` +
          new URLSearchParams({
            response_type: 'code',
            client_id: cfg.client_id,
            redirect_uri: cfg.redirect_uri,
            scope: cfg.scope,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            state,
            nonce,
          }).toString()
 );
 const opts: any = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 };
 res.cookies.set('pkce_verifier', verifier, opts);
 res.cookies.set('auth_state', state, opts);
 res.cookies.set('auth_nonce', nonce, opts);
 res.cookies.set('auth_provider', provider, opts);
 return res;
}