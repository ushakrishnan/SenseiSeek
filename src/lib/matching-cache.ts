import admin from './firebase';
import crypto from 'crypto';

/**
 * Lightweight Firestore-backed matching cache.
 * Docs are stored in collection `matching-cache` with docId `startup-{id}` or `executive-{id}`.
 * Fields:
 *  - key: string
 *  - type: 'startup' | 'executive'
 *  - inputHash: string (sha256 of canonical input)
 *  - matches: any[] (cached match results)
 *  - updatedAt: firestore.Timestamp
 *  - dirty: boolean
 *  - tags?: string[]  // optional tags used to find caches affected by profile/job changes
 *  - recomputeClaim?: { owner: string, until: firestore.Timestamp } // claim for background workers
 */

const COLL = 'matching-cache';

function sha256(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

export async function getStartupCacheDoc(startupId: string) {
    const db = admin.firestore();
    const docRef = db.collection(COLL).doc(`startup-${startupId}`);
    const snap = await docRef.get();
    if (!snap.exists) return null;
    return { ref: docRef, data: snap.data() };
}

export async function setStartupMatches(startupId: string, inputHash: string, matches: any[], tags?: string[]) {
    const db = admin.firestore();
    const docRef = db.collection(COLL).doc(`startup-${startupId}`);
    await docRef.set({
        key: startupId,
        type: 'startup',
        inputHash,
        matches,
        tags: tags || admin.firestore.FieldValue.delete(),
        dirty: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}

export async function markStartupDirty(startupId: string) {
    const db = admin.firestore();
    const docRef = db.collection(COLL).doc(`startup-${startupId}`);
    await docRef.set({ dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

/**
 * Mark all cache docs that include the provided tag as dirty.
 * Useful when an executive/profile is updated and we need to invalidate caches that reference them.
 */
export async function markCachesDirtyByTag(tag: string) {
    const db = admin.firestore();
    const q = db.collection(COLL).where('tags', 'array-contains', tag);
    const snap = await q.get();
    if (snap.empty) return 0;
    const batch = db.batch();
    snap.forEach(s => batch.set(s.ref, { dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }));
    await batch.commit();
    return snap.size;
}

/**
 * Attempt to claim a cache doc for recompute. Returns true if claim succeeded.
 * The claim will be set to expire after ttlMs unless released.
 */
export async function claimStartupForRecompute(startupId: string, ownerId: string, ttlMs = 5 * 60 * 1000) {
    const db = admin.firestore();
    const docRef = db.collection(COLL).doc(`startup-${startupId}`);
    const now = Date.now();
    const untilDate = new Date(now + ttlMs);

    return db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        const untilTs = admin.firestore.Timestamp.fromDate(untilDate);
        if (!snap.exists) {
            tx.set(docRef, { key: startupId, type: 'startup', recomputeClaim: { owner: ownerId, until: untilTs }, dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            return true;
        }
        const data = snap.data() as any;
        const claim = data?.recomputeClaim;
        if (!claim || !claim.until) {
            tx.set(docRef, { recomputeClaim: { owner: ownerId, until: untilTs }, dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            return true;
        }
        const currentUntil = (claim.until as admin.firestore.Timestamp).toMillis();
        if (currentUntil < now) {
            // expired, steal it
            tx.set(docRef, { recomputeClaim: { owner: ownerId, until: untilTs }, dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            return true;
        }
        // already claimed and not expired
        return false;
    });
}

/**
 * Release a recompute claim if owned by the provided ownerId.
 */
export async function releaseStartupClaim(startupId: string, ownerId: string) {
    const db = admin.firestore();
    const docRef = db.collection(COLL).doc(`startup-${startupId}`);
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) return false;
        const data = snap.data() as any;
        const claim = data?.recomputeClaim;
        if (claim?.owner === ownerId) {
            tx.update(docRef, { recomputeClaim: admin.firestore.FieldValue.delete(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            return true;
        }
        return false;
    });
}

export type ComputeFn = () => Promise<any[]>;

export async function getOrComputeStartupMatches(startupId: string, inputObject: any, computeFn: ComputeFn, tags?: string[]) {
    const ttlMs = Number(process.env.MATCH_CACHE_TTL_MS || 1000 * 60 * 60 * 24); // 24h default
    const db = admin.firestore();
    const docRef = db.collection(COLL).doc(`startup-${startupId}`);
    const snap = await docRef.get();

    const canonical = JSON.stringify(inputObject);
    const inputHash = sha256(canonical);

    if (snap.exists) {
        const data = snap.data() as any;
        const dirty = !!data.dirty;
        const storedHash = data.inputHash as string | undefined;
        const updatedAt = data.updatedAt ? (data.updatedAt as admin.firestore.Timestamp).toMillis() : 0;
        const age = Date.now() - updatedAt;
        // Use cache if not dirty, hash matches, and within TTL
        if (!dirty && storedHash === inputHash && age < ttlMs) {
            return data.matches || [];
        }
    }

    // Compute fresh matches
    const matches = await computeFn();

    try {
        await docRef.set({
            key: startupId,
            type: 'startup',
            inputHash,
            matches,
            tags: tags || admin.firestore.FieldValue.delete(),
            dirty: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        // non-fatal cache write failure
        console.debug('[matching-cache] failed to write cache', err);
    }

    return matches;
}

// --- Durable exec-vector-scores cache (separate collection)
const VEC_COLL = 'matching-vector-scores';

export async function getStartupVectorScores(startupId: string) {
    const db = admin.firestore();
    const docRef = db.collection(VEC_COLL).doc(`startup-${startupId}`);
    const snap = await docRef.get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    // verify expiry if present
    const expiresAt = data?.expiresAt as admin.firestore.Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis && Date.now() > expiresAt.toMillis()) return null;
    return data.scores || null;
}

export async function setStartupVectorScores(startupId: string, scores: Record<string, number>, ttlMs?: number) {
    const db = admin.firestore();
    const docRef = db.collection(VEC_COLL).doc(`startup-${startupId}`);
    const ttl = typeof ttlMs === 'number' ? ttlMs : Number(process.env.MATCH_VECTOR_SCORES_TTL_MS || 1000 * 60 * 5);
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + ttl));
    await docRef.set({
        key: startupId,
        scores,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        dirty: false,
    }, { merge: true });
}

export async function markStartupVectorScoresDirty(startupId: string) {
    const db = admin.firestore();
    const docRef = db.collection(VEC_COLL).doc(`startup-${startupId}`);
    await docRef.set({ dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

export default {
    getStartupCacheDoc,
    setStartupMatches,
    markStartupDirty,
    getOrComputeStartupMatches,
};
