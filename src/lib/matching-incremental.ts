import admin from './firebase';
import { query as vectorQuery } from './vector-db';
import { emitMetric } from './metrics';

/**
 * Given an executive vector, find affected startups and mark their vector-scores dirty
 * or enqueue lightweight updates. This is conservative: mark dirty and let worker recompute.
 */
export async function incrementalUpdateForExecutive(execId: string, vector: number[], topN = 50) {
    try {
        const resp = await vectorQuery(vector, topN, true).catch(() => null);
        if (!resp || !Array.isArray((resp as any).matches)) return 0;
        const ids = (resp as any).matches.map((m: any) => String(m.id || '').replace(/^user-|^executive-|^exec-|^job-/i, '')).filter(Boolean);
        if (!ids.length) return 0;
        const db = admin.firestore();
        const batch = db.batch();
        for (const sid of ids) {
            const ref = db.collection('matching-vector-scores').doc(`startup-${sid}`);
            batch.set(ref, { dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }
        await batch.commit();
        try { emitMetric('matching.incremental_marked', ids.length); } catch (e) { }
        return ids.length;
    } catch (err) {
        console.debug('[matching-incremental] failed', String(err));
        try { emitMetric('matching.incremental_failed', 1); } catch (e) { }
        return 0;
    }
}

export default { incrementalUpdateForExecutive };
