import admin from 'firebase-admin';
import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';
import { checkAdmin } from '@/lib/actions';

// Enqueue ai-match jobs for all executive profiles x startup-needs
export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);

        // Ensure caller is admin using centralized check
        const uid = (user as any).uid as string;
        await checkAdmin(uid);

        const body = await req.json().catch(() => null);
        const { batchSize = 100 } = body || {};

        const db = admin.firestore();
        const execSnapshot = await db.collection('executive-profiles').get();
        const needsSnapshot = await db.collection('startup-needs').where('status', '==', 'active').get();

        if (execSnapshot.empty || needsSnapshot.empty) return jsonOk({ enqueued: 0 });

        let enqueued = 0;
        // Enqueue in batches to reduce transactional pressure
        for (const execDoc of execSnapshot.docs) {
            for (const needDoc of needsSnapshot.docs) {
                // Skip if ai-match already exists
                const cacheRef = db.collection('executive-profiles').doc(execDoc.id).collection('ai-matches').doc(needDoc.id);
                const cached = await cacheRef.get();
                if (cached.exists) continue;

                const jobRef = db.collection('ai-match-queue').doc();
                await jobRef.set({ executiveId: execDoc.id, needId: needDoc.id, status: 'pending', attempts: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() });
                enqueued++;
                if (enqueued >= batchSize) break;
            }
            if (enqueued >= batchSize) break;
        }

        return jsonOk({ enqueued });
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
