import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function GET(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const url = new URL(req.url);
        const executiveId = url.searchParams.get('executiveId');
        const startupId = url.searchParams.get('startupId');
        const { getApplications, getApplicantsForStartup } = await import('@/lib/actions');

        if (executiveId) {
            const result = await getApplications(executiveId);
            console.debug('[api/applications] GET executiveId=', executiveId, 'result=', result);
            return jsonOk(result);
        }

        if (startupId) {
            const result = await getApplicantsForStartup(startupId);
            console.debug('[api/applications] GET startupId=', startupId, 'result=', result);
            return jsonOk(result);
        }

        // default to the authenticated user's executive applications
        const result = await getApplications((user as any).uid);
        console.debug('[api/applications] GET default uid=', (user as any).uid, 'result=', result);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
