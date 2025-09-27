import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


export function middleware(req: NextRequest) {
    const protectedPaths = ['/protected', '/api/data', '/api/agent'];
    if (protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p))) {
        const has = req.cookies.get(process.env.SESSION_COOKIE_NAME || 'ab_sess');
        if (!has) {
            const url = req.nextUrl.clone();
            url.pathname = '/api/auth/login';
            return NextResponse.redirect(url);
        }
    }
    return NextResponse.next();
}


export const config = { matcher: ['/protected/:path*', '/api/data', '/api/agent'] };