import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body = await req.json();
        if (!body || !body.resume) return jsonError('Missing resume text', 400);
        const { parseResume } = await import('@/lib/actions');
        // parseResume expects a FormData second arg; create one and populate
        const fd = new FormData();
        fd.append('resume', body.resume);
        const prevState = { formState: 'idle', message: '' } as any;
        const result = await parseResume(prevState, fd);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
