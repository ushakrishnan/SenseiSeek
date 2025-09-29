import admin from 'firebase-admin';
import { matchExecutiveToStartup } from '@/ai/flows/match-executive-to-startup';

// Simple worker that polls Firestore collection 'ai-match-queue' for pending jobs
// Each job document: { executiveId, needId, status: 'pending'|'processing'|'done'|'failed', attempts: number }

const POLL_DELAY_MS = Number(process.env.AI_MATCH_WORKER_DELAY_MS || 1000);
const MAX_ATTEMPTS = 5;

async function processJob(jobDoc: FirebaseFirestore.QueryDocumentSnapshot) {
    const job = jobDoc.data() as any;
    const jobRef = jobDoc.ref;
    try {
        await jobRef.update({ status: 'processing', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        const execRef = admin.firestore().collection('executive-profiles').doc(job.executiveId);
        const execDoc = await execRef.get();
        if (!execDoc.exists) throw new Error('Executive not found');
        const exec = execDoc.data() as any;

        const needRef = admin.firestore().collection('startup-needs').doc(job.needId);
        const needDoc = await needRef.get();
        if (!needDoc.exists) throw new Error('Need not found');
        const need = needDoc.data() as any;

        const accomplishments = (exec.keyAccomplishments || []).map((a: any) => a.value).join('; ') || '';
        const executiveProfileString = `Name: ${exec.name}. Expertise: ${exec.expertise}. Industry Experience: ${exec.industryExperience?.join(', ') || ''}. Availability: ${exec.availability}. Desired Compensation: ${exec.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${exec.githubInsights || ''}`;
        const startupNeedsString = `Project Scope: ${need.roleSummary}. Budget: ${need.budget}. Required Expertise: ${Array.isArray(need.requiredExpertise) ? need.requiredExpertise.join(', ') : need.requiredExpertise}. Company Stage: ${need.companyStage}.`;

        const result = await matchExecutiveToStartup({ executiveProfile: executiveProfileString, startupNeeds: startupNeedsString });

        // Persist ai-match
        const cacheRef = execRef.collection('ai-matches').doc(job.needId);
        await cacheRef.set({ matchScore: result.matchScore, rationale: result.rationale, recommendation: result.recommendation, createdAt: admin.firestore.FieldValue.serverTimestamp() });

        await jobRef.update({ status: 'done', result: { matchScore: result.matchScore }, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        const attempts = (job.attempts || 0) + 1;
        const update: any = { attempts, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (attempts >= MAX_ATTEMPTS) {
            update.status = 'failed';
            update.error = e?.message || String(err);
        } else {
            update.status = 'pending';
            update.nextAttemptAt = admin.firestore.Timestamp.fromMillis(Date.now() + (attempts * POLL_DELAY_MS));
        }
        await jobRef.update(update);
        console.error('AI match job failed', e || err);
    }
}

export async function runWorkerOnce() {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const q = db.collection('ai-match-queue').where('status', '==', 'pending').orderBy('createdAt').limit(10);
    const snapshot = await q.get();
    for (const doc of snapshot.docs) {
        const data = doc.data() as any;
        if (data.nextAttemptAt && data.nextAttemptAt.toMillis && data.nextAttemptAt.toMillis() > Date.now()) continue;
        await processJob(doc);
        // rate-limit
        await new Promise(r => setTimeout(r, POLL_DELAY_MS));
    }
}

// If this worker file is executed directly (e.g., node workers/generate-ai-matches.js), run in a loop
if (require.main === module) {
    (async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                await runWorkerOnce();
            } catch (e: unknown) {
                const ee = e as { message?: string } | undefined;
                console.error('AI match worker loop error', ee || e);
            }
            await new Promise(r => setTimeout(r, POLL_DELAY_MS));
        }
    })();
}

export default runWorkerOnce;
