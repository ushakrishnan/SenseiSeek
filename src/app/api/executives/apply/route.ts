import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { applyForOpportunity } from '@/lib/actions';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Unauthorized', 401);

        const body = await req.json().catch(() => null);
        const { needId, executiveId } = body || {};
        if (!needId || !executiveId) return jsonError('Missing parameters', 400);

        const result = await applyForOpportunity(needId, executiveId);
        return jsonOk(result);
    } catch (err: unknown) {
        console.error('[api/executives/apply] error', err);
        return jsonError(err instanceof Error ? err.message : 'Unknown error', 500);
    }
}
