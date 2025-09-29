import { jsonOk, jsonError, requireAdminHandler } from '@/lib/api-utils';
import admin from '@/lib/firebase';
import { computeEmbedding } from '@/lib/embeddings';

export const POST = requireAdminHandler(async (req: Request, user: any) => {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit || 500);
    const kind = body.kind === 'job' ? 'startup-needs' : 'executive-profiles';

    const db = admin.firestore();
    const snaps = await db.collection(kind).limit(limit).get();
    const missing = [];
    for (const s of snaps.docs) {
        const id = s.id;
        const embId = `${body.kind === 'job' ? 'job' : 'user'}-${id}`;
        const eSnap = await db.collection('embeddings').doc(embId).get();
        if (!eSnap.exists) missing.push(id);
    }

    return jsonOk({ missing, count: missing.length });
});
