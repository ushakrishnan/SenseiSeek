import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        // `ctx.params` can be an async getter in some Next.js setups — await it before accessing properties.
        const params = ctx?.params ? await ctx.params : {};
        const uid = params?.uid as string | undefined;
        if (!uid) return jsonError('Missing uid', 400);
        const { getUnreadMessageCount } = await import('@/lib/actions');
        const result = await getUnreadMessageCount(uid);
        if (result.status === 'error') return jsonError(result.message, 500);
        return jsonOk({ count: result.count });
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
