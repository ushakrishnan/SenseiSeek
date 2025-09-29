import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const url = new URL(req.url);
        const adminId = url.searchParams.get('adminId') || (user as any).uid;
        const { getAdminAllApplications } = await import('@/lib/actions');
        const result = await getAdminAllApplications(adminId as string);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
