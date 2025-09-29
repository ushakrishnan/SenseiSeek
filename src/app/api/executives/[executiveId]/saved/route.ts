import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request, { params }: any) {
    try {
        const handlerStart = Date.now();
        const beforeVerify = Date.now();
        const user = await verifySessionCookie(req);
        const afterVerify = Date.now();
        if (!user) return jsonError('Not authenticated', 401);
        const resolvedParams = params ? await params : {};
        const executiveId = resolvedParams?.executiveId || (user as any).uid;
        const importStart = Date.now();
        const { getSavedOpportunities } = await import('@/lib/actions');
        const importMs = Date.now() - importStart;
        const result = await getSavedOpportunities(executiveId);
        const totalMs = Date.now() - handlerStart;
        console.debug(`[savedRoute] exec=${executiveId} authMs=${afterVerify - beforeVerify} importMs=${importMs} totalMs=${totalMs}`);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
