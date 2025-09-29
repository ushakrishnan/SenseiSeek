import admin from '@/lib/firebase';
import { claimStartupForRecompute, releaseStartupClaim, setStartupMatches, setStartupVectorScores } from '@/lib/matching-cache';
import { canonicalizeJob, computeEmbedding } from '@/lib/embeddings';
import { query as vectorQuery } from '@/lib/vector-db';
import { parseStartupNeed } from '@/lib/validators';
import { emitMetric } from '@/lib/metrics';
// Toggle verbose debug logging via env var VERBOSE_LOGS=true
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';
// Match flow is loaded dynamically to avoid pulling heavy GenKit deps into
// server bundles that don't need it at module-evaluation time.
import { preFilterExecutives } from '@/lib/pre-filter';

export async function runRecomputeWorkerOnce(owner = 'worker:local') {
    const db = admin.firestore();
    const batchSize = Number(process.env.MATCH_WORKER_BATCH_SIZE || 5);
    const claimTtl = Number(process.env.RECOMPUTE_CLAIM_TTL_MS || 5 * 60 * 1000);

    const q = db.collection('matching-cache').where('dirty', '==', true).limit(batchSize);
    const snap = await q.get();
    if (snap.empty) return { processed: 0 };
    try { emitMetric('matching.queue_backlog', snap.size); } catch (e) { }

    let processed = 0;
    for (const doc of snap.docs) {
        const docId = doc.id; // expected like 'startup-<id>' or 'executive-<id>'
        const parts = docId.split(/-(.+)/);
        if (parts.length < 2) continue;
        const kindPrefix = parts[0];
        const key = parts[1];
        // Currently we only support startup recompute
        if (kindPrefix !== 'startup') continue;

        const startupId = key;
        const ownerId = `${owner}`;
        const claimed = await claimStartupForRecompute(startupId, ownerId, claimTtl);
        if (!claimed) continue;

        try {
            try { emitMetric('matching.recompute_started', 1); } catch (e) { }
            const startupDoc = await db.collection('startup-needs').doc(startupId).get();
            if (!startupDoc.exists) {
                // clear dirty and release
                await setStartupMatches(startupId, 'empty', [], []);
                continue;
            }
            const startupRaw = startupDoc.data() || {};
            const startupParsed = parseStartupNeed(startupRaw);
            const startup = (startupParsed ?? (startupRaw as any));

            // Try vector-first retrieval
            const topN = Number(process.env.MATCH_VECTOR_TOP_N || 50);
            const topK = Number(process.env.MATCH_LLM_TOP_K || 10);
            let candidateExecs: any[] = [];

            try {
                const canonical = canonicalizeJob(startup);
                const vector = await computeEmbedding(canonical);
                const resp = await vectorQuery(vector, topN, true).catch(() => null);
                if (resp && Array.isArray((resp as any).matches) && (resp as any).matches.length) {
                    const execIds = (resp as any).matches.map((m: any) => (m.id || '').replace(/^user-|^executive-|^exec-|^job-/i, '')).filter(Boolean);
                    if (execIds.length) {
                        // batch fetch
                        const chunks: string[][] = [];
                        for (let i = 0; i < execIds.length; i += 50) chunks.push(execIds.slice(i, i + 50));
                        for (const chunk of chunks) {
                            const snaps = await Promise.all(chunk.map(id => db.collection('executive-profiles').doc(id).get()));
                            for (const s of snaps) if (s.exists) candidateExecs.push({ id: s.id, ...(s.data() || {}) });
                        }
                    }
                    // build per-exec vector score map for persistence
                    try {
                        const scoreMap: Record<string, number> = {};
                        for (const m of (resp as any).matches) {
                            const id = String(m.id || '').replace(/^user-|^executive-|^exec-|^job-/i, '');
                            const raw = typeof m.score === 'number' ? m.score : (typeof m.distance === 'number' ? 1 / (1 + m.distance) : 0);
                            if (id) scoreMap[id] = Math.max(scoreMap[id] || 0, raw);
                        }
                        if (Object.keys(scoreMap).length) {
                            try { await setStartupVectorScores(startupId, scoreMap); } catch (e) { if (VERBOSE_LOGS) console.debug('[worker] failed to persist vector score map', String(e)); }
                        }
                    } catch (e) {
                        if (VERBOSE_LOGS) console.debug('[worker] failed to build/persist vector score map', String(e));
                    }
                }
            } catch (err) {
                console.debug('[worker] vector retrieval failed, falling back', String(err));
            }

            // Fallback: fetch all execs and pre-filter if vector path yielded nothing
            if (!candidateExecs.length) {
                const execSnap = await db.collection('executive-profiles').get();
                const allExecs = execSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
                candidateExecs = preFilterExecutives(allExecs as any, startup, Number(process.env.MATCH_PRE_FILTER_MAX || 200)).map((e: any) => ({ ...e }));
            }

            // Rerank topK via LLM
            const candidates = candidateExecs.slice(0, topK);
            const matchResults: any[] = [];
            for (const exec of candidates) {
                const accomplishments = (exec.keyAccomplishments || []).map((a: any) => a.value).join('; ');
                const executiveProfileString = `Name: ${exec.name}. Expertise: ${exec.expertise}. Industry Experience: ${exec.industryExperience?.join(', ') || ''}. Availability: ${exec.availability}. Desired Compensation: ${exec.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${exec.githubInsights || ''}`;
                const startupNeedsString = `Project Scope: ${startup.roleSummary}. Budget: ${startup.budget}. Required Expertise: ${Array.isArray(startup.requiredExpertise) ? startup.requiredExpertise.join(', ') : startup.requiredExpertise}. Company Stage: ${startup.companyStage}. Key Challenges & Dealbreakers: ${startup.keyChallenges || 'Not specified'}.`;
                const { matchExecutiveToStartup } = await import('@/ai/flows/match-executive-to-startup');
                try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
                const result = await matchExecutiveToStartup({ executiveProfile: executiveProfileString, startupNeeds: startupNeedsString });
                matchResults.push({ ...exec, matchScore: result.matchScore, rationale: result.rationale, recommendation: result.recommendation });
            }

            const tags = candidateExecs.map(c => `exec:${c.id}`);
            await setStartupMatches(startupId, String(Date.now()), matchResults, tags);
            // Also persist a durable vector-score map based on matchResults when available
            try {
                const mapObj: Record<string, number> = {};
                for (const r of matchResults) {
                    if (r && r.id && typeof r.matchScore === 'number') mapObj[r.id] = Math.max(mapObj[r.id] || 0, r.matchScore);
                }
                if (Object.keys(mapObj).length) await setStartupVectorScores(startupId, mapObj);
            } catch (e) {
                if (VERBOSE_LOGS) console.debug('[worker] failed to persist vector scores from matchResults', String(e));
            }
            processed++;
            try { emitMetric('matching.recompute_succeeded', 1); } catch (e) { }
        } catch (err) {
            console.error('[worker] recompute error for', startupId, String(err));
            try { emitMetric('matching.recompute_failed', 1); } catch (e) { }
        } finally {
            await releaseStartupClaim(startupId, ownerId).catch(() => null);
        }
    }

    return { processed };
}

export default { runRecomputeWorkerOnce };
