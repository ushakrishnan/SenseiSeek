import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const params = await ctx.params;
        const id = params?.id;
        if (!id) return jsonError('Missing id', 400);
        const { getStartupProfile } = await import('@/lib/actions');
        const result = await getStartupProfile(id);
        if (result.status === 'error') return jsonError(result.message, 404);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}

export async function POST(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const params = await ctx.params;
        const id = params?.id;
        if (!id) return jsonError('Missing id', 400);
        if (user.uid !== id) return jsonError('Forbidden', 403);
        const body = await req.json();
        const { saveStartupProfile } = await import('@/lib/actions');
        const result = await saveStartupProfile(id, body);
        if (result.status === 'error') return jsonError(result.message, 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
