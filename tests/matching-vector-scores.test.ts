// Ensure firebase admin can initialize in test environment (minimal config)
process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64 || Buffer.from(JSON.stringify({ project_id: 'test' })).toString('base64');
import admin from '@/lib/firebase';
import { getStartupVectorScores, setStartupVectorScores, markStartupVectorScoresDirty } from '@/lib/matching-cache';
import { resetMetrics, getMetric } from '@/lib/metrics';

const hasEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (!hasEmulator) {
    test.skip('setStartupVectorScores and getStartupVectorScores roundtrip (requires Firestore emulator)', () => { });
    test.skip('markStartupVectorScoresDirty sets dirty flag (requires Firestore emulator)', () => { });
} else {
    beforeAll(async () => {
        const db = admin.firestore();
        const snap = await db.collection('matching-vector-scores').get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    });

    afterEach(async () => {
        const db = admin.firestore();
        const snap = await db.collection('matching-vector-scores').get();
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        resetMetrics();
    });

    test('setStartupVectorScores and getStartupVectorScores roundtrip', async () => {
        const startupId = 'test-startup-1';
        const scores = { 'exec1': 0.8, 'exec2': 0.4 };
        await setStartupVectorScores(startupId, scores, 1000 * 60);
        const got = await getStartupVectorScores(startupId);
        expect(got).not.toBeNull();
        expect(got!['exec1']).toBeCloseTo(0.8);
        expect(got!['exec2']).toBeCloseTo(0.4);
    });

    test('markStartupVectorScoresDirty sets dirty flag', async () => {
        const startupId = 'test-startup-2';
        const scores = { 'execA': 0.2 };
        await setStartupVectorScores(startupId, scores, 1000 * 60);
        await markStartupVectorScoresDirty(startupId);
        const db = admin.firestore();
        const snap = await db.collection('matching-vector-scores').doc(`startup-${startupId}`).get();
        const data = snap.data();
        expect(data).toBeTruthy();
        expect(data?.dirty).toBe(true);
    });
}
