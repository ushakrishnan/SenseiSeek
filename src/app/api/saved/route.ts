import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { toggleSaveOpportunity } from '@/lib/actions';

export async function POST(req: Request) {
    try {
        // verify session cookie
        const session = await verifySessionCookie(req);
        if (!session) return jsonError('Unauthorized', 401);

        const body = await req.json().catch(() => null);

        const { executiveId, startupNeedId, save } = body || {};
        if (!executiveId || !startupNeedId || typeof save !== 'boolean') return jsonError('Missing parameters', 400);

        // The client sends `save` as the desired state (true = should be saved).
        // The server action `toggleSaveOpportunity` expects the *current* state
        // (isCurrentlySaved). Convert desired -> current by inverting.
        const isCurrentlySaved = !save;
        const result = await toggleSaveOpportunity(executiveId, startupNeedId, isCurrentlySaved);
        return jsonOk(result);
    } catch (err: unknown) {
        console.error('[api/saved] error', err);
        return jsonError(err instanceof Error ? err.message : 'Unknown error', 500);
    }
}

export async function GET(req: Request) {
    // lightweight ping to verify route exists
    try {
        return jsonOk({ ok: true, message: 'saved route active' });
    } catch (err: unknown) {
        return jsonError('Failed', 500);
    }
}
