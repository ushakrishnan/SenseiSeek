import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request, context: any) {
    try {
        const { params } = await context;
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const startupId = params?.startupId || (user as any).uid;
        const { getStartupDashboardStats } = await import('@/lib/actions');
        const result = await getStartupDashboardStats(startupId);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
