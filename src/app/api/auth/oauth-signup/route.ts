import admin from '@/lib/firebase';
import { jsonOk, jsonError } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { idToken, role } = body || {};
        if (!idToken || !role) return jsonError('Missing idToken or role', 400);

        console.debug('[oauth-signup] received request, role=', role, 'idTokenPresent=', !!idToken);
        // call server action to assign role and create profile
        const { handleOAuthSignup } = await import('@/lib/actions');
        const result = await handleOAuthSignup(idToken, role);
        console.debug('[oauth-signup] handleOAuthSignup result=', result);
        if (result.status !== 'success') return jsonError(result.message, 400);

        // create session cookie for the client
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        const res = jsonOk({ status: 'success', message: 'Signed up and session created' });
        const isProd = process.env.NODE_ENV === 'production';
        const securePart = isProd ? ' Secure;' : '';
        const cookieHeader = `ss-session=${sessionCookie}; HttpOnly; Path=/; Max-Age=${Math.floor(expiresIn / 1000)};${securePart} SameSite=Lax`;
        console.debug('[oauth-signup] setting cookie header=', cookieHeader.slice(0, 80) + '...');
        res.headers.append('Set-Cookie', cookieHeader);
        return res;
    } catch (err) {
        console.error('[oauth-signup] error', err);
        return jsonError(String(err), 500);
    }
}
