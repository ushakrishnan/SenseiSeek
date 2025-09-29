import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body = await req.json();
        if (!body || !body.currentValue) return jsonError('Missing currentValue', 400);
        const { rewriteExecutiveProfileField } = await import('@/lib/actions');
        const prevState = { status: 'idle', message: '' } as any;
        const input = { fieldName: body.fieldName, currentValue: body.currentValue, index: body.index } as any;
        const result = await rewriteExecutiveProfileField(prevState, input);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
