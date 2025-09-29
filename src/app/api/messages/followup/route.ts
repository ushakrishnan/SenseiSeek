import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { generateFollowUpMessage } from '@/lib/actions';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);

        const body = await req.json();
        const { executiveId, needId } = body || {};
        if (!executiveId || !needId) return jsonError('Missing executiveId or needId', 400);

        const result = await generateFollowUpMessage({ executiveId, needId });
        if (result.status === 'error') return jsonError(result.message || 'Failed to generate follow-up message', 400);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
