import { describe, it, expect } from 'vitest';
import admin from 'firebase-admin';

// This smoke test requires real infra and may be expensive. It runs only when
// you set RUN_PINECONE_SMOKE=1 in the environment. Otherwise it is skipped.
const RUN = process.env.RUN_PINECONE_SMOKE === '1';

function initFirebase() {
    if (admin.apps.length > 0) return;
    const base64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64;
    if (!base64) throw new Error('FIREBASE_ADMIN_SDK_CONFIG_BASE64 not set');
    const obj = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(obj) });
}

describe('pinecone smoke', () => {
    it('queries pinecone for an embeddings doc (skip by default)', async () => {
        if (!RUN) {
            console.warn('SKIPPING pinecone smoke test — set RUN_PINECONE_SMOKE=1 to run');
            return;
        }

        initFirebase();
        const db = admin.firestore();
        const snaps = await db.collection('embeddings').limit(1).get();
        expect(snaps.empty).toBe(false);
        const doc = snaps.docs[0];
        const data = doc.data() as any;
        expect(data).toBeTruthy();
        const vector = data.vector;
        expect(Array.isArray(vector)).toBe(true);
        // Import the vector query function dynamically to avoid ESM/CJS issues in test runner
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const vb = require('../src/lib/vector-db');
        const queryFn = vb.query || vb.default?.query;
        expect(typeof queryFn).toBe('function');
        const res = await queryFn(vector, 3, true);
        expect(res).toBeTruthy();
        // basic shape assertions
        expect(Array.isArray(res.matches)).toBe(true);
        expect(res.matches.length).toBeGreaterThanOrEqual(1);
        const top = res.matches[0];
        expect(top).toHaveProperty('id');
        expect(top).toHaveProperty('score');
    });
});
