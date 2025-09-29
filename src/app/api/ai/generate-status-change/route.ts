import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const session = await verifySessionCookie(req);
        if (!session) return jsonError('Unauthorized', 401);

        const body = await req.json();
        const { generateStatusChangeMessage } = await import('@/lib/actions');
        const result = await generateStatusChangeMessage({
            startupId: body.startupId,
            executiveId: body.executiveId,
            roleTitle: body.roleTitle,
            newStatus: body.newStatus,
        });

        if (result?.status === 'success') return jsonOk(result);
        return jsonError(result?.message || 'Failed to generate message', 500);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('Error in /api/ai/generate-status-change:', e);
        return jsonError(e?.message || String(err), 500);
    }
}
