// src/app/api/auth/session/route.ts
import admin from '@/lib/firebase';
import { jsonOk, jsonError } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const idToken = body.idToken;
        if (!idToken) return jsonError('Missing idToken', 400);
        // Session cookie duration: 5 days
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        const res = jsonOk({ ok: true });
        // Set cookie in NextResponse. Avoid marking Secure during local development so
        // browsers will accept the cookie over plain HTTP (e.g. localhost).
        const isProd = process.env.NODE_ENV === 'production';
        const securePart = isProd ? ' Secure;' : '';
        const cookieHeader = `ss-session=${sessionCookie}; HttpOnly; Path=/; Max-Age=${Math.floor(expiresIn / 1000)};${securePart} SameSite=Lax`;
        console.debug('[session] setting cookie header=', cookieHeader.slice(0, 80) + '...');
        res.headers.append('Set-Cookie', cookieHeader);
        return res;
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}

export async function DELETE() {
    const res = jsonOk({ ok: true });
    res.headers.append('Set-Cookie', 'ss-session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
    return res;
}
