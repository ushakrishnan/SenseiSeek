import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        console.debug('[users/details] verifySessionCookie result=', user);
        if (!user) return jsonError('Not authenticated', 401);
        // `ctx.params` can be an async getter in some Next.js setups — await it before accessing properties.
        const params = ctx?.params ? await ctx.params : {};
        const uid = params?.uid as string | undefined;
        if (!uid) return jsonError('Missing uid', 400);
        const { getUserDetails } = await import('@/lib/actions');
        console.debug('[users/details] fetching details for uid=', uid);
        const result = await getUserDetails(uid);
        if (!result) return jsonError('User not found', 404);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
