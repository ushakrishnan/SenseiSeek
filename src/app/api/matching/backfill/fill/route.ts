import { jsonOk, jsonError, requireAdminHandler } from '@/lib/api-utils';
import admin from '@/lib/firebase';
import { canonicalizeUserProfile, canonicalizeJob, computeEmbedding, writeEmbedding } from '@/lib/embeddings';

export const POST = requireAdminHandler(async (req: Request, user: any) => {
    const body = await req.json().catch(() => ({}));
    const kind = body.kind === 'job' ? 'job' : 'user';
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) return jsonError('No ids provided', 400);

    const db = admin.firestore();
    const results: any[] = [];
    for (const id of ids) {
        try {
            const doc = await db.collection(kind === 'job' ? 'startup-needs' : 'executive-profiles').doc(id).get();
            if (!doc.exists) { results.push({ id, ok: false, reason: 'not found' }); continue; }
            const raw = doc.data() || {};
            const text = kind === 'job' ? canonicalizeJob(raw) : canonicalizeUserProfile(raw);
            const vec = await computeEmbedding(text);
            await writeEmbedding(id, kind === 'job' ? 'job' : 'user', text, vec);
            results.push({ id, ok: true });
        } catch (err: unknown) {
            const e = err as { message?: string } | undefined;
            console.error('[backfill/fill] id=', id, e);
            results.push({ id, ok: false, reason: e?.message || String(err) });
        }
    }

    return jsonOk({ results });
});
