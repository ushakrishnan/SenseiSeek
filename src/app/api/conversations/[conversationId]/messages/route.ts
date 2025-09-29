import { NextRequest } from 'next/server';
import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { getMessagesForConversation, sendMessage } from '@/lib/actions';

export async function GET(req: NextRequest, context: any) {
    try {
        const { conversationId } = await context.params;
        const url = new URL(req.url);
        const userId = url.searchParams.get('userId') || '';

        const session = await verifySessionCookie(req);
        console.debug('[api/conversations/[id]/messages] GET session=', !!session, 'conversationId=', conversationId, 'userId=', userId);
        if (!session) return jsonError('Unauthorized', 401);

        const result = await getMessagesForConversation(conversationId, userId || (session as any).uid);
        console.debug('[api/conversations/[id]/messages] GET result=', result);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('[api/conversations/[id]/messages] GET error=', e);
        return jsonError(e?.message || String(err), 500);
    }
}

export async function POST(req: NextRequest, context: any) {
    try {
        const { conversationId } = await context.params;
        const body = await req.json().catch(() => null);
        if (!body) return jsonError('Missing body', 400);

        const session = await verifySessionCookie(req);
        console.debug('[api/conversations/[id]/messages] POST session=', !!session, 'conversationId=', conversationId, 'body=', body);
        if (!session) return jsonError('Unauthorized', 401);

        const senderId = (session as any).uid;
        const res = await sendMessage({ conversationId, senderId, text: body.text, isBroadcast: body.isBroadcast });
        return jsonOk(res);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('[api/conversations/[id]/messages] POST error=', e);
        return jsonError(e?.message || String(err), 500);
    }
}
