require('dotenv').config();
const admin = require('firebase-admin');
let fetch = globalThis.fetch;
if (!fetch) {
    const nf = require('node-fetch');
    fetch = nf.default || nf;
}

function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) return;
    const base64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64;
    if (!base64) {
        console.error('FIREBASE_ADMIN_SDK_CONFIG_BASE64 not set. Aborting.');
        process.exit(1);
    }
    const obj = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(obj) });
}

async function queryPinecone(vector, topK = 5, includeMetadata = true) {
    const apiKey = process.env.PINECONE_API_KEY;
    const env = process.env.PINECONE_ENV;
    const index = process.env.PINECONE_INDEX_NAME;
    const base = process.env.PINECONE_BASE_URL || (index && env ? `https://${index}-${env}.svc.pinecone.io` : '');
    if (!apiKey || !base) throw new Error('Pinecone not configured');
    const res = await fetch(`${base}/query`, {
        method: 'POST',
        headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector, topK, includeMetadata }),
    });
    if (!res.ok) throw new Error(`Pinecone query failed: ${res.status} ${await res.text()}`);
    return res.json();
}

(async function main() {
    initializeFirebaseAdmin();
    const db = admin.firestore();
    const snaps = await db.collection('embeddings').limit(1).get();
    if (snaps.empty) { console.error('no embeddings docs'); process.exit(1); }
    const doc = snaps.docs[0];
    console.log('using embeddings doc', doc.id);
    const data = doc.data();
    const v = data.vector;
    if (!v) { console.error('doc has no vector'); process.exit(1); }
    const res = await queryPinecone(v, 5, true);
    console.log('Pinecone query response:');
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
