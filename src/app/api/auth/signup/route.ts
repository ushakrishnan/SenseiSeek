import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        // Only allow unauthenticated access to signup; verifying cookie returns null if not signed in
        const existing = await verifySessionCookie(req);
        if (existing) return jsonError('Already authenticated', 400);
        const body = await req.json();
        // server action expects FormData
        const fd = new FormData();
        if (body.name) fd.append('name', body.name);
        if (body.email) fd.append('email', body.email);
        if (body.password) fd.append('password', body.password);
        if (body.role) fd.append('role', body.role);
        const { signup } = await import('@/lib/actions');
        const prevState = { status: 'idle', message: '', errors: null } as any;
        const result = await signup(prevState, fd);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
