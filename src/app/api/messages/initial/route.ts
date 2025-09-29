import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { generateInitialMessage } from '@/lib/actions';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body = await req.json();
        const { startupId, executiveId } = body || {};
        if (!startupId || !executiveId) return jsonError('Missing startupId or executiveId', 400);
        const result = await generateInitialMessage({ startupId, executiveId });
        if (result.status === 'error') return jsonError(result.message || 'Failed to generate message', 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
