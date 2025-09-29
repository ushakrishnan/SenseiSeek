require('dotenv').config();
(async function () {
    try {
        const apiKey = process.env.PINECONE_API_KEY;
        const env = process.env.PINECONE_ENV;
        const index = process.env.PINECONE_INDEX_NAME;
        if (!apiKey || !env || !index) {
            console.error('Missing PINECONE env vars. Please fill .env');
            process.exit(2);
        }
        const base = process.env.PINECONE_BASE_URL || `https://${index}-${env}.svc.pinecone.io`;
        console.log('Using Pinecone base:', base);

        // Use a 1024-dimension vector to match the index dimension (change if your index uses a different dim)
        const DIM = Number(process.env.PINECONE_INDEX_DIM || 1024);
        const values = Array.from({ length: DIM }).map(() => Math.random());
        const sample = { id: `test-js-${Date.now()}`, values, metadata: { test: true } };

        const up = await fetch(`${base}/vectors/upsert`, {
            method: 'POST',
            headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ vectors: [sample] }),
        });
        console.log('Upsert status', up.status);
        const upText = await up.text();
        console.log('Upsert body', upText);

        // Try fetching by id to confirm the vector exists
        const f = await fetch(`${base}/vectors/fetch`, {
            method: 'POST',
            headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [sample.id] }),
        });
        console.log('Fetch status', f.status);
        const fText = await f.text();
        console.log('Fetch body', fText);

        // Also run a query (topK) to ensure the index responds (may return empty matches depending on index state)
        const q = await fetch(`${base}/query`, {
            method: 'POST',
            headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ vector: sample.values, topK: 3, includeMetadata: true }),
        });
        console.log('Query status', q.status);
        const qText = await q.text();
        console.log('Query body', qText);
    } catch (e) {
        console.error('Error', e);
        process.exit(1);
    }
})();
