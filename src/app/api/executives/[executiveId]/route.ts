import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { getExecutiveProfile, getExecutiveProfileById, saveExecutiveProfile } from '@/lib/actions';

export async function GET(req: Request, ctx: any) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const params = await ctx.params;
        const executiveId = params?.executiveId;
        if (!executiveId) return jsonError('Missing executiveId', 400);
        const url = new URL(req.url);
        const startupId = url.searchParams.get('startupId') || undefined;
        const result = startupId ? await getExecutiveProfileById(startupId, executiveId) : await getExecutiveProfile(executiveId);
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
        const executiveId = params?.executiveId;
        if (!executiveId) return jsonError('Missing executiveId', 400);
        // Only allow users to save their own profile (basic guard)
        if (user.uid !== executiveId) return jsonError('Forbidden', 403);
        const body = await req.json();
        const result = await saveExecutiveProfile(executiveId, body);
        if (result.status === 'error') return jsonError(result.message, 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
