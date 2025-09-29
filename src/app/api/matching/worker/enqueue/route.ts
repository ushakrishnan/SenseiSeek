import { jsonOk, jsonError, requireAdminHandler } from '@/lib/api-utils';
import admin from '@/lib/firebase';

export const POST = requireAdminHandler(async (req: Request, user: any) => {
    const body = await req.json().catch(() => ({}));
    const owner = `admin:${user.uid}`;
    const runAt = body.runAt ? new Date(body.runAt) : new Date();
    const payload = {
        owner,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        runAt: admin.firestore.Timestamp.fromDate(runAt),
        status: 'pending',
        params: body.params || {},
    } as any;

    const docRef = await admin.firestore().collection('matching-worker-queue').add(payload);
    return jsonOk({ queued: true, id: docRef.id });
});

