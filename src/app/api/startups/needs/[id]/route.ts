import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { getStartupNeed } from '@/lib/actions';

export async function GET(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const params = await ctx.params;
        const id = params?.id;
        if (!id) return jsonError('Missing id', 400);
        const result = await getStartupNeed(id, user.uid);
        if (result.status === 'error') return jsonError(result.message, 404);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}

export async function PUT(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const params = await ctx.params;
        const id = params?.id;
        if (!id) return jsonError('Missing id', 400);
        const body = await req.json();
        const { updateStartupNeed } = await import('@/lib/actions');
        const result = await updateStartupNeed(id, body);
        if (result.status === 'error') return jsonError(result.message, 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}

export async function DELETE(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const params = await ctx.params;
        const id = params?.id;
        if (!id) return jsonError('Missing id', 400);
        const { deleteStartupNeed } = await import('@/lib/actions');
        const result = await deleteStartupNeed(id);
        if (result.status === 'error') return jsonError(result.message, 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}

export async function POST(req: Request, ctx: any) {
    try {
        // This POST will be used for sub-actions like status updates
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const params = await ctx.params;
        const id = params?.id;
        if (!id) return jsonError('Missing id', 400);
        const body = await req.json();
        const { updateStartupNeedStatus } = await import('@/lib/actions');
        if (!body?.status) return jsonError('Missing status', 400);
        const result = await updateStartupNeedStatus(id, body.status);
        if (result.status === 'error') return jsonError(result.message, 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
