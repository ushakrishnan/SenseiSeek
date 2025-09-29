import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body = await req.json();
        const targetUserId = body.targetUserId as string;
        if (!targetUserId) return jsonError('Missing targetUserId', 400);
        const { adminStartConversationWithUser } = await import('@/lib/actions');
        const result = await adminStartConversationWithUser((user as any).uid, targetUserId);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
