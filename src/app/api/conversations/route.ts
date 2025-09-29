import { NextRequest } from 'next/server';
import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { getConversationsForUser, startOrGetAdminConversation, startConversation } from '@/lib/actions';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');
        if (!userId) return jsonError('Missing userId', 400);

        const session = await verifySessionCookie(req);
        console.debug('[api/conversations] GET session=', !!session, 'userId=', userId);
        if (!session) return jsonError('Unauthorized', 401);

        const result = await getConversationsForUser(userId);
        console.debug('[api/conversations] GET result=', result);
        return jsonOk(result);
    } catch (err: unknown) {
        console.error('[api/conversations] GET error=', err);
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        if (!body) return jsonError('Missing body', 400);

        const session = await verifySessionCookie(req);
        console.debug('[api/conversations] POST session=', !!session, 'body=', body);
        if (!session) return jsonError('Unauthorized', 401);

        // For now support starting admin conversations via startOrGetAdminConversation if isSupport flag provided
        if (body.admin && body.userId) {
            const res = await startOrGetAdminConversation(body.userId, body.initialMessage || null, body.guestName || undefined);
            return jsonOk(res);
        }

        // Support starting regular conversations from client via startConversation
        if (body.initiator && (body.startupId || body.executiveId)) {
            // call the server action that creates or finds the conversation and optionally sends the initial message
            const res = await startConversation(body as any);
            if (res.status === 'error') return jsonError(res.message || 'Failed to start conversation', 400);
            return jsonOk(res);
        }

        // Otherwise return error — unsupported creation flow
        return jsonError('Not implemented', 501);
    } catch (err: unknown) {
        console.error('[api/conversations] POST error=', err);
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
