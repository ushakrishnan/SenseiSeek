import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body = await req.json();
        const message = body.message as string;
        if (!message) return jsonError('Missing message', 400);
        const { broadcastMessageToAllUsers } = await import('@/lib/actions');
        const prevState = { status: 'idle', message: '' } as any;
        const formData = new FormData();
        formData.append('message', message);
        const result = await broadcastMessageToAllUsers((user as any).uid, prevState, formData as any);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
