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

async function main() {
    initFirebase();
    // require the built worker code via ts-node transpilation path or import compiled JS
    // prefer importing from src so Node can resolve using ts-node if available; otherwise, require the compiled output.
    let worker;
    try {
        worker = require(path.join(process.cwd(), 'src', 'workers', 'recompute-matching')).runRecomputeWorkerOnce;
    } catch (e) {
        try {
            worker = require(path.join(process.cwd(), 'dist', 'src', 'workers', 'recompute-matching')).runRecomputeWorkerOnce;
        } catch (err) {
            console.error('Failed to load worker module from src/ or dist/. Ensure you run this from project root and have built the project.');
            console.error(err);
            process.exit(3);
        }
    }

    const owner = process.argv[2] || `script:${process.env.USER || 'local'}`;
    console.log('[run-recompute-worker] starting worker as', owner);
    try {
        const res = await worker(owner);
        console.log('[run-recompute-worker] result=', res);
    } catch (err) {
        console.error('[run-recompute-worker] error=', err);
        process.exitCode = 1;
    } finally {
        process.exit();
    }
}

main();
