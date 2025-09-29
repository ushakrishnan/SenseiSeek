require('dotenv').config();
const admin = require('firebase-admin');
let fetch = globalThis.fetch;
if (!fetch) {
    const nf = require('node-fetch');
    fetch = nf.default || nf;
}
const crypto = require('crypto');

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';

const stats = {
    totalDocs: 0,
    embeddingsComputed: 0,
    embeddingsWriteSuccess: 0,
    embeddingsWriteFailed: 0,
    vectorsPrepared: 0,
    vectorsUpserted: 0,
    upsertFailed: 0,
};

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

function canonicalizeUserProfile(user) {
    if (!user) return '';
    const parts = [];
    if (user.name) parts.push(`Name: ${user.name}`);
    if (user.expertise) parts.push(`Expertise: ${Array.isArray(user.expertise) ? user.expertise.join(', ') : user.expertise}`);
    if (user.keyAccomplishments) parts.push(`Accomplishments: ${Array.isArray(user.keyAccomplishments) ? user.keyAccomplishments.map(a => a.value || a).join('; ') : user.keyAccomplishments}`);
    if (user.githubInsights) parts.push(`GitHub: ${user.githubInsights}`);
    if (user.resumeText) parts.push(`Resume: ${String(user.resumeText).slice(0, 1000)}`);
    return parts.join('\n');
}

function canonicalizeJob(job) {
    if (!job) return '';
    const parts = [];
    if (job.roleTitle) parts.push(`Title: ${job.roleTitle}`);
    if (job.roleSummary) parts.push(`Summary: ${job.roleSummary}`);
    if (job.keyDeliverables) parts.push(`Deliverables: ${job.keyDeliverables}`);
    if (job.requiredExpertise) parts.push(`Required: ${Array.isArray(job.requiredExpertise) ? job.requiredExpertise.join(', ') : job.requiredExpertise}`);
    if (job.companyName) parts.push(`Company: ${job.companyName}`);
    return parts.join('\n');
}

async function computeEmbeddingNode(text) {
    const apiUrl = process.env.EMBEDDING_API_URL;
    const apiKey = process.env.EMBEDDING_API_KEY;
    const model = process.env.EMBEDDING_MODEL;
    if (apiUrl && apiKey) {
        try {
            const isOpenAI = /openai|api\.openai\.com/.test(apiUrl) || (process.env.EMBEDDING_PROVIDER === 'openai');
            const body = isOpenAI ? { model: model || 'text-embedding-3-small', input: text } : { input: text, model };
            const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`Embedding provider returned ${res.status} ${await res.text()}`);
            const j = await res.json();
            if (Array.isArray(j.data) && Array.isArray(j.data[0]?.embedding)) return j.data[0].embedding;
            if (Array.isArray(j.embedding)) return j.embedding;
        } catch (e) {
            console.debug('[backfill] embedding provider failed, falling back', String(e));
        }
    }
    // deterministic fallback
    let seed = crypto.createHash('sha256').update(text || 'empty').digest();
    const dim = Number(process.env.PINECONE_INDEX_DIM || process.env.EMBEDDING_DIM || 1024);
    const out = new Array(dim).fill(0);
    let counter = 0;
    for (let i = 0; i < out.length; i++) {
        if (i % seed.length === 0 && i !== 0) seed = crypto.createHash('sha256').update(seed).update(String(counter++)).digest();
        const b = seed[i % seed.length];
        out[i] = (b / 255) * 2 - 1;
    }
    return out;
}

async function upsertPinecone(vectors) {
    const apiKey = process.env.PINECONE_API_KEY;
    const env = process.env.PINECONE_ENV;
    const index = process.env.PINECONE_INDEX_NAME;
    const base = process.env.PINECONE_BASE_URL || (index && env ? `https://${index}-${env}.svc.pinecone.io` : '');
    if (!apiKey || !base) throw new Error('Pinecone not configured');
    const res = await fetch(`${base}/vectors/upsert`, { method: 'POST', headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ vectors }) });
    if (!res.ok) throw new Error(`Pinecone upsert failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function processCollection(db, collectionName, type) {
    const snap = await db.collection(collectionName).get();
    console.log(`${collectionName} docs=${snap.size}`);
    const BATCH = Number(process.env.EMBED_BACKFILL_BATCH || 100);
    const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    for (let i = 0; i < docs.length; i += BATCH) {
        const chunk = docs.slice(i, i + BATCH);
        const vectors = [];
        for (const it of chunk) {
            stats.totalDocs++;
            try {
                const text = type === 'user' ? canonicalizeUserProfile(it.data) : canonicalizeJob(it.data);
                const vec = await computeEmbeddingNode(text);
                stats.embeddingsComputed++;
                vectors.push({ id: `${type}-${it.id}`, values: vec, metadata: { type, key: it.id } });
                stats.vectorsPrepared++;
                // also write an embeddings document for prototyping / fallback
                try {
                    if (!DRY_RUN) {
                        await db.collection('embeddings').doc(`${type}-${it.id}`).set({
                            type: type,
                            key: it.id,
                            textSnapshot: text,
                            model: process.env.EMBEDDING_MODEL || null,
                            vector: vec,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        stats.embeddingsWriteSuccess++;
                    } else {
                        // Dry-run: don't write, but log intent
                        console.log(`[dry-run] would write embeddings/${type}-${it.id}`);
                    }
                } catch (writeErr) {
                    console.debug('Failed to write embeddings doc for', it.id, String(writeErr));
                    stats.embeddingsWriteFailed++;
                }
            } catch (e) {
                console.error('embed error', it.id, String(e));
            }
        }
        if (vectors.length) {
            try {
                if (!DRY_RUN) {
                    await upsertPinecone(vectors);
                    stats.vectorsUpserted += vectors.length;
                    console.log(`Upserted ${vectors.length} vectors for ${collectionName} (batch ${i})`);
                } else {
                    console.log(`[dry-run] would upsert ${vectors.length} vectors for ${collectionName} (batch ${i})`);
                }
            } catch (e) {
                console.error('upsert failed', String(e));
                stats.upsertFailed++;
            }
        }
    }
}

async function main() {
    initializeFirebaseAdmin();
    const db = admin.firestore();
    await processCollection(db, 'executive-profiles', 'user');
    await processCollection(db, 'startup-needs', 'job');
    console.log('Backfill complete');
    console.log('Summary:');
    console.log(`  total docs scanned: ${stats.totalDocs}`);
    console.log(`  embeddings computed: ${stats.embeddingsComputed}`);
    console.log(`  embeddings written: ${stats.embeddingsWriteSuccess} ${DRY_RUN ? '(dry-run skipped actual writes)' : ''}`);
    console.log(`  embeddings write failures: ${stats.embeddingsWriteFailed}`);
    console.log(`  vectors prepared: ${stats.vectorsPrepared}`);
    console.log(`  vectors upserted: ${stats.vectorsUpserted} ${DRY_RUN ? '(dry-run skipped upserts)' : ''}`);
    console.log(`  upsert failures: ${stats.upsertFailed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
