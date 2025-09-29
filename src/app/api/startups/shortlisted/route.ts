import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { getShortlistedExecutivesForStartup } from '@/lib/actions';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const startupId = url.searchParams.get('startupId');
        if (!startupId) return jsonError('Missing startupId', 400);

        const user = await verifySessionCookie(req);
        console.debug('[api/startups/shortlisted] GET session=', !!user, 'startupId=', startupId);
        if (!user) return jsonError('Not authenticated', 401);

        const result = await getShortlistedExecutivesForStartup(startupId);
        if (result.status === 'error') return jsonError(result.message || 'Failed to fetch shortlisted', 500);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('[api/startups/shortlisted] GET error=', e);
        return jsonError(e?.message || String(err), 500);
    }
}
