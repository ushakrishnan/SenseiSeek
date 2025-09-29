import admin from './firebase';

const COLL = 'ai-circuit-breakers';
const DOC_ID = 'genkit-quota';

/**
 * Get the cooldown-until timestamp (ms since epoch) from Firestore, or null.
 */
export async function getCooldownUntil(): Promise<number | null> {
    const db = admin.firestore();
    const snap = await db.collection(COLL).doc(DOC_ID).get();
    if (!snap.exists) return null;
    const data = snap.data() as any;
    const ts = data?.cooldownUntil;
    if (!ts) return null;
    try {
        return ts.toMillis ? ts.toMillis() : Number(ts);
    } catch (e) {
        return null;
    }
}

export async function isCooldownActive(): Promise<boolean> {
    const until = await getCooldownUntil();
    return !!(until && Date.now() < until);
}

export async function setCooldownUntil(untilMs: number, reason?: string) {
    const db = admin.firestore();
    const docRef = db.collection(COLL).doc(DOC_ID);
    await docRef.set({ cooldownUntil: admin.firestore.Timestamp.fromMillis(untilMs), reason: reason || null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

/**
 * Inspect an error and, if it appears to be a quota/429, set a cooldown using
 * any RetryInfo found in the error details. Returns true if cooldown was set.
 */
export async function trySetCooldownFromError(err: unknown, defaultMs = 60000): Promise<boolean> {
    try {
        const e: any = err as any;
        const status = e?.status || e?.statusCode || (e?.code ? Number(e.code) : undefined);
        const msg = String(e?.message || e || '');
        const isQuota = status === 429 || /quota|too many requests|RateLimit/i.test(msg);
        if (!isQuota) return false;

        let retryDelayMs = defaultMs;
        const details = e?.errorDetails || e?.details || e?.error?.details || e?.error?.details;
        if (Array.isArray(details)) {
            for (const d of details) {
                try {
                    if (d?.retryDelay) {
                        const s = String(d.retryDelay || '').trim();
                        const match = s.match(/([0-9]*\.?[0-9]+)s/);
                        if (match) retryDelayMs = Math.max(1000, Math.round(parseFloat(match[1]) * 1000));
                    }
                } catch (_) { /* noop */ }
            }
        }

        const until = Date.now() + retryDelayMs;
        await setCooldownUntil(until, msg);
        return true;
    } catch (e) {
        return false;
    }
}

export default { getCooldownUntil, isCooldownActive, setCooldownUntil, trySetCooldownFromError };
