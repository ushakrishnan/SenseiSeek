require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

function initFirebase() {
    if (admin.apps.length) return;
    const base64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64;
    if (!base64) {
        console.error('FIREBASE_ADMIN_SDK_CONFIG_BASE64 not set');
        process.exit(2);
    }
    const serviceAccount = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function runJob(jobDoc) {
    const job = jobDoc.data();
    const jobId = jobDoc.id;
    let worker;
    try {
        worker = require(path.join(process.cwd(), 'src', 'workers', 'recompute-matching')).runRecomputeWorkerOnce;
    } catch (e) {
        try {
            worker = require(path.join(process.cwd(), 'dist', 'src', 'workers', 'recompute-matching')).runRecomputeWorkerOnce;
        } catch (err) {
            throw new Error('Failed to load worker module');
        }
    }
    // Attempt to claim the job transactionally (lease).
    const db = admin.firestore();
    const leaseTtlMs = Number(process.env.MATCH_WORKER_LEASE_MS || 5 * 60 * 1000);
    const maxAttempts = Number(process.env.MATCH_WORKER_MAX_ATTEMPTS || 3);

    const claim = await db.runTransaction(async (tx) => {
        const snap = await tx.get(jobDoc.ref);
        if (!snap.exists) return null;
        const data = snap.data() || {};
        const nowMs = Date.now();
        const leaseUntilTs = data.leaseUntil ? data.leaseUntil.toMillis() : 0;
        const attempts = Number(data.attempts || 0);

        // Only claim if pending OR running but lease expired
        if (data.status === 'pending' || (data.status === 'running' && leaseUntilTs < nowMs)) {
            if (attempts >= maxAttempts) {
                // mark as failed permanently
                tx.update(jobDoc.ref, { status: 'failed', finishedAt: admin.firestore.FieldValue.serverTimestamp(), error: 'max attempts exceeded' });
                return null;
            }
            const owner = `queue-consumer:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;
            const until = admin.firestore.Timestamp.fromDate(new Date(Date.now() + leaseTtlMs));
            tx.update(jobDoc.ref, {
                status: 'running',
                leaseOwner: owner,
                leaseUntil: until,
                attempts: attempts + 1,
                startedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { owner };
        }
        return null;
    });

    if (!claim) {
        // couldn't claim (either already running by someone else or permanently failed)
        return null;
    }

    const owner = claim.owner;

    // If job includes a specific startup id in params, mark the matching-cache doc dirty so the worker picks it up.
    try {
        const params = job.params || {};
        if (params.id) {
            const cacheRef = db.collection('matching-cache').doc(`startup-${params.id}`);
            await cacheRef.set({ dirty: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }

        // Run the worker (owner passed so claims inside worker can note owner)
        const result = await worker(owner);
        await jobDoc.ref.update({ status: 'done', finishedAt: admin.firestore.FieldValue.serverTimestamp(), result, leaseOwner: admin.firestore.FieldValue.delete(), leaseUntil: admin.firestore.FieldValue.delete() });
        console.log(`[queue] job ${jobId} completed:`, result);
        return result;
    } catch (err) {
        console.error(`[queue] job ${jobId} failed:`, String(err));
        // update job doc with failure, but allow retry until maxAttempts
        try {
            const data = { status: 'pending', lastError: String(err), error: String(err), leaseOwner: admin.firestore.FieldValue.delete(), leaseUntil: admin.firestore.FieldValue.delete() };
            // If attempts exceeded, mark failed
            const snap = await jobDoc.ref.get();
            const attempts = Number((snap.data() || {}).attempts || 0);
            if (attempts >= maxAttempts) {
                data.status = 'failed';
                data.finishedAt = admin.firestore.FieldValue.serverTimestamp();
            }
            await jobDoc.ref.update(data);
        } catch (e) {
            console.error('[queue] failed to update job doc after error', e);
        }
        return null;
    }
}

async function main() {
    initFirebase();
    const db = admin.firestore();
    const pollIntervalMs = Number(process.env.MATCH_QUEUE_POLL_MS || 5000);
    console.log('[queue consumer] starting, poll interval', pollIntervalMs);

    while (true) {
        try {
            const now = new Date();
            // Query only by status to avoid requiring a composite index; filter runAt client-side.
            const q = db.collection('matching-worker-queue').where('status', '==', 'pending').limit(10);
            const snap = await q.get();
            if (!snap.empty) {
                const docsToRun = [];
                for (const doc of snap.docs) {
                    const data = doc.data() || {};
                    const runAt = data.runAt;
                    if (!runAt || (runAt && runAt.toMillis() <= now.getTime())) docsToRun.push(doc);
                }
                for (const doc of docsToRun) {
                    try {
                        await runJob(doc);
                    } catch (e) {
                        console.error('[queue consumer] job run error', e);
                    }
                }
            }
        } catch (err) {
            console.error('[queue consumer] poll error', String(err));
        }
        await new Promise(r => setTimeout(r, pollIntervalMs));
    }
}

main();
