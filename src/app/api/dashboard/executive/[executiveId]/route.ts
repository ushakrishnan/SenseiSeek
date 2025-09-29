import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request, context: any) {
    try {
        // Next.js may provide `context` as a thenable proxy — await it before using `params`.
        // Await the context.params directly (recommended) to ensure we don't access a thenable proxy's properties synchronously
        const params = await context.params;
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const executiveId = (params as any)?.executiveId || (user as any).uid;
        const { getExecutiveDashboardStats } = await import('@/lib/actions');
        const result = await getExecutiveDashboardStats(executiveId);
        console.debug('[api/dashboard/executive] result=', result);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
