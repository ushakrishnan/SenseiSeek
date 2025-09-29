// Ensure firebase admin can initialize in test environment (minimal config)
process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64 || Buffer.from(JSON.stringify({ project_id: 'test' })).toString('base64');
import admin from '@/lib/firebase';
import { runRecomputeWorkerOnce } from '@/workers/recompute-matching';
import { setStartupMatches, markStartupDirty } from '@/lib/matching-cache';
// We'll stub the vector-db query by patching the module require cache.
import * as vectorDb from '@/lib/vector-db';

const hasEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
if (!hasEmulator) {
    test.skip('worker processes dirty startup and writes vector-scores and matches (requires Firestore emulator)', () => { });
} else {
    beforeAll(async () => {
        // clear relevant collections
        const db = admin.firestore();
        for (const c of ['matching-cache', 'startup-needs', 'executive-profiles', 'matching-vector-scores']) {
            const snap = await db.collection(c).get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    });

    afterEach(async () => {
        const db = admin.firestore();
        for (const c of ['matching-cache', 'startup-needs', 'executive-profiles', 'matching-vector-scores']) {
            const snap = await db.collection(c).get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    });

    test('worker processes dirty startup and writes vector-scores and matches', async () => {
        const db = admin.firestore();
        // create a startup need
        const startupId = 'wtest1';
        await db.collection('startup-needs').doc(startupId).set({ key: startupId, roleSummary: 'Build payments', budget: '5000', requiredExpertise: ['payments'], companyStage: 'seed' });
        // create an exec profile
        const execId = 'exec-w1';
        await db.collection('executive-profiles').doc(execId).set({ name: 'Exec One', expertise: 'payments', keyAccomplishments: [], availability: 'immediate' });
        // mark matching-cache dirty doc
        await db.collection('matching-cache').doc(`startup-${startupId}`).set({ key: startupId, type: 'startup', dirty: true });

        // stub vector-db.query to return our exec
        const origQuery = vectorDb.query;
        (vectorDb as any).query = async () => ({ matches: [{ id: execId, score: 0.9 }] });

        try {
            const res = await runRecomputeWorkerOnce('test-runner');
            expect(res.processed).toBeGreaterThanOrEqual(1);

            // verify vector-scores doc created
            const vs = await db.collection('matching-vector-scores').doc(`startup-${startupId}`).get();
            expect(vs.exists).toBe(true);
            const vdata = vs.data() || {};
            expect(vdata.scores).toBeTruthy();
            expect(Object.keys(vdata.scores).length).toBeGreaterThan(0);

            // verify matching-cache matches created
            const mc = await db.collection('matching-cache').doc(`startup-${startupId}`).get();
            expect(mc.exists).toBe(true);
            const mcdata = mc.data() || {};
            expect(Array.isArray(mcdata.matches)).toBe(true);
            expect(mcdata.matches.length).toBeGreaterThan(0);
        } finally {
            (vectorDb as any).query = origQuery;
        }
    });
}
