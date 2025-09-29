import admin from './firebase';
import crypto from 'crypto';
import { upsert as vectorUpsert } from './vector-db';

// Canonicalizers: produce a short, stable text snapshot used for embedding
export function canonicalizeUserProfile(user: any): string {
    if (!user) return '';
    const parts: string[] = [];
    if (user.name) parts.push(`Name: ${user.name}`);
    if (user.expertise) parts.push(`Expertise: ${Array.isArray(user.expertise) ? user.expertise.join(', ') : user.expertise}`);
    if (user.keyAccomplishments) parts.push(`Accomplishments: ${Array.isArray(user.keyAccomplishments) ? user.keyAccomplishments.map((a: any) => a.value || a).join('; ') : user.keyAccomplishments}`);
    if (user.githubInsights) parts.push(`GitHub: ${user.githubInsights}`);
    if (user.resumeText) parts.push(`Resume: ${user.resumeText.slice(0, 1000)}`);
    return parts.join('\n');
}

export function canonicalizeJob(job: any): string {
    if (!job) return '';
    const parts: string[] = [];
    if (job.roleTitle) parts.push(`Title: ${job.roleTitle}`);
    if (job.roleSummary) parts.push(`Summary: ${job.roleSummary}`);
    if (job.keyDeliverables) parts.push(`Deliverables: ${job.keyDeliverables}`);
    if (job.requiredExpertise) parts.push(`Required: ${Array.isArray(job.requiredExpertise) ? job.requiredExpertise.join(', ') : job.requiredExpertise}`);
    if (job.companyName) parts.push(`Company: ${job.companyName}`);
    return parts.join('\n');
}

// Deterministic pseudo-random vector generator based on sha256 seed.
function deterministicVector(text: string, dim: number) {
    const out: number[] = new Array(dim);
    let seed = crypto.createHash('sha256').update(text).digest();
    let counter = 0;
    for (let i = 0; i < dim; i++) {
        if (i % seed.length === 0 && i !== 0) {
            // re-seed with counter
            seed = crypto.createHash('sha256').update(seed).update(String(counter++)).digest();
        }
        // byte -> float in [-1,1]
        const b = seed[i % seed.length];
        out[i] = (b / 255) * 2 - 1;
    }
    return out;
}

export async function computeEmbedding(text: string): Promise<number[]> {
    // Pluggable: if EMBEDDING_API_URL + key present, call it. Otherwise return deterministic fallback.
    const apiUrl = process.env.EMBEDDING_API_URL;
    const apiKey = process.env.EMBEDDING_API_KEY;
    const model = process.env.EMBEDDING_MODEL;
    const dim = Number(process.env.PINECONE_INDEX_DIM || process.env.EMBEDDING_DIM || 1024);

    if (apiUrl && apiKey) {
        // timeout controller (5s default)
        const timeoutMs = Number(process.env.EMBEDDING_API_TIMEOUT_MS || 5000);
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            // Heuristics: if provider looks like OpenAI, include model param as { model, input }
            const isOpenAI = /openai|api\.openai\.com/.test(apiUrl) || (process.env.EMBEDDING_PROVIDER === 'openai');
            const bodyPayload: any = isOpenAI ? { model: model || 'text-embedding-3-small', input: text } : { input: text };
            if (!isOpenAI && model) bodyPayload.model = model;

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify(bodyPayload),
                signal: controller.signal,
            });
            clearTimeout(id);
            if (!res.ok) throw new Error(`Embedding provider returned ${res.status} ${await res.text()}`);
            const body = await res.json();

            // Common shapes: { embedding: [...] } or { data:[{embedding:[...]}] } (OpenAI)
            let emb: number[] | undefined;
            if (Array.isArray(body.embedding)) emb = body.embedding;
            else if (Array.isArray(body.data) && Array.isArray(body.data[0]?.embedding)) emb = body.data[0].embedding;
            else if (Array.isArray(body.data) && Array.isArray(body.data[0]?.vector)) emb = body.data[0].vector; // some providers

            if (emb && emb.length > 0) {
                // If embedding length mismatches expected dim, try to adapt (truncate or pad with zeros)
                if (emb.length === dim) return emb;
                const adapted = new Array(dim).fill(0).map((_, i) => emb[i] ?? 0);
                console.debug(`[embeddings] adapted embedding length ${emb.length} -> ${dim}`);
                return adapted;
            }

            console.debug('[embeddings] unexpected provider response, falling back to deterministic');
        } catch (err) {
            // handle AbortError separately
            if ((err as any)?.name === 'AbortError') console.debug('[embeddings] provider call timed out');
            else console.debug('[embeddings] provider call failed, falling back to deterministic', String(err));
        } finally {
            try { clearTimeout(id); } catch (e) { }
        }
    }

    // Deterministic fallback ensures stable embeddings for development
    return deterministicVector(text || 'empty', dim);
}

export async function writeEmbedding(docId: string, type: 'user' | 'job', textSnapshot: string, vector: number[]) {
    const db = admin.firestore();
    const id = `${type}-${docId}`;
    const docRef = db.collection('embeddings').doc(id);
    await docRef.set({
        key: docId,
        type,
        textSnapshot,
        model: process.env.EMBEDDING_MODEL || null,
        vector: vector.slice(0, 2048),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Upsert to vector DB if enabled
    if (process.env.USE_VECTOR_DB === 'true' || process.env.USE_VECTOR_DB === '1') {
        try {
            await vectorUpsert([{ id: id, values: vector, metadata: { type, key: docId } }]);
        } catch (err) {
            console.debug('[embeddings] vector upsert failed', String(err));
        }
    }
}

export default { canonicalizeUserProfile, canonicalizeJob, computeEmbedding, writeEmbedding };
