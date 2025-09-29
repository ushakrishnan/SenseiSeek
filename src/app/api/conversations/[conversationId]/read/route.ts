import { NextRequest } from 'next/server';
import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { markConversationAsRead } from '@/lib/actions';

export async function POST(req: NextRequest, context: any) {
    try {
        const { conversationId } = await context.params;
        const body = await req.json().catch(() => null);
        const userId = body?.userId;

        const session = await verifySessionCookie(req);
        console.debug('[api/conversations/[id]/read] POST session=', !!session, 'conversationId=', conversationId, 'userId=', userId);
        if (!session) return jsonError('Unauthorized', 401);

        if (!userId) return jsonError('Missing userId', 400);
        const res = await markConversationAsRead(userId, conversationId);
        return jsonOk(res);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('[api/conversations/[id]/read] POST error=', e);
        return jsonError(e?.message || String(err), 500);
    }
}
