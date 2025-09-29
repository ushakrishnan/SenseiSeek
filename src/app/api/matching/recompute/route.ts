import { jsonOk, jsonError, requireAdminHandler } from '@/lib/api-utils';
import admin from '@/lib/firebase';

export const POST = requireAdminHandler(async (req: Request, user: any) => {
    const body = await req.json().catch(() => ({}));
    const bodyObj = body as any;

    // Single enqueue by id (existing behavior)
    if (bodyObj.id) {
        const payload = {
            owner: `admin:${user.uid}`,
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            runAt: admin.firestore.Timestamp.fromDate(new Date()),
            status: 'pending',
            params: { id: bodyObj.id },
        } as any;
        const docRef = await admin.firestore().collection('matching-worker-queue').add(payload);
        return jsonOk({ queued: true, id: docRef.id });
    }

    // Bulk enqueue modes
    const kind = bodyObj.kind || 'nightly';
    const batchSize = Number(bodyObj.batchSize || 100);

    if (kind === 'nightly' || kind === 'startups') {
        // Enqueue recompute jobs for all active startups (or provided ids)
        let startupIds: string[] = [];
        if (Array.isArray(bodyObj.ids) && bodyObj.ids.length > 0) {
            startupIds = bodyObj.ids;
        } else {
            const snaps = await admin.firestore().collection('startup-needs').where('status', '==', 'active').get();
            startupIds = snaps.docs.map(d => d.id);
        }

        // chunk and enqueue
        for (let i = 0; i < startupIds.length; i += batchSize) {
            const chunk = startupIds.slice(i, i + batchSize);
            const batch = admin.firestore().batch();
            chunk.forEach(id => {
                const payload = {
                    owner: `admin:${user.uid}`,
                    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
                    runAt: admin.firestore.Timestamp.fromDate(new Date()),
                    status: 'pending',
                    params: { id },
                } as any;
                const ref = admin.firestore().collection('matching-worker-queue').doc();
                batch.set(ref, payload);
            });
            await batch.commit();
        }

        return jsonOk({ queued: true, count: startupIds.length });
    }

    if (kind === 'tags' && Array.isArray(bodyObj.ids)) {
        // enqueue by tag list
        const tags: string[] = bodyObj.ids;
        for (const tag of tags) {
            const payload = {
                owner: `admin:${user.uid}`,
                requestedAt: admin.firestore.FieldValue.serverTimestamp(),
                runAt: admin.firestore.Timestamp.fromDate(new Date()),
                status: 'pending',
                params: { tag },
            } as any;
            await admin.firestore().collection('matching-worker-queue').add(payload);
        }
        return jsonOk({ queued: true, tags: bodyObj.ids.length });
    }

    return jsonError('Invalid request body', 400);
});
