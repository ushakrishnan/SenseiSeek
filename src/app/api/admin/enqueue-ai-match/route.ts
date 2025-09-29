import admin from 'firebase-admin';
import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { checkAdmin } from '@/lib/actions';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);

        // Ensure caller is admin using centralized check
        const uid = (user as any).uid as string;
        await checkAdmin(uid);

        const body = await req.json().catch(() => null);
        if (!body || !body.executiveId || !body.needId) return jsonError('executiveId and needId required', 400);

        const db = admin.firestore();
        const jobRef = db.collection('ai-match-queue').doc();
        await jobRef.set({ executiveId: body.executiveId, needId: body.needId, status: 'pending', attempts: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return jsonOk({ jobId: jobRef.id });
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
