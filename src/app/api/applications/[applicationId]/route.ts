import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function PATCH(req: Request, context: any) {
    try {
        const { params } = await context;
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);

        const applicationId = params?.applicationId;
        if (!applicationId) return jsonError('applicationId required', 400);

        const body = await req.json().catch(() => null);
        if (!body || typeof body.status !== 'string') return jsonError('Invalid payload', 400);

        const { updateApplicationStatus } = await import('@/lib/actions');
        const result = await updateApplicationStatus({
            applicationId,
            status: body.status,
            sendMessage: !!body.sendMessage,
            messageContent: body.messageContent,
            startupId: body.startupId,
            executiveId: body.executiveId,
        });

        if (result.status !== 'success') return jsonError(result.message, 500);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
