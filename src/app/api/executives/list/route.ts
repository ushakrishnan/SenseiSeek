import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { getAllExecutiveProfiles } from '@/lib/actions';

export async function GET(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        // Allow callers to pass a startupId via query param
        const url = new URL(req.url);
        const startupId = url.searchParams.get('startupId') || (user as any).uid;
        const result = await getAllExecutiveProfiles(startupId);
        if (result.status === 'error') return jsonError(result.message, 500);
        return jsonOk(result);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
