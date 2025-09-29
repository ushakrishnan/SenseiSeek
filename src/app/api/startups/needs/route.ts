import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { getStartupNeeds } from '@/lib/actions';

export async function GET(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const result = await getStartupNeeds(user.uid);
        if (!result) return jsonError('No data', 500);
        if (result.status === 'error') return jsonError(result.message, 500);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body = await req.json();
        // Delegate to existing server action
        // Note: createStartupNeed expects (creatorId, data)
        const { createStartupNeed } = await import('@/lib/actions');
        const result = await createStartupNeed(user.uid, body);
        if (result.status === 'error') return jsonError(result.message, 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
