import fetch from 'node-fetch';

const provider = process.env.VECTOR_DB_PROVIDER || 'pinecone';

if (provider !== 'pinecone') {
    // For now, we only implement Pinecone adapter. Other adapters can be added later.
}

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_ENV = process.env.PINECONE_ENV || '';
const PINECONE_INDEX = process.env.PINECONE_INDEX_NAME || '';

function baseUrl() {
    // Pinecone REST base: https://controller.{env}.pinecone.io for management, and index endpoint: https://{index}-{project}.{env}.pinecone.io
    // We'll construct a simple index query base using env and index name. If a full base URL is needed, set PINECONE_BASE_URL instead.
    const explicit = process.env.PINECONE_BASE_URL;
    if (explicit) return explicit;
    if (!PINECONE_ENV || !PINECONE_INDEX) return '';
    // The project prefix is not always required for query endpoints in newer Pinecone setups; this will work for common setups.
    return `https://${PINECONE_INDEX}-${PINECONE_ENV}.svc.pinecone.io`;
}

async function upsert(vectors: Array<{ id: string; values: number[]; metadata?: Record<string, any> }>) {
    const url = `${baseUrl()}/vectors/upsert`;
    if (!url) throw new Error('Pinecone base URL not configured (PINECONE_ENV / PINECONE_INDEX_NAME)');
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Api-Key': PINECONE_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectors }),
    });
    if (!res.ok) throw new Error(`Pinecone upsert failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function query(vector: number[], topK = 5, includeMetadata = true) {
    const url = `${baseUrl()}/query`;
    if (!url) throw new Error('Pinecone base URL not configured (PINECONE_ENV / PINECONE_INDEX_NAME)');
    const body: any = { vector, topK, includeMetadata };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Api-Key': PINECONE_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Pinecone query failed: ${res.status} ${await res.text()}`);
    return res.json();
}

async function fetchById(ids: string[] | string) {
    const url = `${baseUrl()}/vectors/fetch`;
    if (!url) throw new Error('Pinecone base URL not configured (PINECONE_ENV / PINECONE_INDEX_NAME)');
    const idList = Array.isArray(ids) ? ids : [ids];
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Api-Key': PINECONE_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idList }),
    });
    if (!res.ok) throw new Error(`Pinecone fetch failed: ${res.status} ${await res.text()}`);
    return res.json();
}

export { upsert, query };
export { fetchById };

export default { upsert, query };
