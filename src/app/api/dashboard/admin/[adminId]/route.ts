import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request, { params }: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const adminId = (await params)?.adminId || (user as any).uid;
        const { getAdminDashboardStats } = await import('@/lib/actions');
        const result = await getAdminDashboardStats(adminId);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
