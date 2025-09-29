/*
    NOTE: This server module interacts heavily with Firestore DocumentData which
    is loosely typed at runtime. Runtime validation is performed via zod parsers
    in `src/lib/validators.ts`. To avoid noisy, repetitive inline disables across
    many mapping points we allow explicit `any` in this server file only so the
    runtime guards can operate. Keep this narrow and prefer precise parsing for
    new code.
*/
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { config } from 'dotenv';
config();

import { z } from 'zod';
import admin from './firebase';
import { isExecutiveProfile, isStartupProfile, isStartupNeed, toISODate, getTimestamp, getDate, parseExecutiveProfile, parseStartupProfile, parseStartupNeed } from './validators';
// NOTE: The AI flows (GenKit) are intentionally loaded lazily below. Importing
// them at module-top would cause the bundler to attempt to resolve Node-only
// dependencies (like handlebars/require.extensions) during route evaluation
// which breaks server-side route loading in some Next.js runtimes. To avoid
// that, we define small proxy functions that dynamically import the actual
// flow modules at call time.
import { getOrComputeStartupMatches, markStartupDirty, getStartupVectorScores, setStartupVectorScores, markStartupVectorScoresDirty, markCachesDirtyByTag } from './matching-cache';
import { incrementalUpdateForExecutive } from './matching-incremental';
import { preFilterExecutives } from './pre-filter';
import { canonicalizeUserProfile, canonicalizeJob, computeEmbedding, writeEmbedding } from './embeddings';
// Toggle verbose debug logging via env var VERBOSE_LOGS=true
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';
// Lazy wrappers for AI flows -------------------------------------------------
async function executiveProfileFromResume(input: any) {
    const m = await import('@/ai/flows/executive-profile-from-resume');
    return m.executiveProfileFromResume(input);
}

async function rewriteJobDescriptionFieldFlow(input: any) {
    const m = await import('@/ai/flows/rewrite-job-description-field');
    return m.rewriteJobDescriptionField(input);
}

async function rewriteExecutiveProfileFieldFlow(input: any) {
    const m = await import('@/ai/flows/rewrite-executive-profile-field');
    return m.rewriteExecutiveProfileField(input);
}

async function rewriteStartupProfileFieldFlow(input: any) {
    const m = await import('@/ai/flows/rewrite-startup-profile-field');
    return m.rewriteStartupProfileField(input);
}

async function rewriteMessageFlow(input: any) {
    const m = await import('@/ai/flows/rewrite-message-flow');
    return m.rewriteMessage(input);
}

async function matchExecutiveToStartup(input: any) {
    const m = await import('@/ai/flows/match-executive-to-startup');
    return m.matchExecutiveToStartup(input);
}

async function createIntroductionMessage(input: any) {
    const m = await import('@/ai/flows/create-message-flow');
    return m.createIntroductionMessage(input);
}

async function createFollowUpMessage(input: any) {
    const m = await import('@/ai/flows/create-follow-up-message-flow');
    return m.createFollowUpMessage(input);
}

async function createStatusChangeMessage(input: any) {
    const m = await import('@/ai/flows/create-status-change-message-flow');
    return m.createStatusChangeMessage(input);
}
import { signupSchema, startupNeedsSchema, executiveProfileSchema, startupProfileSchema, contactFormSchema } from '@/lib/schemas';
import type { ExecutiveProfile, StartupProfile, MatchResult, Application, StartupNeeds, ApplicationWithExecutive, StartupDashboardStats, ExecutiveDashboardStats, ApplicationStatus, AdminDashboardStats, UserListItem, ApplicationWithDetails, ShortlistedItem, SavedItem, ConversationWithRecipient, Message } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { deriveRawScore, normalizeScores, clampScore } from './matching-utils';
import { emitMetric } from './metrics';
import { auth } from 'firebase-admin';
import { cookies } from 'next/headers';
import { analytics } from './firebase-client';
import { logEvent } from 'firebase/analytics';
// Re-export GitHub insights helper from a dedicated module so it can be tested independently
import { fetchGithubInsights as __fetchGithubInsightsHelper } from './github-insights';
import type { GithubInsightsState } from './github-insights';
export type { GithubInsightsState } from './github-insights';

// Simple in-memory cache for vector-derived exec scores to avoid repeated
// expensive vector queries on hot paths. This is intentionally ephemeral and
// suited for single-process dev servers / short-lived deployments.
const EXEC_VECTOR_SCORES_CACHE: { value: Map<string, number>, expiresAt: number } = { value: new Map(), expiresAt: 0 };
const EXEC_VECTOR_SCORES_TTL_MS = Number(process.env.MATCH_VECTOR_SCORES_TTL_MS || 1000 * 60 * 5); // default 5 minutes

// Server action wrapper: keep the server action declared in this server module
export async function fetchGithubInsights(prevState: GithubInsightsState, input: { githubHandle?: string }): Promise<GithubInsightsState> {
    return __fetchGithubInsightsHelper(prevState, input);
}


const parseResumeInputSchema = z.object({
    resume: z.string().min(50, 'Resume content is too short.'),
});

type ParseResumeState = {
    formState: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    fields?: Partial<ExecutiveProfile>;
};

const handleGenkitError = (error: unknown) => {
    console.error('An AI error occurred:', error);
    let message = 'An unknown error occurred while contacting the AI service.';
    if (error instanceof Error) {
        if (error.message.includes('503') || error.message.includes('model is overloaded')) {
            message = 'The AI service is currently busy. Please try again in a moment.';
        } else {
            message = error.message;
        }
    }
    return message;
};

export async function parseResume(
    prevState: ParseResumeState,
    formData: FormData
): Promise<ParseResumeState> {

    const validatedFields = parseResumeInputSchema.safeParse({
        resume: formData.get('resume'),
    });

    if (!validatedFields.success) {
        return {
            formState: 'error',
            message:
                'Invalid resume content. Please paste more text or provide a valid URL.',
        };
    }

    try {
        try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
        const profileData = await executiveProfileFromResume({
            resume: validatedFields.data.resume,
        });

        const profile = {
            ...profileData,
            keyAccomplishments: profileData.keyAccomplishments.map(value => ({ value })),
            resumeText: validatedFields.data.resume,
        }


        return {
            formState: 'success',
            message:
                'Resume parsed successfully. Please review the extracted information.',
            fields: profile,
        };
    } catch (error) {
        return { formState: 'error', message: handleGenkitError(error) };
    }
}

type FindMatchesState = {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    matches: MatchResult[];
};

export async function findMatchesForStartup(
    startupId: string
): Promise<FindMatchesState> {

    // metric: total requests
    try { emitMetric('matching.requests', 1); } catch (e) { /* noop */ }

    const db = admin.firestore();

    const startupDoc = await db.collection('startup-needs').doc(startupId).get();
    if (!startupDoc.exists) {
        return { status: 'error', message: 'Startup need not found.', matches: [] };
    }
    const startupRaw = startupDoc.data() || {};
    const startupParsed = parseStartupNeed(startupRaw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const startup = (startupParsed ?? (startupRaw as any)) as StartupNeeds;

    // Attempt vector-first candidate retrieval when enabled; otherwise fall back to pre-filtering
    let executives: ExecutiveProfile[] = [];
    const useVector = process.env.USE_VECTOR_DB === 'true' || process.env.USE_VECTOR_DB === '1';
    if (useVector) {
        try {
            const canonical = canonicalizeJob(startup);
            const vec = await computeEmbedding(canonical);
            const topN = Number(process.env.MATCH_VECTOR_TOP_N || 50);
            const vdb = await import('./vector-db');
            const resp = await vdb.query(vec, topN, true).catch(() => null);
            if (VERBOSE_LOGS) {
                try {
                    const respMatches = (resp as any)?.matches || [];
                    const sample = respMatches.slice(0, 5).map((m: any) => ({ id: m.id, score: m.score, distance: m.distance }));
                    console.debug('[findMatchesForStartup] vdb query resp', { matchesLength: respMatches.length, sample });
                } catch (e) {
                    console.debug('[findMatchesForStartup] vdb query resp - (unable to stringify response)');
                }
            }
            const execIds: string[] = [];
            if (resp && Array.isArray((resp as any).matches)) {
                for (const m of (resp as any).matches) {
                    const idStr = String(m.id || '');
                    const cleaned = idStr.replace(/^user-|^executive-|^exec-|^job-/i, '');
                    if (cleaned) execIds.push(cleaned);
                }
            }
            if (execIds.length) {
                // Batch fetch executive profiles
                for (let i = 0; i < execIds.length; i += 50) {
                    const chunk = execIds.slice(i, i + 50);
                    const snaps = await Promise.all(chunk.map(id => db.collection('executive-profiles').doc(id).get()));
                    for (const s of snaps) {
                        if (!s.exists) continue;
                        const raw = s.data() || {};
                        const parsed = parseExecutiveProfile(raw);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const data = (parsed ?? (raw as any)) as ExecutiveProfile;
                        executives.push({ ...data, id: s.id } as ExecutiveProfile);
                    }
                }
                // If we have vector matches, prefer vector-derived scores and avoid expensive AI matching
                try {
                    if (resp && Array.isArray((resp as any).matches)) {
                        const matchArr: any[] = [];
                        // Derive raw scores using helper and keep raw vector metadata
                        for (let i = 0; i < (resp as any).matches.length; i++) {
                            const m = (resp as any).matches[i];
                            const rawId = String(m.id || '');
                            const cleaned = rawId.replace(/^user-|^executive-|^exec-|^job-/i, '');
                            const profile = executives.find(e => e.id === cleaned);
                            if (!profile) continue;
                            const raw = clampScore(deriveRawScore(m, i, (resp as any).matches.length));
                            matchArr.push({ ...profile, matchScore: raw, __rawVectorMatch: m });
                        }

                        // Normalize using shared helper
                        const rawScores = matchArr.map(x => Number(x.matchScore) || 0);
                        if (VERBOSE_LOGS) {
                            try {
                                console.debug('[findMatchesForStartup] derived rawScores (first 10)', rawScores.slice(0, 10));
                            } catch (e) {
                                console.debug('[findMatchesForStartup] derived rawScores - (unable to stringify)');
                            }
                        }
                        const normalized = normalizeScores(rawScores);
                        for (let i = 0; i < matchArr.length; i++) matchArr[i].matchScore = normalized[i];

                        // Optionally rerank top-K using the AI flow to improve quality (bounded GenKit calls)
                        const rerankK = Number(process.env.MATCH_RERANK_TOP_K || 0);
                        if (rerankK > 0) {
                            // pick top K by the normalized vector score
                            const top = matchArr.slice().sort((a, b) => b.matchScore - a.matchScore).slice(0, rerankK);
                            try {
                                const aiPromises = top.map(async (executive: any) => {
                                    const accomplishments = executive.keyAccomplishments?.map((a: any) => a.value).join('; ') || '';
                                    const executiveProfileString = `Name: ${executive.name}. Expertise: ${executive.expertise}. Industry Experience: ${executive.industryExperience.join(', ')}. Availability: ${executive.availability}. Desired Compensation: ${executive.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${executive.githubInsights || ''}`;
                                    const startupNeedsString = `
    Project Scope: ${startup.roleSummary}.
    Budget: ${startup.budget}.
    Required Expertise: ${Array.isArray(startup.requiredExpertise) ? startup.requiredExpertise.join(', ') : startup.requiredExpertise}.
    Company Stage: ${startup.companyStage}.
    Key Challenges & Dealbreakers: ${startup.keyChallenges || 'Not specified'}.
  `;
                                    try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
                                    const result = await matchExecutiveToStartup({ executiveProfile: executiveProfileString, startupNeeds: startupNeedsString });
                                    return { id: executive.id, score: result.matchScore, rationale: result.rationale, recommendation: result.recommendation };
                                });
                                const aiResults = await Promise.all(aiPromises);
                                // merge AI scores back into matchArr for the top items
                                for (const r of aiResults) {
                                    const idx = matchArr.findIndex(x => x.id === r.id);
                                    if (idx >= 0) {
                                        matchArr[idx].matchScore = typeof r.score === 'number' ? r.score : matchArr[idx].matchScore;
                                        matchArr[idx].rationale = r.rationale;
                                        matchArr[idx].recommendation = r.recommendation;
                                    }
                                }
                            } catch (err) {
                                if (VERBOSE_LOGS) console.debug('[actions] rerank AI failed, continuing with vector scores', String(err));
                            }
                        }

                        const sorted = matchArr.sort((a, b) => b.matchScore - a.matchScore);
                        // Telemetry / logs
                        const telemetry = {
                            endpoint: 'findMatchesForStartup',
                            startupId,
                            pathUsed: 'vector-only',
                            vectorRequested: (resp as any).matches.length,
                            vectorReturned: matchArr.length,
                            rerankK: Number(process.env.MATCH_RERANK_TOP_K || 0),
                        } as any;
                        // If we performed a rerank above, the top entries will have been replaced by AI
                        if (Number(process.env.MATCH_RERANK_TOP_K || 0) > 0) telemetry.pathUsed = 'vector+rerank';
                        if (VERBOSE_LOGS) console.debug('[findMatchesForStartup] telemetry', telemetry);
                        return { status: 'success', message: 'Vector matches returned', matches: sorted.map(m => ({ ...m, pathUsed: telemetry.pathUsed })) };
                    }
                } catch (err) {
                    if (VERBOSE_LOGS) console.debug('[actions] vector-match mapping failed, falling back to AI', String(err));
                }
            }
        } catch (err) {
            if (VERBOSE_LOGS) console.debug('[actions] vector-first retrieval failed, falling back', String(err));
            executives = [];
        }
    }

    if (!executives.length) {
        const executiveDocs = await db.collection('executive-profiles').get();
        if (executiveDocs.empty) {
            return { status: 'error', message: 'No executives found to match against.', matches: [] };
        }
        const allExecs = executiveDocs.docs.map(doc => {
            const raw = doc.data() || {};
            const parsed = parseExecutiveProfile(raw);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (parsed ?? (raw as any)) as ExecutiveProfile;
            return { ...data, id: doc.id } as ExecutiveProfile;
        });
        const filteredExecutives = preFilterExecutives(allExecs, startup, Number(process.env.MATCH_PRE_FILTER_MAX || 200));
        executives = filteredExecutives as ExecutiveProfile[];
    }

    const inputObject = {
        startup: {
            id: startupId,
            roleSummary: startup.roleSummary,
            budget: startup.budget,
            requiredExpertise: startup.requiredExpertise,
            companyStage: startup.companyStage,
            keyChallenges: startup.keyChallenges,
        },
        executives: executives.map(e => ({ id: e.id, expertise: e.expertise, keyAccomplishments: e.keyAccomplishments, availability: e.availability, desiredCompensation: e.desiredCompensation, githubInsights: e.githubInsights })),
    };

    try {
        const execTags = executives.map((e: ExecutiveProfile) => `exec:${e.id}`);
        const matches = await getOrComputeStartupMatches(startupId, inputObject, async () => {
            const matchPromises = executives.map(async (executive: ExecutiveProfile) => {
                const accomplishments = executive.keyAccomplishments.map((a: any) => a.value).join('; ');
                const executiveProfileString = `Name: ${executive.name}. Expertise: ${executive.expertise}. Industry Experience: ${executive.industryExperience.join(', ')}. Availability: ${executive.availability}. Desired Compensation: ${executive.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${executive.githubInsights || ''}`;

                const startupNeedsString = `
    Project Scope: ${startup.roleSummary}.
    Budget: ${startup.budget}.
    Required Expertise: ${Array.isArray(startup.requiredExpertise) ? startup.requiredExpertise.join(', ') : startup.requiredExpertise}.
    Company Stage: ${startup.companyStage}.
    Key Challenges & Dealbreakers: ${startup.keyChallenges || 'Not specified'}.
  `;

                try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
                try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
                const result = await matchExecutiveToStartup({
                    executiveProfile: executiveProfileString,
                    startupNeeds: startupNeedsString,
                });

                return {
                    ...executive,
                    matchScore: result.matchScore,
                    rationale: result.rationale,
                    recommendation: result.recommendation,
                };
            });

            const results = await Promise.all(matchPromises);
            const sortedResults = results.sort((a, b) => b.matchScore - a.matchScore);
            return sortedResults;
        });

        return {
            status: 'success',
            message: 'Matches found successfully.',
            matches: matches,
        };
    } catch (error) {
        return { status: 'error', message: handleGenkitError(error), matches: [] };
    }
}

export async function findMatchesForExecutive(executiveId: string, limit = 50): Promise<FindMatchesState> {
    try { emitMetric('matching.requests', 1); } catch (e) { /* noop */ }
    const db = admin.firestore();

    const executiveDoc = await db.collection('executive-profiles').doc(executiveId).get();
    if (!executiveDoc.exists) {
        return { status: 'error', message: 'Executive not found.', matches: [] };
    }
    const executiveRaw = executiveDoc.data() || {};
    const executiveParsed = parseExecutiveProfile(executiveRaw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executive = (executiveParsed ?? (executiveRaw as any)) as ExecutiveProfile;

    const savedOppsSnapshot = await db.collection('executive-profiles').doc(executiveId).collection('saved-opportunities').get();
    const savedOppIds = new Set(savedOppsSnapshot.docs.map(doc => doc.id));

    const applicationsSnapshot = await db.collection('applications').where('executiveId', '==', executiveId).get();
    const applicationsMap = new Map<string, { id: string, status: ApplicationStatus }>();
    applicationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        applicationsMap.set(data.startupNeedId, { id: doc.id, status: data.status });
    });

    const startupNeedsDocs = await db.collection('startup-needs').where('status', '==', 'active').get();
    if (startupNeedsDocs.empty) {
        return { status: 'success', message: 'No active opportunities found.', matches: [] };
    }
    let startupNeedsData = startupNeedsDocs.docs.map(doc => {
        const data = doc.data();
        const applicationInfo = applicationsMap.get(doc.id);
        return {
            id: doc.id,
            ...data,
            projectScope: data.roleSummary,
            companyName: data.companyName,
            createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
            updatedAt: getTimestamp(data, 'updatedAt'),
            isSaved: savedOppIds.has(doc.id),
            isApplied: !!applicationInfo,
            applicationStatus: applicationInfo?.status,
        } as StartupNeeds & { isSaved?: boolean; isApplied?: boolean, applicationStatus?: ApplicationStatus }
    });

    // Apply a limit to the number of startup needs we consider to bound AI call cost and latency.
    if (limit && startupNeedsData.length > limit) {
        startupNeedsData = startupNeedsData.slice(0, limit);
        if (VERBOSE_LOGS) console.debug(`[findMatchesForExecutive] limiting startupNeeds to ${limit} of ${startupNeedsDocs.size}`);
    }

    // Try vector-first for executive -> startups matching to avoid expensive per-startup AI calls
    const useVectorForExec = process.env.USE_VECTOR_DB === 'true' || process.env.USE_VECTOR_DB === '1';
    if (useVectorForExec) {
        try {
            const canonical = canonicalizeUserProfile(executive as any);
            const vec = await computeEmbedding(canonical);
            const topN = Number(process.env.MATCH_VECTOR_TOP_N || 50);
            const vdb = await import('./vector-db');
            const resp = await vdb.query(vec, topN, true).catch(() => null);
            if (resp && Array.isArray((resp as any).matches) && (resp as any).matches.length) {
                const matches: any[] = [];
                for (let i = 0; i < (resp as any).matches.length; i++) {
                    const m = (resp as any).matches[i];
                    const rawId = String(m.id || '');
                    const cleaned = rawId.replace(/^startup-|^need-|^job-/i, '');
                    const startup = startupNeedsData.find(s => s.id === cleaned);
                    if (!startup) continue;
                    const raw = clampScore(deriveRawScore(m, i, (resp as any).matches.length));
                    matches.push({ ...startup, matchScore: raw, __rawVectorMatch: m });
                }

                // Normalize using helper
                const rawScoresExec = matches.map(x => Number(x.matchScore) || 0);
                const normalizedExec = normalizeScores(rawScoresExec);
                for (let i = 0; i < matches.length; i++) matches[i].matchScore = normalizedExec[i];

                // Optionally rerank top K using AI
                const rerankK = Number(process.env.MATCH_RERANK_TOP_K || 0);
                if (rerankK > 0) {
                    const top = matches.slice().sort((a, b) => b.matchScore - a.matchScore).slice(0, rerankK);
                    try {
                        const aiPromises = top.map(async (startup: any) => {
                            const startupNeedsString = `\n        Company: ${startup.companyName}.\n        Project Scope: ${startup.roleSummary}.\n        Budget: ${startup.budget}.\n        Required Expertise: ${Array.isArray(startup.requiredExpertise) ? startup.requiredExpertise.join(', ') : startup.requiredExpertise}.\n        Company Stage: ${startup.companyStage}.\n        Key Challenges & Dealbreakers: ${startup.keyChallenges || 'Not specified'}.\n      `;
                            try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
                            const result = await matchExecutiveToStartup({ executiveProfile: executiveProfileString, startupNeeds: startupNeedsString });
                            return { id: startup.id, score: result.matchScore, rationale: result.rationale, recommendation: result.recommendation };
                        });
                        const aiResults = await Promise.all(aiPromises);
                        for (const r of aiResults) {
                            const idx = matches.findIndex(x => x.id === r.id);
                            if (idx >= 0) {
                                matches[idx].matchScore = typeof r.score === 'number' ? r.score : matches[idx].matchScore;
                                matches[idx].rationale = r.rationale;
                                matches[idx].recommendation = r.recommendation;
                            }
                        }
                    } catch (err) {
                        if (VERBOSE_LOGS) console.debug('[findMatchesForExecutive] rerank AI failed, proceeding with vector scores', String(err));
                    }
                }

                const sorted = matches.sort((a, b) => b.matchScore - a.matchScore);
                const telemetry = {
                    endpoint: 'findMatchesForExecutive',
                    executiveId,
                    pathUsed: Number(process.env.MATCH_RERANK_TOP_K || 0) > 0 ? 'vector+rerank' : 'vector-only',
                    vectorRequested: (resp as any).matches.length,
                    vectorReturned: matches.length,
                    rerankK: Number(process.env.MATCH_RERANK_TOP_K || 0),
                } as any;
                if (VERBOSE_LOGS) console.debug('[findMatchesForExecutive] telemetry', telemetry);
                return { status: 'success', message: 'Vector matches returned', matches: sorted.map(m => ({ ...m, pathUsed: telemetry.pathUsed })) };
            }
        } catch (err) {
            if (VERBOSE_LOGS) console.debug('[findMatchesForExecutive] vector-first retrieval failed, falling back', String(err));
        }
    }

    const accomplishments = executive.keyAccomplishments?.map(a => a.value).join('; ') || '';
    const executiveProfileString = `Name: ${executive.name}. Expertise: ${executive.expertise}. Industry Experience: ${executive.industryExperience?.join(', ') || ''}. Availability: ${executive.availability}. Desired Compensation: ${executive.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${executive.githubInsights || ''}`;

    try {
        // Run AI matching in controlled concurrent batches to avoid long tail latency
        const concurrency = Number(process.env.MATCH_CONCURRENCY || 5);
        const batchResults: any[] = [];
        const totalStart = Date.now();
        for (let i = 0; i < startupNeedsData.length; i += concurrency) {
            const batch = startupNeedsData.slice(i, i + concurrency);
            const batchStart = Date.now();
            const batchPromises = batch.map(async startup => {
                const startupNeedsString = `
        Company: ${startup.companyName}.
        Project Scope: ${startup.roleSummary}.
        Budget: ${startup.budget}.
        Required Expertise: ${Array.isArray(startup.requiredExpertise) ? startup.requiredExpertise.join(', ') : startup.requiredExpertise}.
        Company Stage: ${startup.companyStage}.
        Key Challenges & Dealbreakers: ${startup.keyChallenges || 'Not specified'}.
      `;

                try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
                const result = await matchExecutiveToStartup({
                    executiveProfile: executiveProfileString,
                    startupNeeds: startupNeedsString,
                });

                return {
                    ...startup,
                    matchScore: result.matchScore,
                    rationale: result.rationale,
                    recommendation: result.recommendation,
                };
            });

            const resolved = await Promise.all(batchPromises);
            batchResults.push(...resolved);
            console.debug(`[findMatchesForExecutive] batch ${Math.floor(i / concurrency) + 1} size=${batch.length} ms=${Date.now() - batchStart}`);
        }

        const sortedResults = batchResults.sort((a, b) => b.matchScore - a.matchScore);
        console.debug(`[findMatchesForExecutive] exec=${executiveId} count=${sortedResults.length} totalMs=${Date.now() - totalStart}`);

        return {
            status: 'success',
            message: 'Matches found successfully.',
            matches: sortedResults,
        };
    } catch (error) {
        return { status: 'error', message: handleGenkitError(error), matches: [] };
    }
}

type SignupState = {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    errors: Record<string, string[] | undefined> | null;
};

export async function signup(
    prevState: SignupState,
    formData: FormData
): Promise<SignupState> {
    const validatedFields = signupSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid form data. Please check your inputs and try again.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { email, password, name, role } = validatedFields.data;

    try {
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        await admin.auth().setCustomUserClaims(userRecord.uid, { role });
        console.log('Successfully created new user:', userRecord.uid);
        return {
            status: 'success',
            message: 'Account created successfully! You can now log in.',
            errors: null,
        };
    } catch (error: any) {
        console.error('Error creating new user:', error);
        return {
            status: 'error',
            message: error.message || 'An unknown error occurred during signup.',
            errors: null,
        };
    }
}

export async function createSessionCookie(idToken: string) {
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === 'production';
    cookieStore.set('ss-session', sessionCookie, {
        maxAge: Math.floor(expiresIn / 1000),
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
    });
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ss-session')?.value;
    if (sessionCookie) {
        try {
            const decodedToken = await admin.auth().verifySessionCookie(sessionCookie);
            await admin.auth().revokeRefreshTokens(decodedToken.uid);
        } catch (error) {
            console.error('Error revoking refresh tokens:', error);
        }
    }
    // delete the cookie by name
    cookieStore.delete('ss-session');
}


export async function getUserDetails(
    uid: string
): Promise<{ role: 'startup' | 'executive' | 'admin' | null; name: string | null; email: string | null, profile: Partial<ExecutiveProfile> | Partial<StartupProfile> | null } | null> {
    try {
        const userRecord = await admin.auth().getUser(uid);
        const db = admin.firestore();
        const role = userRecord.customClaims?.role as 'startup' | 'executive' | 'admin' | undefined;
        const email = userRecord.email || null;
        let name = userRecord.displayName || null;
        let profile: Partial<ExecutiveProfile> | Partial<StartupProfile> | null = null;

        if (role === 'executive') {
            const doc = await db.collection('executive-profiles').doc(uid).get();
            if (doc.exists) {
                const raw = doc.data();
                const parsed = parseExecutiveProfile(raw);
                if (parsed) {
                    profile = {
                        ...parsed,
                        id: doc.id,
                        updatedAt: getTimestamp(parsed, 'updatedAt') || undefined,
                        createdAt: getTimestamp(parsed, 'createdAt') || undefined,
                    };
                    name = (profile as Partial<import('@/lib/types').ExecutiveProfile>)?.name || name;
                }
            }
        } else if (role === 'startup') {
            const doc = await db.collection('startup-profiles').doc(uid).get();
            if (doc.exists) {
                const raw = doc.data();
                const parsed = parseStartupProfile(raw);
                if (parsed) {
                    profile = {
                        ...parsed,
                        id: doc.id,
                        updatedAt: getTimestamp(parsed, 'updatedAt') || undefined,
                        createdAt: getTimestamp(parsed, 'createdAt') || undefined,
                    };
                    name = (profile as Partial<import('@/lib/types').StartupProfile>)?.userName || name;
                }
            }
        }

        if (role === 'startup' || role === 'executive' || role === 'admin') {
            return { role, name, email, profile };
        }
        return { role: null, name, email, profile: null };
    } catch (error) {
        const authErr = error as { code?: string } | undefined;
        if (authErr?.code === 'auth/user-not-found') {
            return null;
        }
        console.error('Error fetching user details:', error);
        return null;
    }
}

type RewriteState = {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    rewrittenText?: string;
    index?: number;
    fieldName?: string;
    field?: 'expertise' | 'accomplishment' | 'roleSummary' | 'keyDeliverables' | 'keyChallenges' | 'shortDescription' | 'currentChallenge' | 'whyUs' | 'roleTitle';
};

export type RewriteFieldInput = {
    fieldName: string;
    currentValue: string;
    index?: number;
};

const rewriteInputSchema = z.object({
    fieldName: z.string().optional(),
    currentValue: z.string(),
    index: z.number().optional(),
});

export async function rewriteJobDescriptionField(
    prevState: RewriteState,
    data: z.infer<typeof rewriteInputSchema>
): Promise<RewriteState> {
    const validatedFields = rewriteInputSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid input for rewrite function.',
        };
    }

    if (!validatedFields.data.currentValue) {
        return {
            status: 'error',
            message: 'Please enter some text before rewriting.',
        };
    }

    try {
        try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
        const result = await rewriteJobDescriptionFieldFlow({
            fieldName: validatedFields.data.fieldName || '',
            currentValue: validatedFields.data.currentValue,
        });
        const fieldMap: Record<string, RewriteState['field']> = {
            'Role Title': 'roleTitle',
            'Project Scope': 'roleSummary',
            'Key Deliverables': 'keyDeliverables',
            'Key Challenges': 'keyChallenges',
        }
        return {
            status: 'success',
            message: 'Content rewritten successfully.',
            rewrittenText: result.rewrittenText,
            field: fieldMap[validatedFields.data.fieldName!],
            fieldName: validatedFields.data.fieldName,
        };
    } catch (error) {
        return { status: 'error', message: handleGenkitError(error) };
    }
}

export async function rewriteExecutiveProfileField(
    prevState: RewriteState,
    data: RewriteFieldInput
): Promise<RewriteState> {
    const validatedFields = rewriteInputSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid input for rewrite function.',
        };
    }

    if (!validatedFields.data.currentValue) {
        return {
            status: 'error',
            message: 'Please enter some text before rewriting.',
        };
    }

    try {
        const { fieldName, currentValue } = validatedFields.data;
        try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
        const result = await rewriteExecutiveProfileFieldFlow({ fieldName: fieldName || '', currentValue });

        return {
            status: 'success',
            message: 'Content rewritten successfully.',
            rewrittenText: result.rewrittenText,
            index: validatedFields.data.index,
            field: fieldName === 'Expertise Summary' ? 'expertise' : 'accomplishment',
        };
    } catch (error) {
        return { status: 'error', message: handleGenkitError(error) };
    }
}

export async function rewriteStartupProfileField(
    prevState: RewriteState,
    data: z.infer<typeof rewriteInputSchema>
): Promise<RewriteState> {
    const validatedFields = rewriteInputSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid input for rewrite function.',
        };
    }

    if (!validatedFields.data.currentValue) {
        return {
            status: 'error',
            message: 'Please enter some text before rewriting.',
        };
    }

    try {
        try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
        const result = await rewriteStartupProfileFieldFlow({
            fieldName: validatedFields.data.fieldName || '',
            currentValue: validatedFields.data.currentValue,
        });
        const fieldMap: Record<string, RewriteState['field']> = {
            'Short Description': 'shortDescription',
            'Current Challenge': 'currentChallenge',
            'Why Us': 'whyUs',
        }
        return {
            status: 'success',
            message: 'Content rewritten successfully.',
            rewrittenText: result.rewrittenText,
            field: fieldMap[validatedFields.data.fieldName!],
            fieldName: validatedFields.data.fieldName,
        };
    } catch (error) {
        return { status: 'error', message: handleGenkitError(error) };
    }
}

type StartupNeedFormState = {
    status: 'idle' | 'success' | 'error';
    message: string;
    errors?: Record<string, string[] | undefined> | null;
    needId?: string;
};

export async function createStartupNeed(creatorId: string, data: z.infer<typeof startupNeedsSchema>): Promise<StartupNeedFormState> {
    const validatedFields = startupNeedsSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid form data.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const db = admin.firestore();
        const docRef = await db.collection('startup-needs').add({
            ...validatedFields.data,
            creatorId: creatorId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active',
        });
        console.log('Document written with ID: ', docRef.id);
        try { await markStartupDirty(docRef.id); } catch (err) { console.debug('[matching-cache] markStartupDirty failed', err); }
        try { await markStartupVectorScoresDirty(docRef.id); } catch (err) { console.debug('[matching-cache] markStartupVectorScoresDirty failed', err); }
        revalidatePath('/startups/needs');
        return { status: 'success', message: 'Startup need created successfully.', needId: docRef.id };
    } catch (error) {
        console.error('Error adding document: ', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}


export async function updateStartupNeed(id: string, data: z.infer<typeof startupNeedsSchema>): Promise<StartupNeedFormState> {
    const validatedFields = startupNeedsSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid form data.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const db = admin.firestore();
        await db.collection('startup-needs').doc(id).update({
            ...validatedFields.data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('Document updated with ID: ', id);
        try { await markStartupDirty(id); } catch (err) { console.debug('[matching-cache] markStartupDirty failed', err); }
        try { await markStartupVectorScoresDirty(id); } catch (err) { console.debug('[matching-cache] markStartupVectorScoresDirty failed', err); }
        revalidatePath('/startups/needs');
        revalidatePath(`/startups/needs/edit/${id}`);
        return { status: 'success', message: 'Startup need updated successfully.', needId: id };
    } catch (error) {
        console.error('Error updating document: ', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}


type GetNeedsResult = {
    status: 'success' | 'error';
    message: string;
    needs: StartupNeeds[];
};

export async function getStartupNeeds(creatorId: string): Promise<GetNeedsResult> {
    try {
        const db = admin.firestore();
        const needsSnapshot = await db.collection('startup-needs')
            .where('creatorId', '==', creatorId)
            .get();

        if (needsSnapshot.empty) {
            return { status: 'success', message: 'No needs found.', needs: [] };
        }

        const needs = needsSnapshot.docs.map(doc => {
            const raw = doc.data();
            const parsed = parseStartupNeed(raw);
            // If parsing fails we fall back to the raw Firestore data. Use a local `any` cast
            // so TypeScript allows property access; this is safe because we validate at runtime
            // when saving and in the UI. eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = (parsed ?? (raw as any)) as StartupNeeds;

            let expertise: string[] = [];
            const reqExp = data.requiredExpertise as unknown;
            if (Array.isArray(reqExp)) {
                expertise = reqExp as string[];
            } else if (typeof reqExp === 'string' && reqExp.trim()) {
                expertise = (reqExp as string).split(',').map((s: string) => s.trim()).filter(Boolean);
            }

            return {
                id: doc.id,
                companyName: data.companyName,
                companyStage: data.companyStage,
                roleTitle: data.roleTitle,
                roleSummary: data.roleSummary,
                keyDeliverables: data.keyDeliverables,
                engagementLength: data.engagementLength,
                budget: data.budget,
                logoUrl: data.logoUrl || `https://placehold.co/100x100.png`,
                dataAiHint: data.dataAiHint || 'logo',
                projectScope: data.roleSummary,
                requiredExpertise: expertise,
                status: data.status || 'active',
                createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                updatedAt: getTimestamp(data, 'updatedAt'),
                locationPreference: data.locationPreference || '',
                keyChallenges: data.keyChallenges || '',
                links: data.links || {},
            } as StartupNeeds;
        });

        // Sort by creation date descending
        needs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { status: 'success', message: 'Needs fetched successfully.', needs };
    } catch (error: any) {
        console.error('Error fetching startup needs:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, needs: [] };
    }
}

export async function getStartupNeed(startupNeedId: string, executiveId?: string): Promise<{ status: 'success' | 'error', message: string, need: StartupNeeds | null }> {
    try {
        const db = admin.firestore();
        const docRef = db.collection('startup-needs').doc(startupNeedId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return { status: 'error', message: 'Need not found.', need: null };
        }
        const raw = doc.data() || {};
        const parsed = parseStartupNeed(raw);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (parsed ?? (raw as any)) as StartupNeeds;

        let startupProfile: StartupProfile | null = null;
        if (data.creatorId) {
            const startupProfileDoc = await db.collection('startup-profiles').doc(data.creatorId).get();
            if (startupProfileDoc.exists) {
                const rawProfile = startupProfileDoc.data() || {};
                const profileParsed = parseStartupProfile(rawProfile);
                const profileData = (profileParsed ?? (rawProfile as unknown)) as StartupProfile;
                startupProfile = Object.assign({}, profileData as StartupProfile, {
                    id: startupProfileDoc.id,
                    createdAt: getTimestamp(profileData, 'createdAt') || undefined,
                    updatedAt: getTimestamp(profileData, 'updatedAt') || undefined,
                }) as StartupProfile;
            }
        }

        let isApplied = false;
        let isSaved = false;

        if (executiveId) {
            const applicationDoc = await db.collection('applications').doc(`${executiveId}_${startupNeedId}`).get();
            isApplied = applicationDoc.exists;

            const savedDoc = await db.collection('executive-profiles').doc(executiveId).collection('saved-opportunities').doc(startupNeedId).get();
            isSaved = savedDoc.exists;
        }

        const need: StartupNeeds = {
            id: doc.id,
            creatorId: data.creatorId,
            companyName: data.companyName,
            companyStage: data.companyStage,
            roleTitle: data.roleTitle,
            roleSummary: data.roleSummary,
            keyDeliverables: data.keyDeliverables,
            keyChallenges: data.keyChallenges,
            engagementLength: data.engagementLength,
            budget: data.budget,
            links: data.links,
            logoUrl: data.logoUrl || `https://placehold.co/100x100.png`,
            dataAiHint: data.dataAiHint || 'logo',
            projectScope: data.roleSummary,
            requiredExpertise: data.requiredExpertise, // This will be an array for the form
            status: data.status || 'active',
            createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
            updatedAt: getTimestamp(data, 'updatedAt') || undefined,
            locationPreference: data.locationPreference,
            startupProfile: startupProfile,
            isApplied,
            isSaved,
        };

        return { status: 'success', message: 'Need fetched successfully.', need };
    } catch (error) {
        console.error('Error fetching startup need:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, need: null };
    }
}


export async function deleteStartupNeed(id: string): Promise<{ status: 'success' | 'error', message: string }> {
    try {
        const db = admin.firestore();
        await db.collection('startup-needs').doc(id).delete();
        try { await markStartupDirty(id); } catch (err) { console.debug('[matching-cache] markStartupDirty failed', err); }
        try { await markStartupVectorScoresDirty(id); } catch (err) { console.debug('[matching-cache] markStartupVectorScoresDirty failed', err); }
        revalidatePath('/startups/needs');
        return { status: 'success', message: 'Need deleted successfully.' };
    } catch (error) {
        console.error('Error deleting document: ', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}

export async function updateStartupNeedStatus(id: string, status: 'active' | 'inactive'): Promise<{ status: 'success' | 'error', message: string }> {
    try {
        const db = admin.firestore();
        await db.collection('startup-needs').doc(id).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        revalidatePath('/startups/needs');
        return { status: 'success', message: `Status updated to ${status}.` };
    } catch (error) {
        console.error('Error updating status:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}


type ExecutiveProfileFormState = {
    status: 'success' | 'error';
    message: string;
    errors?: Record<string, string[] | undefined> | null;
};

export async function saveExecutiveProfile(
    executiveId: string,
    data: z.infer<typeof executiveProfileSchema>
): Promise<ExecutiveProfileFormState> {
    if (!executiveId) {
        return { status: 'error', message: 'You must be logged in to save a profile.' };
    }

    const validatedFields = executiveProfileSchema.safeParse(data);
    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid form data.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const db = admin.firestore();
        const profileRef = db.collection('executive-profiles').doc(executiveId);
        const profileData = { ...validatedFields.data };

        await profileRef.set({
            ...profileData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Fire-and-forget: compute + write embedding for this executive profile
        (async () => {
            try {
                const snapshot = canonicalizeUserProfile(profileData as any);
                const vec = await computeEmbedding(snapshot);
                await writeEmbedding(executiveId, 'user', snapshot, vec);
                // After embedding upsert, perform incremental update: find affected startups and mark their vector-scores dirty
                try {
                    const marked = await incrementalUpdateForExecutive(executiveId, vec, Number(process.env.MATCH_VECTOR_TOP_N || 50));
                    if (marked && marked > 0) {
                        try { emitMetric('matching.incremental_hits', marked); } catch (e) { }
                    }
                } catch (e) {
                    console.debug('[saveExecutiveProfile] incremental update failed', String(e));
                }
            } catch (err) {
                console.debug('[saveExecutiveProfile] embedding write failed', String(err));
            }
        })();
        // Invalidate caches that include this executive
        (async () => {
            try {
                // Mark any matching-cache docs that reference this exec as dirty
                const count = await markCachesDirtyByTag(`exec:${executiveId}`);
                try { emitMetric('matching.markCachesDirtyByTag', count); } catch (e) { }
            } catch (err) {
                console.debug('[matching-cache] markCachesDirtyByTag failed', err);
            }
        })();
        revalidatePath('/executives/profile');
        revalidatePath('/executives/profile/view');
        return { status: 'success', message: 'Profile saved successfully.' };
    } catch (error) {
        console.error('Error saving executive profile: ', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}

type GetExecutiveProfileState = {
    status: 'success' | 'error';
    message: string;
    profile: (Partial<ExecutiveProfile> & { isShortlisted?: boolean }) | null;
    code?: 'not-found';
}

export async function getExecutiveProfile(executiveId: string): Promise<GetExecutiveProfileState> {
    if (!executiveId) {
        return { status: 'error', message: 'You must be logged in.', profile: null };
    }

    try {
        const db = admin.firestore();
        const profileRef = db.collection('executive-profiles').doc(executiveId);
        const doc = await profileRef.get();

        if (!doc.exists) {
            return { status: 'error', message: 'No profile found.', profile: null, code: 'not-found' };
        }

        const raw = doc.data();
        const parsed = parseExecutiveProfile(raw) || {};

        const safeData = parsed;
        const serializableProfile = {
            ...safeData,
            id: doc.id,
            keyAccomplishments: (safeData as any).keyAccomplishments || [],
            industryExperience: (safeData as any).industryExperience || [],
            updatedAt: getTimestamp(safeData, 'updatedAt') || undefined,
            createdAt: getTimestamp(safeData, 'createdAt') || undefined,
        }


        return { status: 'success', message: 'Profile fetched.', profile: serializableProfile };

    } catch (error) {
        console.error('Error fetching executive profile:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, profile: null };
    }
}

export async function getExecutiveProfileById(startupId: string, executiveId: string): Promise<GetExecutiveProfileState> {
    try {
        const db = admin.firestore();
        const profileRef = db.collection('executive-profiles').doc(executiveId);
        const doc = await profileRef.get();

        if (!doc.exists) {
            return { status: 'error', message: 'No profile found for this executive.', profile: null, code: 'not-found' };
        }

        const raw = doc.data();
        const parsed = parseExecutiveProfile(raw) || {};

        const shortlistRef = db.collection('startup-profiles').doc(startupId).collection('shortlisted-executives').doc(executiveId);
        const shortlistDoc = await shortlistRef.get();
        const isShortlisted = shortlistDoc.exists;

        const safeData2 = parsed || {};
        const serializableProfile = {
            ...safeData2,
            id: doc.id,
            keyAccomplishments: (safeData2 as any).keyAccomplishments || [],
            industryExperience: (safeData2 as any).industryExperience || [],
            updatedAt: getTimestamp(safeData2, 'updatedAt') || undefined,
            createdAt: getTimestamp(safeData2, 'createdAt') || undefined,
            isShortlisted: isShortlisted,
        }


        return { status: 'success', message: 'Profile fetched.', profile: serializableProfile };

    } catch (error) {
        console.error('Error fetching executive profile:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, profile: null };
    }
}

type GetExecutiveProfilesState = {
    status: 'success' | 'error';
    message: string;
    profiles: ExecutiveProfile[];
}

export async function getAllExecutiveProfiles(startupId: string): Promise<GetExecutiveProfilesState> {
    const db = admin.firestore();
    try {
        const [profilesSnapshot, startupNeedsSnapshot, shortlistSnapshot] = await Promise.all([
            db.collection('executive-profiles').get(),
            db.collection('startup-needs').where('creatorId', '==', startupId).where('status', '==', 'active').get(),
            db.collection('startup-profiles').doc(startupId).collection('shortlisted-executives').get()
        ]);

        if (profilesSnapshot.empty) {
            return { status: 'success', message: 'No profiles found.', profiles: [] };
        }

        const shortlistedIds = new Set(shortlistSnapshot.docs.map(doc => doc.id));

        const useAiMatching = (process.env.USE_AI_MATCHING === 'true') || (process.env.NEXT_PUBLIC_USE_AI_MATCHING === 'true');

        // If AI matching is disabled but a vector DB is available, precompute
        // vector-derived scores per startup-need so the Find Talent view can show
        // meaningful scores instead of all zeros. This calls the cheaper
        // vector-first path in `findMatchesForStartup` for each need and builds
        // a map of executiveId -> highest score across needs.
        let execVectorScores = new Map<string, number>();
        // Check durable Firestore cache first, then fall back to in-memory cache
        try {
            const persisted = await getStartupVectorScores(startupId);
            if (persisted && typeof persisted === 'object') {
                execVectorScores = new Map(Object.entries(persisted as Record<string, number>));
                if (VERBOSE_LOGS) console.debug('[getAllExecutiveProfiles] using persisted execVectorScores', { size: execVectorScores.size });
            } else {
                const now = Date.now();
                if (EXEC_VECTOR_SCORES_CACHE.expiresAt > now && EXEC_VECTOR_SCORES_CACHE.value.size > 0) {
                    execVectorScores = new Map(EXEC_VECTOR_SCORES_CACHE.value);
                    if (VERBOSE_LOGS) console.debug('[getAllExecutiveProfiles] using in-memory execVectorScores', { size: execVectorScores.size });
                } else {
                    execVectorScores = new Map<string, number>();
                }
            }
        } catch (e) {
            // on any failure use in-memory cache
            const now = Date.now();
            if (EXEC_VECTOR_SCORES_CACHE.expiresAt > now && EXEC_VECTOR_SCORES_CACHE.value.size > 0) execVectorScores = new Map(EXEC_VECTOR_SCORES_CACHE.value);
            else execVectorScores = new Map<string, number>();
        }
        const useVector = process.env.USE_VECTOR_DB === 'true' || process.env.USE_VECTOR_DB === '1';
        if (!useAiMatching && useVector && !startupNeedsSnapshot.empty) {
            try {
                const needs = startupNeedsSnapshot.docs.map(d => d.id);
                const perNeedPromises = needs.map(async (needId) => {
                    try {
                        const res = await findMatchesForStartup(needId);
                        if (res && res.status === 'success' && Array.isArray(res.matches)) {
                            for (const m of res.matches) {
                                const id = String((m as any).id || '');
                                const score = typeof m.matchScore === 'number' ? m.matchScore : 0;
                                const prev = execVectorScores.get(id) || 0;
                                if (score > prev) execVectorScores.set(id, score);
                            }
                        }
                    } catch (e) {
                        if (VERBOSE_LOGS) console.debug('[getAllExecutiveProfiles] vector fallback for need failed', needId, String(e));
                    }
                });
                await Promise.all(perNeedPromises);
                // Persist to in-memory cache
                try {
                    EXEC_VECTOR_SCORES_CACHE.value = new Map(execVectorScores);
                    EXEC_VECTOR_SCORES_CACHE.expiresAt = Date.now() + EXEC_VECTOR_SCORES_TTL_MS;
                } catch (e) {
                    if (VERBOSE_LOGS) console.debug('[getAllExecutiveProfiles] failed to persist execVectorScores to memory cache', String(e));
                }
                // Also persist durable map to Firestore (best-effort)
                try {
                    const mapObj: Record<string, number> = {};
                    execVectorScores.forEach((v, k) => { mapObj[k] = v; });
                    await setStartupVectorScores(startupId, mapObj);
                } catch (e) {
                    if (VERBOSE_LOGS) console.debug('[getAllExecutiveProfiles] failed to persist execVectorScores to Firestore', String(e));
                }
                if (VERBOSE_LOGS) {
                    try {
                        const sample = Array.from(execVectorScores.entries()).slice(0, 10);
                        console.debug('[getAllExecutiveProfiles] precomputed execVectorScores', { size: execVectorScores.size, sample });
                    } catch (e) {
                        console.debug('[getAllExecutiveProfiles] precomputed execVectorScores - (unable to stringify)');
                    }
                }
            } catch (e) {
                if (VERBOSE_LOGS) console.debug('[getAllExecutiveProfiles] failed to precompute vector scores', String(e));
            }
        }

        const profilesPromises = profilesSnapshot.docs.map(async (doc) => {
            const raw = doc.data();
            const data = parseExecutiveProfile(raw) || (raw as ExecutiveProfile);

            let highestMatchScore = 0;
            if (!startupNeedsSnapshot.empty) {
                const matchScores = await Promise.all(startupNeedsSnapshot.docs.map(async (needDoc) => {
                    const startupNeedRaw = needDoc.data() || {};
                    const startupNeedParsed = parseStartupNeed(startupNeedRaw);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const startupNeed = (startupNeedParsed ?? (startupNeedRaw as any)) as StartupNeeds;

                    const accomplishments = data.keyAccomplishments?.map((a: any) => a.value).join('; ') || '';
                    const executiveProfileString = `Name: ${data.name}. Expertise: ${data.expertise}. Industry Experience: ${data.industryExperience?.join(', ') || ''}. Availability: ${data.availability}. Desired Compensation: ${data.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${data.githubInsights || ''}`;

                    const startupNeedsString = `
                        Project Scope: ${startupNeed.roleSummary}.
                        Budget: ${startupNeed.budget}.
                        Required Expertise: ${Array.isArray(startupNeed.requiredExpertise) ? startupNeed.requiredExpertise.join(', ') : startupNeed.requiredExpertise}.
                        Company Stage: ${startupNeed.companyStage}.
                        Key Challenges & Dealbreakers: ${startupNeed.keyChallenges || 'Not specified'}.
                    `;

                    // If AI matching is disabled, prefer any vector-derived precomputed
                    // score we computed above; otherwise respect a stored profile
                    // matchScore or fall back to 0.
                    if (!useAiMatching) {
                        const vid = doc.id;
                        const vecScore = execVectorScores.get(vid);
                        if (typeof vecScore === 'number') return vecScore;
                        return (data.matchScore && typeof data.matchScore === 'number') ? data.matchScore : 0;
                    }

                    // Try to read a cached AI match for this executive<->need pair to avoid repeated LLM invocations
                    try {
                        const cacheRef = db.collection('executive-profiles').doc(doc.id).collection('ai-matches').doc(needDoc.id);
                        const cached = await cacheRef.get();
                        if (cached.exists) {
                            const cachedData = cached.data() as any;
                            if (cachedData && typeof cachedData.matchScore === 'number') return cachedData.matchScore;
                        }
                    } catch (e) {
                        // ignore cache read failures and proceed to compute
                        console.debug('[matching] cache read failed', e);
                    }

                    try {
                        try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
                        const result = await matchExecutiveToStartup({
                            executiveProfile: executiveProfileString,
                            startupNeeds: startupNeedsString,
                        });

                        // Persist cache for future calls (best-effort)
                        try {
                            const cacheRef = db.collection('executive-profiles').doc(doc.id).collection('ai-matches').doc(needDoc.id);
                            await cacheRef.set({
                                matchScore: result.matchScore,
                                rationale: result.rationale,
                                recommendation: result.recommendation,
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });
                        } catch (e) {
                            console.debug('[matching] failed to persist ai-match cache', e);
                        }

                        return result.matchScore;
                    } catch (e: any) {
                        // Handle quota / rate-limit errors gracefully and fall back to a safe default
                        if (e && e.status === 429) {
                            console.warn('[matching] LLM quota exceeded, skipping AI match for now:', e?.message || e);
                            return 0;
                        }
                        console.error('[matching] unexpected error during AI match:', e);
                        return 0;
                    }
                }));
                highestMatchScore = Math.max(...matchScores);
            }

            return {
                ...data,
                id: doc.id,
                keyAccomplishments: data.keyAccomplishments || [],
                industryExperience: data.industryExperience || [],
                updatedAt: getTimestamp(data, 'updatedAt') || undefined,
                createdAt: getTimestamp(data, 'createdAt') || undefined,
                isShortlisted: shortlistedIds.has(doc.id),
                matchScore: highestMatchScore,
            } as ExecutiveProfile;
        });

        const profiles = await Promise.all(profilesPromises);

        return { status: 'success', message: 'Profiles fetched.', profiles };

    } catch (error) {
        console.error('Error fetching all executive profiles:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, profiles: [] };
    }
}


type StartupProfileFormState = {
    status: 'success' | 'error';
    message: string;
    errors?: Record<string, string[] | undefined> | null;
};

export async function saveStartupProfile(
    startupId: string,
    data: z.infer<typeof startupProfileSchema>
): Promise<StartupProfileFormState> {
    const validatedFields = startupProfileSchema.safeParse(data);
    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Invalid form data.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        const db = admin.firestore();
        const profileRef = db.collection('startup-profiles').doc(startupId);

        await profileRef.set({
            ...validatedFields.data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Fire-and-forget: compute + write embedding for this startup profile
        (async () => {
            try {
                const snapshot = canonicalizeJob(validatedFields.data as any);
                const vec = await computeEmbedding(snapshot);
                await writeEmbedding(startupId, 'job', snapshot, vec);
            } catch (err) {
                console.debug('[saveStartupProfile] embedding write failed', String(err));
            }
        })();
        revalidatePath('/startups/profile/view');
        return { status: 'success', message: 'Profile saved successfully.' };
    } catch (error) {
        console.error('Error saving startup profile: ', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}

type GetStartupProfileState = {
    status: 'success' | 'error';
    message: string;
    profile: Partial<StartupProfile> | null;
    code?: 'not-found';
}

export async function getStartupProfile(startupId: string): Promise<GetStartupProfileState> {
    try {
        const db = admin.firestore();
        const profileRef = db.collection('startup-profiles').doc(startupId);
        const doc = await profileRef.get();

        if (!doc.exists) {
            return { status: 'error', message: 'No profile found.', profile: null, code: 'not-found' };
        }

        const raw = doc.data() || {};
        const parsed = parseStartupProfile(raw);
        const data = (parsed ?? (raw as unknown)) as StartupProfile;

        const serializableProfile = Object.assign({}, data, {
            id: doc.id,
            updatedAt: getTimestamp(data, 'updatedAt') || undefined,
            createdAt: getTimestamp(data, 'createdAt') || undefined,
        });

        return { status: 'success', message: 'Profile fetched.', profile: serializableProfile };

    } catch (error) {
        console.error('Error fetching startup profile:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, profile: null };
    }
}


export async function toggleSaveOpportunity(
    executiveId: string,
    startupNeedId: string,
    isCurrentlySaved: boolean
): Promise<{ status: 'success' | 'error', message: string, newState: 'saved' | 'unsaved' }> {

    const db = admin.firestore();
    const savedOppRef = db
        .collection('executive-profiles')
        .doc(executiveId)
        .collection('saved-opportunities')
        .doc(startupNeedId);

    try {
        if (isCurrentlySaved) {
            await savedOppRef.delete();
            revalidatePath('/executives/dashboard');
            revalidatePath('/executives/saved');
            return { status: 'success', message: 'Opportunity unsaved.', newState: 'unsaved' };
        } else {
            await savedOppRef.set({ savedAt: admin.firestore.FieldValue.serverTimestamp() });
            revalidatePath('/executives/dashboard');
            revalidatePath('/executives/saved');
            return { status: 'success', message: 'Opportunity saved!', newState: 'saved' };
        }
    } catch (error) {
        console.error('Error toggling saved opportunity:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, newState: isCurrentlySaved ? 'saved' : 'unsaved' };
    }
}

export async function getSavedOpportunities(executiveId: string): Promise<FindMatchesState> {
    const db = admin.firestore();

    const start = Date.now();
    try {
        // Fetch saved-opps and applications in parallel (savedOppIds needed later)
        const [savedOppsSnapshot, applicationsSnapshot] = await Promise.all([
            db.collection('executive-profiles').doc(executiveId).collection('saved-opportunities').get(),
            db.collection('applications').where('executiveId', '==', executiveId).get(),
        ]);

        const afterMeta = Date.now();

        if (savedOppsSnapshot.empty) {
            console.debug(`[getSavedOpportunities] no saved opportunities for ${executiveId} (${Date.now() - start}ms)`);
            return { status: 'success', message: 'No saved opportunities found.', matches: [] };
        }

        const savedOppIds = savedOppsSnapshot.docs.map(doc => doc.id);
        const appliedOppIds = new Set(applicationsSnapshot.docs.map(doc => doc.data().startupNeedId));

        // Firestore limits 'in' queries to 10 document IDs — batch if necessary.
        const chunks: string[][] = [];
        for (let i = 0; i < savedOppIds.length; i += 10) {
            chunks.push(savedOppIds.slice(i, i + 10));
        }

        const needsSnapshots = await Promise.all(
            chunks.map(chunk => db.collection('startup-needs').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get())
        );

        const afterNeeds = Date.now();

        // Flatten docs from all snapshots preserving results
        const needsDocsAll = needsSnapshots.flatMap(s => s.docs);

        const needs = needsDocsAll.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                isSaved: true,
                isApplied: appliedOppIds.has(doc.id),
                projectScope: data.roleSummary,
                companyName: data.companyName,
                createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                updatedAt: getTimestamp(data, 'updatedAt'),
            } as StartupNeeds & { isSaved?: boolean; isApplied?: boolean };
        });

        // We don't need to run AI matching for this view, just return the data.
        // So we'll cast the `StartupNeeds` objects to `MatchResult` with placeholder scores.
        const matches: MatchResult[] = needs.map(need => ({
            ...need,
            matchScore: 0,
            rationale: 'This is a saved opportunity.',
            recommendation: '',
        }));

        console.debug(`[getSavedOpportunities] exec=${executiveId} metaMs=${afterMeta - start} needsMs=${afterNeeds - afterMeta} totalMs=${Date.now() - start} savedCount=${savedOppIds.length} returned=${matches.length}`);

        return { status: 'success', message: 'Saved opportunities fetched.', matches };

    } catch (error) {
        console.error('Error fetching saved opportunities:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, matches: [] };
    }
}

export async function applyForOpportunity(
    startupNeedId: string,
    executiveId: string
): Promise<{ status: 'success' | 'error', message: string }> {
    const db = admin.firestore();
    const applicationRef = db.collection('applications').doc(`${executiveId}_${startupNeedId}`);

    try {
        const doc = await applicationRef.get();
        if (doc.exists) {
            return { status: 'error', message: "You have already applied for this opportunity." };
        }

        await applicationRef.set({
            executiveId: executiveId,
            startupNeedId,
            status: 'applied',
            appliedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        revalidatePath(`/executives/opportunities/${startupNeedId}`);
        revalidatePath('/executives/applications');
        revalidatePath('/executives/dashboard');
        revalidatePath('/executives/opportunities/find');
        return { status: 'success', message: "Application submitted successfully!" };
    } catch (error) {
        console.error('Error applying for opportunity:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}

export async function getApplications(executiveId: string): Promise<{ status: 'success' | 'error', message: string, applications: Application[] }> {
    const db = admin.firestore();
    try {
        const appsSnapshot = await db.collection('applications').where('executiveId', '==', executiveId).orderBy('appliedAt', 'desc').get();

        if (appsSnapshot.empty) {
            return { status: 'success', message: 'No applications found.', applications: [] };
        }

        const startupNeedIds = appsSnapshot.docs.map(doc => doc.data().startupNeedId);

        if (startupNeedIds.length === 0) {
            return { status: 'success', message: 'No applications found.', applications: [] };
        }

        const needsSnapshot = await db.collection('startup-needs').where(admin.firestore.FieldPath.documentId(), 'in', startupNeedIds).get();
        const needsMap = new Map<string, StartupNeeds>();
        needsSnapshot.forEach(doc => {
            const data = doc.data();
            needsMap.set(doc.id, {
                id: doc.id,
                ...data,
                projectScope: data.roleSummary,
                requiredExpertise: Array.isArray(data.requiredExpertise) ? data.requiredExpertise.join(', ') : data.requiredExpertise,
                createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                updatedAt: getTimestamp(data, 'updatedAt'),
            } as StartupNeeds);
        });

        const applications: Application[] = appsSnapshot.docs.map(doc => {
            const appData = doc.data() || {};
            return {
                id: doc.id,
                status: appData.status,
                appliedAt: getTimestamp(appData, 'appliedAt') || new Date().toISOString(),
                startupNeed: needsMap.get(appData.startupNeedId)!,
            };
        }).filter(app => app.startupNeed); // Filter out any applications where the need was deleted

        return { status: 'success', message: 'Applications fetched successfully.', applications };

    } catch (error) {
        console.error('Error fetching applications:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, applications: [] };
    }
}




export async function getExecutiveDashboardStats(executiveId: string): Promise<{ status: 'success' | 'error', message: string, stats: ExecutiveDashboardStats | null }> {
    const db = admin.firestore();
    try {
        const [executiveDoc, conversations] = await Promise.all([
            db.collection('executive-profiles').doc(executiveId).get(),
            getConversationsForUser(executiveId)
        ]);

        if (!executiveDoc.exists) {
            return { status: 'error', message: 'Executive not found.', stats: null };
        }
        const executiveRaw = executiveDoc.data() || {};
        const executiveParsed = parseExecutiveProfile(executiveRaw);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const executive = (executiveParsed ?? (executiveRaw as any)) as ExecutiveProfile;

        // Stats
        const allNeedsSnapshot = await db.collection('startup-needs').where('status', '==', 'active').get();
        const matchedOpportunities = allNeedsSnapshot.size;

        const applicationsSnapshot = await db.collection('applications').where('executiveId', '==', executiveId).get();
        const totalApplications = applicationsSnapshot.size;
        const awaitingResponse = applicationsSnapshot.docs.filter(doc => ['applied', 'in-review'].includes(doc.data().status)).length;
        const appliedOppIds = new Set(applicationsSnapshot.docs.map(doc => doc.data().startupNeedId));

        const savedOppsSnapshot = await db.collection('executive-profiles').doc(executiveId).collection('saved-opportunities').get();
        const savedOppIds = new Set(savedOppsSnapshot.docs.map(doc => doc.id));

        const profileUpdatedAt = getDate(executive, 'updatedAt');
        let isProfileStale = true;
        let profileUpdatedAtString = null;
        if (profileUpdatedAt) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            isProfileStale = profileUpdatedAt < thirtyDaysAgo;
            profileUpdatedAtString = profileUpdatedAt.toISOString();
        }

        const timesShortlistedSnapshot = await db.collectionGroup('shortlisted-executives').get();
        const timesShortlisted = timesShortlistedSnapshot.docs.filter(doc => doc.id === executiveId).length;


        // Recent Opportunities
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const allRecentNeedsSnapshot = await db.collection('startup-needs')
            .where('updatedAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
            .get();

        const recentNeedsData = allRecentNeedsSnapshot.docs
            .filter(doc => doc.data().status === 'active') // Filter in code
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    roleTitle: data.roleTitle,
                    projectScope: data.roleSummary,
                    createdAt: getTimestamp(data, 'createdAt'),
                    updatedAt: getTimestamp(data, 'updatedAt'),
                    isApplied: appliedOppIds.has(doc.id),
                    isSaved: savedOppIds.has(doc.id),
                } as StartupNeeds & { isApplied?: boolean, isSaved?: boolean };
            });

        const accomplishments = executive.keyAccomplishments?.map(a => a.value).join('; ') || '';
        const executiveProfileString = `Name: ${executive.name}. Expertise: ${executive.expertise}. Industry Experience: ${executive.industryExperience?.join(', ') || ''}. Availability: ${executive.availability}. Desired Compensation: ${executive.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${executive.githubInsights || ''}`;

        const matchPromises = recentNeedsData.map(async startup => {
            const startupNeedsString = `Company: ${startup.companyName}, Project Scope: ${startup.roleSummary}, Budget: ${startup.budget}, Required Expertise: ${Array.isArray(startup.requiredExpertise) ? startup.requiredExpertise.join(', ') : startup.requiredExpertise}, Company Stage: ${startup.companyStage}.`;
            try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
            const result = await matchExecutiveToStartup({ executiveProfile: executiveProfileString, startupNeeds: startupNeedsString });
            return { ...startup, matchScore: result.matchScore, rationale: result.rationale, recommendation: result.recommendation };
        });

        const recentMatches = await Promise.all(matchPromises);
        const sortedMatches = recentMatches.sort((a, b) => {
            const aDate = new Date(a.updatedAt || a.createdAt);
            const bDate = new Date(b.updatedAt || b.createdAt);
            if (bDate.getTime() !== aDate.getTime()) {
                return bDate.getTime() - aDate.getTime();
            }
            return b.matchScore - a.matchScore;
        }).slice(0, 6);

        const stats: ExecutiveDashboardStats = {
            matchedOpportunities,
            totalApplications,
            awaitingResponse,
            isProfileStale,
            profileUpdatedAt: profileUpdatedAtString,
            recentOpportunities: sortedMatches,
            timesShortlisted,
            recentConversations: conversations.conversations?.slice(0, 3) || [],
        };

        return { status: 'success', message: 'Stats fetched successfully.', stats };

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, stats: null };
    }
}

export async function getApplicantsForStartup(startupId: string): Promise<{ status: 'success' | 'error', message: string, applications: ApplicationWithExecutive[] }> {
    const db = admin.firestore();

    try {
        const needsSnapshot = await db.collection('startup-needs').where('creatorId', '==', startupId).get();
        if (needsSnapshot.empty) {
            return { status: 'success', message: 'No needs created by this startup.', applications: [] };
        }
        const needIds = needsSnapshot.docs.map(doc => doc.id);

        const appsSnapshot = await db.collection('applications')
            .where('startupNeedId', 'in', needIds)
            .orderBy('appliedAt', 'desc')
            .get();

        if (appsSnapshot.empty) {
            return { status: 'success', message: 'No applications found for your roles.', applications: [] };
        }

        const executiveIds = [...new Set(appsSnapshot.docs.map(doc => doc.data().executiveId))];
        const executivesSnapshot = await db.collection('executive-profiles').where(admin.firestore.FieldPath.documentId(), 'in', executiveIds).get();
        const executivesMap = new Map<string, ExecutiveProfile>();
        executivesSnapshot.forEach(doc => {
            const execData = doc.data()
            executivesMap.set(doc.id, {
                id: doc.id,
                ...execData,
                keyAccomplishments: execData.keyAccomplishments || [],
                industryExperience: execData.industryExperience || [],
            } as ExecutiveProfile);
        });

        const needsMap = new Map<string, StartupNeeds>();
        needsSnapshot.docs.forEach(doc => {
            needsMap.set(doc.id, { id: doc.id, ...doc.data() } as StartupNeeds);
        });

        const shortlistSnapshot = await db.collection('startup-profiles').doc(startupId).collection('shortlisted-executives').get();
        const shortlistedIds = new Set(shortlistSnapshot.docs.map(doc => doc.id));

        const applicationsPromises = appsSnapshot.docs.map(async (doc) => {
            const appData = doc.data();
            const executive = executivesMap.get(appData.executiveId);
            const startupNeed = needsMap.get(appData.startupNeedId);

            if (!executive || !startupNeed) return null;

            const accomplishments = executive.keyAccomplishments?.map(a => a.value).join('; ') || '';
            const executiveProfileString = `Name: ${executive.name}. Expertise: ${executive.expertise}. Industry Experience: ${executive.industryExperience?.join(', ') || ''}. Availability: ${executive.availability}. Desired Compensation: ${executive.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${executive.githubInsights || ''}`;

            const startupNeedsString = `
                Project Scope: ${startupNeed.roleSummary}.
                Budget: ${startupNeed.budget}.
                Required Expertise: ${Array.isArray(startupNeed.requiredExpertise) ? startupNeed.requiredExpertise.join(', ') : startupNeed.requiredExpertise}.
                Company Stage: ${startupNeed.companyStage}.
                Key Challenges & Dealbreakers: ${startupNeed.keyChallenges || 'Not specified'}.
            `;

            const matchResult = await matchExecutiveToStartup({
                executiveProfile: executiveProfileString,
                startupNeeds: startupNeedsString,
            });

            return {
                id: doc.id,
                status: appData.status,
                appliedAt: getTimestamp(appData, 'appliedAt') || new Date().toISOString(),
                matchScore: matchResult.matchScore,
                executive: {
                    ...executive,
                    isShortlisted: shortlistedIds.has(executive.id),
                    photoUrl: executive.photoUrl || 'https://placehold.co/100x100.png',
                    expertise: executive.expertise || 'No expertise summary provided.',
                    createdAt: getTimestamp(executive, 'createdAt'),
                    updatedAt: getTimestamp(executive, 'updatedAt'),
                },
                startupNeed: {
                    ...startupNeed,
                    roleTitle: startupNeed.roleTitle || "Untitled Role",
                    roleSummary: startupNeed.roleSummary || "",
                    requiredExpertise: Array.isArray(startupNeed.requiredExpertise) ? startupNeed.requiredExpertise.join(', ') : startupNeed.requiredExpertise,
                    createdAt: getTimestamp(startupNeed, 'createdAt'),
                    updatedAt: getTimestamp(startupNeed, 'updatedAt'),
                }
            };
        });

        const applications = (await Promise.all(applicationsPromises))
            .filter(Boolean) as ApplicationWithExecutive[];

        return { status: 'success', message: 'Applications fetched successfully.', applications };

    } catch (error) {
        console.error('Error fetching applications for startup:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, applications: [] };
    }
}


export async function updateApplicationStatus(
    input: {
        applicationId: string;
        status: ApplicationStatus;
        sendMessage: boolean;
        messageContent?: string;
        startupId?: string;
        executiveId?: string;
    }
): Promise<{ status: 'success' | 'error', message: string }> {
    const { applicationId, status, sendMessage, messageContent, startupId, executiveId } = input;
    const db = admin.firestore();
    const applicationRef = db.collection('applications').doc(applicationId);

    try {
        if (sendMessage && messageContent && startupId && executiveId) {
            await startConversation({
                initiator: 'startup',
                startupId: startupId,
                executiveId: executiveId,
                message: messageContent,
            });
        }

        await applicationRef.update({
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        revalidatePath('/startups/candidates');
        revalidatePath('/startups/applicants');
        revalidatePath('/startups/dashboard');
        return { status: 'success', message: 'Application status updated.' };
    } catch (error) {
        console.error('Error updating application status:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message };
    }
}

export async function getStartupDashboardStats(startupId: string): Promise<{ status: 'success' | 'error', message: string, stats: StartupDashboardStats | null }> {
    const db = admin.firestore();
    try {
        const [needsSnapshot, conversations] = await Promise.all([
            db.collection('startup-needs').where('creatorId', '==', startupId).get(),
            getConversationsForUser(startupId)
        ]);

        const openNeedsCount = needsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
        const needIds = needsSnapshot.docs.map(doc => doc.id);

        let totalApplicants = 0;
        let recentApplicants: ApplicationWithExecutive[] = [];
        let opportunitiesSavedCount = 0;

        if (needIds.length > 0) {
            const allSavedOppsSnapshot = await db.collectionGroup('saved-opportunities')
                .where(admin.firestore.FieldPath.documentId(), 'in', needIds.map(id => `executive-profiles/${id}`)) // This won't work as expected
                .get();

            // This is inefficient, let's fix it later if performance is an issue.
            const allSaved = await db.collectionGroup('saved-opportunities').get();
            allSaved.forEach(doc => {
                if (needIds.includes(doc.id)) {
                    opportunitiesSavedCount++;
                }
            })


            const appsSnapshot = await db.collection('applications')
                .where('startupNeedId', 'in', needIds)
                .get();

            totalApplicants = appsSnapshot.size;

            if (!appsSnapshot.empty) {
                const executiveIds = [...new Set(appsSnapshot.docs.map(doc => doc.data().executiveId))];
                if (executiveIds.length > 0) {
                    const [executivesSnapshot, shortlistSnapshot] = await Promise.all([
                        db.collection('executive-profiles').where(admin.firestore.FieldPath.documentId(), 'in', executiveIds).get(),
                        db.collection('startup-profiles').doc(startupId).collection('shortlisted-executives').get()
                    ]);
                    const shortlistedIds = new Set(shortlistSnapshot.docs.map(doc => doc.id));

                    const executivesMap = new Map<string, ExecutiveProfile>();
                    executivesSnapshot.forEach(doc => {
                        const execData = doc.data();
                        executivesMap.set(doc.id, {
                            id: doc.id,
                            ...execData,
                            photoUrl: execData.photoUrl || 'https://placehold.co/100x100.png',
                            expertise: execData.expertise || 'No expertise summary provided.',
                            industryExperience: execData.industryExperience || [],
                            createdAt: getTimestamp(execData, 'createdAt'),
                            updatedAt: getTimestamp(execData, 'updatedAt'),
                            isShortlisted: shortlistedIds.has(doc.id)
                        } as ExecutiveProfile);
                    });

                    const needsMap = new Map<string, any>();
                    needsSnapshot.forEach(doc => {
                        const needData = doc.data();
                        needsMap.set(doc.id, {
                            id: doc.id,
                            ...needData,
                            roleTitle: needData.roleTitle,
                            roleSummary: needData.roleSummary,
                            requiredExpertise: Array.isArray(needData.requiredExpertise) ? needData.requiredExpertise.join(', ') : needData.requiredExpertise,
                            createdAt: getTimestamp(needData, 'createdAt'),
                            updatedAt: getTimestamp(needData, 'updatedAt'),
                        } as StartupNeeds);

                        // Also, add to the global needs map for easy access
                        needsMap.set(needData.creatorId, { id: needData.creatorId, companyName: needData.companyName, roleTitle: needData.roleTitle, status: needData.status } as Partial<StartupNeeds>);
                    });

                    recentApplicants = ((appsSnapshot.docs.map(doc => {
                        const appData = doc.data();
                        const executive = executivesMap.get(appData.executiveId);
                        const startupNeed = needsMap.get(appData.startupNeedId);
                        if (!executive || !startupNeed) return null;

                        return {
                            id: doc.id,
                            status: appData.status,
                            appliedAt: getTimestamp(appData, 'appliedAt'),
                            executive,
                            startupNeed
                        };
                    }).filter(Boolean)) as ApplicationWithExecutive[]).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()).slice(0, 3);
                }
            }
        }

        const timesShortlistedSnapshot = await db.collection('startup-profiles').doc(startupId).collection('shortlisted-executives').get();
        const timesShortlisted = timesShortlistedSnapshot.size;

        const stats: StartupDashboardStats = {
            openNeedsCount,
            totalApplicants,
            recentApplicants,
            opportunitiesSavedCount,
            timesShortlisted,
            recentConversations: conversations.conversations?.slice(0, 3) || [],
        };

        return { status: 'success', message: 'Stats fetched successfully.', stats };

    } catch (error) {
        console.error('Error fetching startup dashboard stats:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, stats: null };
    }
}


export async function toggleShortlistExecutive(
    startupId: string,
    executiveId: string,
    isCurrentlyShortlisted: boolean
): Promise<{ status: 'success' | 'error', message: string, newState: 'shortlisted' | 'removed' }> {
    const db = admin.firestore();
    const shortlistRef = db
        .collection('startup-profiles')
        .doc(startupId)
        .collection('shortlisted-executives')
        .doc(executiveId);

    try {
        if (!isCurrentlyShortlisted) {
            await shortlistRef.set({ shortlistedAt: admin.firestore.FieldValue.serverTimestamp() });
            revalidatePath(`/startups/dashboard`);
            revalidatePath(`/startups/candidates/${executiveId}`);
            revalidatePath(`/startups/shortlisted`);
            revalidatePath(`/startups/find-talent`);
            revalidatePath(`/startups/applicants`);
            return { status: 'success', message: 'Executive shortlisted.', newState: 'shortlisted' };
        } else {
            await shortlistRef.delete();
            revalidatePath(`/startups/dashboard`);
            revalidatePath(`/startups/candidates/${executiveId}`);
            revalidatePath(`/startups/shortlisted`);
            revalidatePath(`/startups/find-talent`);
            revalidatePath(`/startups/applicants`);
            return { status: 'success', message: 'Executive removed from shortlist.', newState: 'removed' };
        }
    } catch (error) {
        console.error('Error toggling shortlist:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, newState: isCurrentlyShortlisted ? 'shortlisted' : 'removed' };
    }
}

export async function getShortlistedExecutivesForStartup(startupId: string): Promise<{ status: 'success' | 'error', message: string, profiles: ExecutiveProfile[] }> {
    const db = admin.firestore();

    try {
        const [shortlistSnapshot, startupNeedsSnapshot] = await Promise.all([
            db.collection('startup-profiles').doc(startupId).collection('shortlisted-executives').orderBy('shortlistedAt', 'desc').get(),
            db.collection('startup-needs').where('creatorId', '==', startupId).where('status', '==', 'active').get()
        ]);

        if (shortlistSnapshot.empty) {
            return { status: 'success', message: 'No shortlisted executives.', profiles: [] };
        }

        const executiveIds = shortlistSnapshot.docs.map(doc => doc.id);

        if (executiveIds.length === 0) {
            return { status: 'success', message: 'No shortlisted executives.', profiles: [] };
        }

        const [executivesSnapshot, applicationsSnapshot] = await Promise.all([
            db.collection('executive-profiles').where(admin.firestore.FieldPath.documentId(), 'in', executiveIds).get(),
            db.collection('applications').where('executiveId', 'in', executiveIds).get()
        ]);

        const applicationsMap = new Map<string, string>(); // Map executiveId to roleTitle
        applicationsSnapshot.forEach(doc => {
            const appData = doc.data();
            const needForApp = startupNeedsSnapshot.docs.find(needDoc => needDoc.id === appData.startupNeedId);
            if (needForApp) {
                applicationsMap.set(appData.executiveId, needForApp.data().roleTitle);
            }
        });

        const profilesPromises = executivesSnapshot.docs.map(async (doc) => {
            const dataRaw = doc.data() || {};
            const data = parseExecutiveProfile(dataRaw) || (dataRaw as ExecutiveProfile);

            let highestMatchScore = 0;
            if (!startupNeedsSnapshot.empty) {
                const matchScores = await Promise.all(startupNeedsSnapshot.docs.map(async (needDoc) => {
                    const startupNeedRaw = needDoc.data() || {};
                    const startupNeedParsed = parseStartupNeed(startupNeedRaw);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const startupNeed = (startupNeedParsed ?? (startupNeedRaw as any)) as StartupNeeds;

                    const accomplishments = data.keyAccomplishments?.map((a: any) => a.value).join('; ') || '';
                    const executiveProfileString = `Name: ${data.name}. Expertise: ${data.expertise}. Industry Experience: ${data.industryExperience?.join(', ') || ''}. Availability: ${data.availability}. Desired Compensation: ${data.desiredCompensation}. Key Accomplishments: ${accomplishments}. GitHub Insights: ${data.githubInsights || ''}`;

                    const startupNeedsString = `
                        Project Scope: ${startupNeed.roleSummary}.
                        Budget: ${startupNeed.budget}.
                        Required Expertise: ${Array.isArray(startupNeed.requiredExpertise) ? startupNeed.requiredExpertise.join(', ') : startupNeed.requiredExpertise}.
                        Company Stage: ${startupNeed.companyStage}.
                        Key Challenges & Dealbreakers: ${startupNeed.keyChallenges || 'Not specified'}.
                    `;

                    const result = await matchExecutiveToStartup({
                        executiveProfile: executiveProfileString,
                        startupNeeds: startupNeedsString,
                    });
                    return result.matchScore;
                }));
                highestMatchScore = Math.max(...matchScores);
            }

            const shortlistDoc = shortlistSnapshot.docs.find(d => d.id === doc.id);

            return {
                ...data,
                id: doc.id,
                photoUrl: data.photoUrl || 'https://placehold.co/100x100.png',
                expertise: data.expertise || 'No expertise summary provided.',
                industryExperience: data.industryExperience || [],
                updatedAt: getTimestamp(data, 'updatedAt') || undefined,
                createdAt: getTimestamp(data, 'createdAt') || undefined,
                matchScore: highestMatchScore,
                appliedToRoleTitle: applicationsMap.get(doc.id) || null,
                shortlistedAt: getTimestamp(shortlistDoc?.data(), 'shortlistedAt') || undefined,
            } as ExecutiveProfile;
        });

        const profiles = await Promise.all(profilesPromises);

        // Re-sort based on the original shortlist order, as Promise.all doesn't guarantee order
        const sortedProfiles = profiles.sort((a, b) => {
            const aDate = a.shortlistedAt ? new Date(a.shortlistedAt) : 0;
            const bDate = b.shortlistedAt ? new Date(b.shortlistedAt) : 0;
            return bDate.valueOf() - aDate.valueOf();
        });

        return { status: 'success', message: 'Shortlisted profiles fetched.', profiles: sortedProfiles };

    } catch (error) {
        console.error('Error fetching shortlisted executives:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, profiles: [] };
    }
}


export async function handleOAuthSignup(idToken: string, role: 'startup' | 'executive'): Promise<{ status: 'success' | 'error', message: string }> {
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email, name } = decodedToken;

        // Check if user already exists
        const userRecord = await admin.auth().getUser(uid);
        if (userRecord.customClaims?.role) {
            return { status: 'success', message: 'User already has a role.' };
        }

        // Set custom claim for the role
        await admin.auth().setCustomUserClaims(uid, { role });

        // Optionally, create a profile document in Firestore
        if (role === 'executive') {
            await admin.firestore().collection('executive-profiles').doc(uid).set({
                name: name || 'New Executive',
                email: email,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        } else if (role === 'startup') {
            await admin.firestore().collection('startup-profiles').doc(uid).set({
                userName: name || 'New Founder',
                userEmail: email,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }

        revalidatePath('/');
        return { status: 'success', message: 'Role assigned successfully.' };

    } catch (error) {
        console.error('Error handling OAuth signup:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return { status: 'error', message };
    }
}

export async function checkAdmin(uid: string) {
    if (!uid) {
        throw new Error('Unauthorized: No user ID provided.');
    }
    try {
        const userRecord = await admin.auth().getUser(uid);
        if (userRecord.customClaims?.role === 'admin') {
            return;
        }
        throw new Error('Unauthorized: User is not an admin.');
    } catch (error) {
        console.error("Admin check failed for UID:", uid, error);
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            throw error;
        }
        throw new Error('Unauthorized: Could not verify admin status.');
    }
}


export async function getAdminDashboardStats(adminId: string): Promise<{ status: 'success' | 'error', message: string, stats: AdminDashboardStats | null }> {
    try {
        await checkAdmin(adminId);
        const db = admin.firestore();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(sevenDaysAgo);

        const listUsersResult = await admin.auth().listUsers();
        const totalUsers = listUsersResult.users.length;

        const [
            startupsSnapshot,
            executivesSnapshot,
            needsSnapshot,
            newStartupsSnapshot,
            newExecutivesSnapshot,
            newOpportunitiesSnapshot,
            conversations
        ] = await Promise.all([
            db.collection('startup-profiles').get(),
            db.collection('executive-profiles').get(),
            db.collection('startup-needs').get(),
            db.collection('startup-profiles').where('createdAt', '>=', sevenDaysAgoTimestamp).get(),
            db.collection('executive-profiles').where('createdAt', '>=', sevenDaysAgoTimestamp).get(),
            db.collection('startup-needs').where('createdAt', '>=', sevenDaysAgoTimestamp).get(),
            getConversationsForUser(adminId),
        ]);

        const stats: AdminDashboardStats = {
            totalUsers: totalUsers,
            totalStartups: startupsSnapshot.size,
            totalExecutives: executivesSnapshot.size,
            newStartups: newStartupsSnapshot.size,
            newExecutives: newExecutivesSnapshot.size,
            newOpportunities: newOpportunitiesSnapshot.size,
            recentConversations: conversations.conversations?.slice(0, 3) || [],
        };

        return { status: 'success', message: 'Stats fetched successfully.', stats };
    } catch (error: any) {
        console.error('Error fetching admin dashboard stats:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message, stats: null };
    }
}

type PromoteUserFormState = {
    status: 'idle' | 'success' | 'error';
    message: string;
};

export async function promoteUserToAdminByEmail(
    adminId: string,
    prevState: PromoteUserFormState,
    formData: FormData
): Promise<PromoteUserFormState> {
    try {
        await checkAdmin(adminId);
        const email = formData.get('email') as string;
        const emailSchema = z.string().email('Please enter a valid email address.');

        const validatedEmail = emailSchema.safeParse(email);
        if (!validatedEmail.success) {
            return { status: 'error', message: validatedEmail.error.errors[0].message };
        }

        const user = await admin.auth().getUserByEmail(validatedEmail.data);
        if (user.customClaims?.role === 'admin') {
            return { status: 'error', message: 'This user is already an admin.' };
        }

        await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

        revalidatePath('/admin/dashboard');

        return { status: 'success', message: `Successfully promoted ${email} to admin.` };
    } catch (error: any) {
        console.error('Error promoting user:', error);
        if (error.code === 'auth/user-not-found') {
            return { status: 'error', message: 'User with that email address not found.' };
        }
        const message = error.message || 'An unknown error occurred.';
        return { status: 'error', message };
    }
}



export async function getAdminAllUsers(adminId: string): Promise<{ status: string, users?: UserListItem[], message: string }> {
    try {
        await checkAdmin(adminId);
        const listUsersResult = await admin.auth().listUsers();
        const users = listUsersResult.users.map(userRecord => {
            return {
                uid: userRecord.uid,
                email: userRecord.email || '',
                name: userRecord.displayName || 'N/A',
                role: (userRecord.customClaims?.role as UserListItem['role']) || null,
                createdAt: new Date(userRecord.metadata.creationTime).toISOString(),
            }
        });
        return { status: 'success', users, message: 'Users fetched' };
    } catch (error: any) {
        console.error("Error in getAdminAllUsers:", error)
        return { status: 'error', message: error.message, users: [] };
    }
}

export async function getAdminAllOpportunities(adminId: string): Promise<{ status: string, needs?: StartupNeeds[], message: string }> {
    try {
        await checkAdmin(adminId);
        const db = admin.firestore();
        const needsSnapshot = await db.collection('startup-needs').orderBy('createdAt', 'desc').get();
        const needs = needsSnapshot.docs.map(doc => {
            const data = doc.data();
            return { ...data, id: doc.id, createdAt: getTimestamp(data, 'createdAt')!, updatedAt: getTimestamp(data, 'updatedAt') } as StartupNeeds;
        });
        return { status: 'success', needs, message: 'Opportunities fetched' };
    } catch (error: any) {
        return { status: 'error', message: error.message };
    }
}

export async function getAdminAllApplications(adminId: string): Promise<{ status: string, applications?: ApplicationWithDetails[], message: string }> {
    try {
        await checkAdmin(adminId);
        const db = admin.firestore();
        const appsSnapshot = await db.collection('applications').orderBy('appliedAt', 'desc').get();

        const needsIds = [...new Set(appsSnapshot.docs.map(d => d.data().startupNeedId))];
        const execIds = [...new Set(appsSnapshot.docs.map(d => d.data().executiveId))];

        const [needsSnapshot, execsSnapshot, startupsSnapshot] = await Promise.all([
            needsIds.length ? db.collection('startup-needs').where(admin.firestore.FieldPath.documentId(), 'in', needsIds).get() : Promise.resolve({ docs: [] } as { docs: any[] }),
            execIds.length ? db.collection('executive-profiles').where(admin.firestore.FieldPath.documentId(), 'in', execIds).get() : Promise.resolve({ docs: [] } as { docs: any[] }),
            db.collection('startup-profiles').get()
        ]);

        const needsMap = new Map<string, any>(needsSnapshot.docs.map((d: any) => [d.id, d.data()]));
        const execsMap = new Map<string, any>(execsSnapshot.docs.map((d: any) => [d.id, d.data()]));
        const startupsMap = new Map<string, any>(startupsSnapshot.docs.map((d: any) => [d.id, d.data()]));


        const applications = appsSnapshot.docs.map(doc => {
            const data = doc.data();
            const need = needsMap.get(data.startupNeedId);
            const exec = execsMap.get(data.executiveId);
            const startup = startupsMap.get(need?.creatorId);

            return {
                id: doc.id,
                executiveId: data.executiveId,
                executiveName: exec?.name || 'N/A',
                startupId: need?.creatorId || 'N/A',
                startupName: startup?.companyName || 'N/A',
                needId: data.startupNeedId,
                roleTitle: need?.roleTitle || 'N/A',
                status: data.status,
                appliedAt: getTimestamp(data, 'appliedAt') || new Date().toISOString(),
            }
        });

        return { status: 'success', applications, message: 'Applications fetched' };
    } catch (error: any) {
        return { status: 'error', message: error.message };
    }
}

export async function getAdminAllShortlisted(adminId: string): Promise<{ status: string, shortlistedItems?: ShortlistedItem[], message: string }> {
    try {
        await checkAdmin(adminId);
        const db = admin.firestore();
        const allShortlistedItems: ShortlistedItem[] = [];

        const allShortlistedDocs = await db.collectionGroup('shortlisted-executives').get();
        if (allShortlistedDocs.empty) {
            return { status: 'success', shortlistedItems: [], message: 'No shortlisted items found.' };
        }

        const startupIds = new Set<string>();
        const executiveIds = new Set<string>();
        allShortlistedDocs.forEach(doc => {
            const pathParts = doc.ref.path.split('/');
            startupIds.add(pathParts[1]);
            executiveIds.add(doc.id);
        });

        const startupsPromise = startupIds.size > 0 ? db.collection('startup-profiles').where(admin.firestore.FieldPath.documentId(), 'in', Array.from(startupIds)).get() : Promise.resolve({ docs: [] } as { docs: any[] });
        const executivesPromise = executiveIds.size > 0 ? db.collection('executive-profiles').where(admin.firestore.FieldPath.documentId(), 'in', Array.from(executiveIds)).get() : Promise.resolve({ docs: [] } as { docs: any[] });

        const [startupsSnapshot, executivesSnapshot] = await Promise.all([startupsPromise, executivesPromise]);

        const startupsMap = new Map<string, StartupProfile>(startupsSnapshot.docs.map((doc: any) => {
            const raw = doc.data() || {};
            const parsed = parseStartupProfile(raw) || (raw as StartupProfile);
            return [doc.id, parsed as StartupProfile];
        }));
        const executivesMap = new Map<string, ExecutiveProfile>(executivesSnapshot.docs.map((doc: any) => {
            const raw = doc.data() || {};
            const parsed = parseExecutiveProfile(raw) || (raw as ExecutiveProfile);
            return [doc.id, parsed as ExecutiveProfile];
        }));


        allShortlistedDocs.forEach(doc => {
            const pathParts = doc.ref.path.split('/');
            const startupId = pathParts[1];
            const executiveId = doc.id;
            const startup = startupsMap.get(startupId);
            const executive = executivesMap.get(executiveId);

            if (startup && executive) {
                allShortlistedItems.push({
                    id: `${startupId}-${executiveId}`,
                    executiveId: executiveId,
                    executiveName: executive.name || 'N/A',
                    startupId: startupId,
                    startupName: startup.companyName || 'N/A',
                    shortlistedAt: getTimestamp(doc.data() || {}, 'shortlistedAt') || new Date().toISOString(),
                });
            }
        });

        allShortlistedItems.sort((a, b) => new Date(b.shortlistedAt).getTime() - new Date(a.shortlistedAt).getTime());

        return { status: 'success', shortlistedItems: allShortlistedItems, message: 'Shortlisted items fetched' };
    } catch (error: any) {
        return { status: 'error', message: error.message };
    }
}

export async function getAdminAllSaved(adminId: string): Promise<{ status: string, savedItems?: SavedItem[], message: string }> {
    try {
        await checkAdmin(adminId);
        const db = admin.firestore();

        const allSavedItems: SavedItem[] = [];

        const allSavedDocs = await db.collectionGroup('saved-opportunities').get();
        if (allSavedDocs.empty) {
            return { status: 'success', savedItems: [], message: 'No saved items found.' };
        }

        const executiveIds = new Set<string>();
        const allNeedIds = new Set<string>();

        allSavedDocs.forEach(doc => {
            const pathParts = doc.ref.path.split('/');
            const executiveId = pathParts[1];
            const needId = doc.id;
            executiveIds.add(executiveId);
            allNeedIds.add(needId);
        });

        const executivesPromise = executiveIds.size > 0 ? db.collection('executive-profiles').where(admin.firestore.FieldPath.documentId(), 'in', Array.from(executiveIds)).get() : Promise.resolve({ docs: [] } as { docs: any[] });
        const needsPromise = allNeedIds.size > 0 ? db.collection('startup-needs').where(admin.firestore.FieldPath.documentId(), 'in', Array.from(allNeedIds)).get() : Promise.resolve({ docs: [] } as { docs: any[] });

        const [executivesSnapshot, needsSnapshot] = await Promise.all([executivesPromise, needsPromise]);

        const executivesMap = new Map<string, ExecutiveProfile>(executivesSnapshot.docs.map((d: any) => {
            const raw = d.data() || {};
            const parsed = parseExecutiveProfile(raw) || (raw as ExecutiveProfile);
            return [d.id, parsed as ExecutiveProfile];
        }));
        const needsMap = new Map<string, StartupNeeds>(needsSnapshot.docs.map((d: any) => {
            const raw = d.data() || {};
            const parsed = parseStartupNeed(raw) || (raw as StartupNeeds);
            return [d.id, parsed as StartupNeeds];
        }));

        allSavedDocs.forEach(doc => {
            const pathParts = doc.ref.path.split('/');
            const executiveId = pathParts[1];
            const needId = doc.id;
            const executive = executivesMap.get(executiveId);
            const need = needsMap.get(needId);

            allSavedItems.push({
                id: `${executiveId}-${needId}`,
                executiveId,
                executiveName: executive?.name || 'N/A',
                needId,
                roleTitle: need?.roleTitle || 'N/A (Deleted Need)',
                savedAt: getTimestamp(doc.data(), 'savedAt') || new Date().toISOString(),
            });
        });

        allSavedItems.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

        return { status: 'success', savedItems: allSavedItems, message: 'Saved items fetched' };
    } catch (error: any) {
        return { status: 'error', message: error.message };
    }
}

const startConversationInputSchema = z.object({
    initiator: z.enum(['startup', 'executive']),
    startupId: z.string(),
    executiveId: z.string(),
    needId: z.string().optional(),
    message: z.string().optional(),
});

export async function startConversation(input: z.infer<typeof startConversationInputSchema>): Promise<{ status: 'success' | 'error', message: string, conversationId?: string }> {
    const validatedInput = startConversationInputSchema.safeParse(input);
    if (!validatedInput.success) {
        return { status: 'error', message: "Invalid input provided." };
    }
    const { initiator, startupId, executiveId, needId, message } = validatedInput.data;

    const db = admin.firestore();

    try {
        const participants = [startupId, executiveId].sort();
        const conversationQuery = db.collection('conversations')
            .where('participants', '==', participants);

        const querySnapshot = await conversationQuery.get();

        let conversationId: string | undefined;

        const existingConversation = querySnapshot.docs.find(doc => {
            const data = doc.data();
            const docParticipants = data.participants as string[];
            return docParticipants.includes(startupId) && docParticipants.includes(executiveId) && !data.isSupportChannel;
        });

        if (existingConversation) {
            conversationId = existingConversation.id;
        } else {
            const newConversationRef = db.collection('conversations').doc();
            await newConversationRef.set({
                participants,
                startupId,
                executiveId,
                needId: needId || null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                unreadCounts: { [startupId]: 0, [executiveId]: 0 },
            });
            conversationId = newConversationRef.id;
        }

        if (message) {
            await sendMessage({
                conversationId,
                senderId: initiator === 'startup' ? startupId : executiveId,
                text: message,
            });
        }

        revalidatePath(`/startups/inbox`);
        revalidatePath(`/executives/inbox`);
        return { status: 'success', message: 'Conversation ready.', conversationId };

    } catch (error) {
        console.error('Error starting conversation:', error);
        return { status: 'error', message: handleGenkitError(error) };
    }
}

export async function generateInitialMessage(input: { startupId: string, executiveId: string }): Promise<{ status: 'success' | 'error', message?: string }> {
    const db = admin.firestore();
    const { startupId, executiveId } = input;
    try {
        const [startupDoc, executiveDoc] = await Promise.all([
            db.collection('startup-profiles').doc(startupId).get(),
            db.collection('executive-profiles').doc(executiveId).get(),
        ]);

        if (!startupDoc.exists || !executiveDoc.exists) {
            return { status: 'error', message: 'Could not find profile for startup or executive.' };
        }

        const startupRaw = startupDoc.data() || {};
        const startupProfile = parseStartupProfile(startupRaw) || (startupRaw as StartupProfile);
        const executiveRaw = executiveDoc.data() || {};
        const executiveProfile = parseExecutiveProfile(executiveRaw) || (executiveRaw as ExecutiveProfile);

        // Check cache: startup-profiles/{startupId}/generated-messages/{executiveId}
        try {
            const cacheRef = db.collection('startup-profiles').doc(startupId).collection('generated-messages').doc(executiveId);
            const cached = await cacheRef.get();
            if (cached.exists) {
                const cachedData = cached.data() as any;
                if (cachedData && cachedData.messageText) return { status: 'success', message: cachedData.messageText };
            }
        } catch (e) {
            console.debug('[ai] failed to read cached initial message', e);
        }

        try {
            try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
            const messageText = await createIntroductionMessage({
                startupName: startupProfile.companyName || '',
                executiveName: executiveProfile.name || '',
                startupMission: startupProfile.shortDescription || '',
                startupChallenge: startupProfile.currentChallenge || '',
                executiveExpertise: executiveProfile.expertise || '',
                executiveAccomplishment: executiveProfile.keyAccomplishments?.[0]?.value || 'their impressive background',
            });

            // Persist generated message (best-effort)
            try {
                const cacheRef = db.collection('startup-profiles').doc(startupId).collection('generated-messages').doc(executiveId);
                await cacheRef.set({ messageText, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            } catch (e) {
                console.debug('[ai] failed to persist generated initial message', e);
            }

            return { status: 'success', message: messageText };
        } catch (e: any) {
            if (e && e.status === 429) {
                console.warn('[ai] quota exceeded generating initial message, returning fallback');
                try { emitMetric('matching.ai_quota_fallback', 1); } catch (m) { /* noop */ }
                // Compose a safe fallback message so the user still gets a useful starter
                const fallbackText = `Hi ${executiveProfile.name || 'there'},\n\nI'm reaching out from ${startupProfile.companyName || 'a startup'} because we're tackling ${startupProfile.currentChallenge || 'an exciting challenge'} and your background in ${executiveProfile.expertise || 'relevant expertise'} caught our eye. Would you be open to a quick conversation to explore fit?\n\nThanks!`;
                // Persist fallback (best-effort)
                try {
                    const cacheRef = db.collection('startup-profiles').doc(startupId).collection('generated-messages').doc(executiveId);
                    await cacheRef.set({ messageText: fallbackText, createdAt: admin.firestore.FieldValue.serverTimestamp(), fallback: true });
                } catch (pe) {
                    console.debug('[ai] failed to persist fallback initial message', pe);
                }
                return { status: 'success', message: fallbackText };
            }
            throw e;
        }

    } catch (error) {
        console.error('Error generating initial message:', error);
        return { status: 'error', message: handleGenkitError(error) };
    }
}

export async function generateFollowUpMessage(input: { executiveId: string, needId: string }): Promise<{ status: 'success' | 'error', message?: string }> {
    const db = admin.firestore();
    const { executiveId, needId } = input;
    try {
        const [executiveDoc, needDoc] = await Promise.all([
            db.collection('executive-profiles').doc(executiveId).get(),
            db.collection('startup-needs').doc(needId).get(),
        ]);

        if (!executiveDoc.exists || !needDoc.exists) {
            return { status: 'error', message: 'Could not find profile or role details.' };
        }

        const executiveRaw = executiveDoc.data() || {};
        const executiveProfile = parseExecutiveProfile(executiveRaw) || (executiveRaw as ExecutiveProfile);
        const needRaw = needDoc.data() || {};
        const needParsed = parseStartupNeed(needRaw);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const need = (needParsed ?? (needRaw as any)) as StartupNeeds;

        // Check cache: startup-needs/{needId}/generated-messages/{executiveId}
        try {
            const cacheRef = db.collection('startup-needs').doc(needId).collection('generated-messages').doc(executiveId);
            const cached = await cacheRef.get();
            if (cached.exists) {
                const cachedData = cached.data() as any;
                if (cachedData && cachedData.messageText) return { status: 'success', message: cachedData.messageText };
            }
        } catch (e) {
            console.debug('[ai] failed to read cached follow-up message', e);
        }

        try {
            try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
            const messageText = await createFollowUpMessage({
                executiveName: executiveProfile.name || '',
                startupName: need.companyName || '',
                roleTitle: need.roleTitle || '',
                executiveExpertise: executiveProfile.expertise || '',
            });

            try {
                const cacheRef = db.collection('startup-needs').doc(needId).collection('generated-messages').doc(executiveId);
                await cacheRef.set({ messageText, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            } catch (e) {
                console.debug('[ai] failed to persist generated follow-up message', e);
            }

            return { status: 'success', message: messageText };
        } catch (e: any) {
            if (e && e.status === 429) {
                console.warn('[ai] quota exceeded generating follow-up message, returning fallback');
                return { status: 'error', message: 'AI quota exceeded. Please try again later.' };
            }
            throw e;
        }

    } catch (error) {
        console.error('Error generating follow-up message:', error);
        return { status: 'error', message: handleGenkitError(error) };
    }
}


const ADMIN_ID = 'sensei_seek_admin';

export async function getConversationsForUser(userId: string): Promise<{ status: 'success' | 'error', message: string, conversations?: ConversationWithRecipient[] }> {
    const db = admin.firestore();
    try {
        const userConversationsSnapshot = await db.collection('conversations')
            .where('participants', 'array-contains', userId)
            .orderBy('lastMessageAt', 'desc')
            .get();

        const broadcastSnapshot = await db.collection('broadcasts')
            .orderBy('createdAt', 'desc')
            .get();

        const userConversations: ConversationWithRecipient[] = [];

        const allUserIds = new Set<string>();
        userConversationsSnapshot.docs.forEach(doc => {
            doc.data().participants.forEach((p: string) => allUserIds.add(p));
        });

        let userRecords: auth.UserRecord[] = [];
        if (allUserIds.size > 0) {
            userRecords = (await admin.auth().getUsers(Array.from(allUserIds).map(uid => ({ uid })))).users;
        }

        const recipientsMap = new Map<string, { name: string, avatarUrl?: string, role: string | null }>();
        recipientsMap.set(ADMIN_ID, { name: 'Sensei Seek Support', role: 'admin' });

        userRecords.forEach(user => {
            recipientsMap.set(user.uid, { name: user.displayName || user.email || 'Unknown User', role: user.customClaims?.role || null });
        });

        // This is a bit inefficient, but needed to get avatars for now
        const startupProfiles = await db.collection('startup-profiles').get();
        startupProfiles.forEach(doc => {
            const raw = doc.data() || {};
            const data = parseStartupProfile(raw) || (raw as StartupProfile);
            const existing = recipientsMap.get(doc.id);
            if (existing) {
                existing.avatarUrl = data.companyLogoUrl;
            }
        });
        const executiveProfiles = await db.collection('executive-profiles').get();
        executiveProfiles.forEach(doc => {
            const raw = doc.data() || {};
            const data = parseExecutiveProfile(raw) || (raw as ExecutiveProfile);
            const existing = recipientsMap.get(doc.id);
            if (existing) {
                existing.avatarUrl = data.photoUrl;
            }
        });


        if (!userConversationsSnapshot.empty) {
            userConversationsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const recipientId = data.participants.find((p: string) => p !== userId);
                let recipient = recipientsMap.get(recipientId);

                if (data.isSupportChannel && recipientId === ADMIN_ID) {
                    recipient = recipientsMap.get(ADMIN_ID);
                }

                userConversations.push({
                    id: doc.id,
                    ...data,
                    createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                    lastMessageAt: getTimestamp(data, 'lastMessageAt') || new Date().toISOString(),
                    recipientName: recipient?.name || data.guestName || "Unknown User",
                    recipientAvatarUrl: recipient?.avatarUrl,
                } as ConversationWithRecipient);
            });
        }

        const broadcastConversations: ConversationWithRecipient[] = broadcastSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: `broadcast_${doc.id}`,
                participants: [data.senderId, userId],
                lastMessageAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                lastMessageText: data.text,
                recipientName: "Sensei Seek Announcements",
                unreadCounts: {}, // Broadcasts don't have unread counts for individuals
                isBroadcast: true,
            } as ConversationWithRecipient
        })

        const allConvos = [...userConversations, ...broadcastConversations];
        allConvos.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());


        return { status: 'success', message: 'Conversations fetched.', conversations: allConvos };
    } catch (error: any) {
        console.error('Error fetching conversations:', error);
        return { status: 'error', message: error.message };
    }
}

export async function getMessagesForConversation(conversationId: string, currentUserId: string): Promise<{ status: 'success' | 'error', message: string, messages?: Message[] }> {
    const db = admin.firestore();
    try {
        if (conversationId.startsWith('broadcast_')) {
            const broadcastId = conversationId.replace('broadcast_', '');
            const broadcastDoc = await db.collection('broadcasts').doc(broadcastId).get();
            if (!broadcastDoc.exists) {
                return { status: 'error', message: 'Broadcast not found.', messages: [] };
            }
            const data = broadcastDoc.data();
            const message: Message = {
                id: broadcastDoc.id,
                conversationId: conversationId,
                senderId: data?.senderId,
                text: data?.text,
                createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                isReadByRecipient: true, // Broadcasts are always "read"
                isBroadcast: true,
                status: 'delivered',
            } as Message;
            return { status: 'success', message: 'Messages fetched.', messages: [message] };
        }

        const messagesSnapshot = await db.collection('conversations').doc(conversationId).collection('messages').orderBy('createdAt', 'asc').get();

        if (messagesSnapshot.empty) {
            return { status: 'success', message: 'No messages yet.', messages: [] };
        }

        const messages: Message[] = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                conversationId: conversationId,
                senderId: data.senderId,
                text: data.text,
                createdAt: getTimestamp(data, 'createdAt') || new Date().toISOString(),
                isReadByRecipient: data.isReadByRecipient || false,
                isBroadcast: data.isBroadcast || false,
                status: data.isReadByRecipient ? 'read' : 'delivered',
            } as Message;
        });

        return { status: 'success', message: 'Messages fetched.', messages };
    } catch (error: any) {
        console.error('Error fetching messages:', error);
        return { status: 'error', message: error.message };
    }
}

export async function sendMessage(input: { conversationId: string; senderId: string; text: string, isBroadcast?: boolean }): Promise<{ status: 'success' | 'error', message: string }> {
    const db = admin.firestore();
    const { conversationId, senderId, text, isBroadcast = false } = input;

    try {
        const conversationRef = db.collection('conversations').doc(conversationId);
        const messageRef = conversationRef.collection('messages').doc();

        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        await db.runTransaction(async (transaction) => {
            const convoDoc = await transaction.get(conversationRef);
            if (!convoDoc.exists) {
                throw new Error("Conversation does not exist.");
            }
            const convoData = convoDoc.data() || {};
            const recipientId = Array.isArray(convoData.participants) ? convoData.participants.find((p: string) => p !== senderId) : undefined;

            transaction.set(messageRef, {
                senderId,
                text,
                createdAt: timestamp,
                status: 'delivered',
                isReadByRecipient: false,
                isBroadcast: isBroadcast,
            });

            const unreadCountUpdate: { [key: string]: any } = {
                [`unreadCounts.${senderId}`]: 0,
            };
            if (recipientId) {
                unreadCountUpdate[`unreadCounts.${recipientId}`] = admin.firestore.FieldValue.increment(1);
            }

            transaction.update(conversationRef, {
                ...unreadCountUpdate,
                lastMessageText: text.substring(0, 30),
                lastMessageAt: timestamp,
                lastMessageSenderId: senderId,
            });
        });

        revalidatePath(`/inbox`);
        return { status: 'success', message: 'Message sent.' };

    } catch (error: any) {
        console.error("Error sending message:", error);
        return { status: 'error', message: error.message };
    }
}

export async function getUnreadMessageCount(userId: string): Promise<{ status: 'success' | 'error', count: number, message: string }> {
    const db = admin.firestore();
    try {
        const conversationsSnapshot = await db.collection('conversations')
            .where('participants', 'array-contains', userId)
            .get();

        if (conversationsSnapshot.empty) {
            return { status: 'success', count: 0, message: 'No conversations.' };
        }

        let totalUnread = 0;
        conversationsSnapshot.forEach(doc => {
            const data = doc.data();
            // We only count unreads for conversations where the last message was NOT from the current user.
            if (data.lastMessageSenderId !== userId && data.unreadCounts && data.unreadCounts[userId]) {
                totalUnread += data.unreadCounts[userId];
            }
        });

        return { status: 'success', count: totalUnread, message: 'Unread count fetched.' };

    } catch (error: any) {
        console.error("Error getting unread message count:", error);
        return { status: 'error', count: 0, message: error.message };
    }
}

export async function markConversationAsRead(userId: string, conversationId: string): Promise<{ status: 'success' | 'error', message: string }> {
    console.log(`[Server] Starting markConversationAsRead for user: ${userId}, conversation: ${conversationId}`);
    if (conversationId.startsWith('broadcast_')) {
        return { status: 'success', message: 'Broadcasts are always read.' };
    }
    const db = admin.firestore();
    const batch = db.batch();

    try {
        const conversationRef = db.collection('conversations').doc(conversationId);
        batch.update(conversationRef, { [`unreadCounts.${userId}`]: 0 });

        const messagesToUpdateSnapshot = await db.collection('conversations').doc(conversationId).collection('messages')
            .where('senderId', '!=', userId)
            .where('isReadByRecipient', '==', false)
            .get();

        console.log(`[Server] Found ${messagesToUpdateSnapshot.size} messages to mark as read.`);


        if (!messagesToUpdateSnapshot.empty) {
            messagesToUpdateSnapshot.forEach(doc => {
                batch.update(doc.ref, { isReadByRecipient: true });
            });
        }

        await batch.commit();
        console.log(`[Server] Batch commit successful.`);

        revalidatePath('/executives/inbox');
        revalidatePath('/startups/inbox');
        revalidatePath('/admin/inbox');
        return { status: 'success', message: 'Conversation marked as read.' };
    } catch (error: any) {
        console.error('Error marking conversation as read:', error);
        return { status: 'error', message: error.message };
    }
}


type RewriteMessageState = {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    rewrittenText?: string;
};

export async function rewriteMessage(
    prevState: RewriteMessageState,
    data: { currentValue: string }
): Promise<RewriteMessageState> {
    const validatedFields = z.object({ currentValue: z.string().min(1) }).safeParse(data);

    if (!validatedFields.success) {
        return {
            status: 'error',
            message: 'Cannot rewrite an empty message.',
        };
    }

    try {
        try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
        const result = await rewriteMessageFlow({ currentValue: validatedFields.data.currentValue });
        return {
            status: 'success',
            message: 'Message rewritten successfully.',
            rewrittenText: result.rewrittenText,
        };
    } catch (error) {
        return { status: 'error', message: handleGenkitError(error) };
    }
}

export async function generateStatusChangeMessage(input: {
    startupId: string;
    executiveId: string;
    roleTitle: string;
    newStatus: 'in-review' | 'hired' | 'rejected';
}): Promise<{ status: 'success' | 'error', message?: string }> {
    const db = admin.firestore();
    try {
        const [startupDoc, executiveDoc] = await Promise.all([
            db.collection('startup-profiles').doc(input.startupId).get(),
            db.collection('executive-profiles').doc(input.executiveId).get(),
        ]);

        if (!startupDoc.exists || !executiveDoc.exists) {
            return { status: 'error', message: 'Could not find required profiles.' };
        }

        const startupName = startupDoc.data()?.companyName;
        const executiveName = executiveDoc.data()?.name;

        try { emitMetric('matching.ai_calls', 1); } catch (e) { /* noop */ }
        const messageText = await createStatusChangeMessage({
            startupName,
            executiveName,
            roleTitle: input.roleTitle,
            newStatus: input.newStatus,
        });

        return { status: 'success', message: messageText };

    } catch (error) {
        return { status: 'error', message: handleGenkitError(error) };
    }
}

type ContactFormState = {
    status: 'idle' | 'success' | 'error';
    message: string;
};

export async function sendContactMessageToAdmin(
    prevState: ContactFormState,
    formData: FormData
): Promise<ContactFormState> {
    const validatedFields = contactFormSchema.safeParse(Object.fromEntries(formData));

    if (!validatedFields.success) {
        return { status: 'error', message: 'Invalid form data. Please check your inputs.' };
    }

    const { name, email, subject, message } = validatedFields.data;

    try {
        const fullMessage = `Subject: ${subject}\n\n${message}\n\nFrom: ${name} (${email})`;

        await startOrGetAdminConversation(`guest_${email.replace(/[@.]/g, '_')}`, fullMessage, name);

        revalidatePath('/admin/inbox');
        return { status: 'success', message: 'Your message has been sent successfully!' };

    } catch (error) {
        console.error('Error sending contact message:', error);
        return { status: 'error', message: 'There was a problem sending your message. Please try again.' };
    }
}


export async function startOrGetAdminConversation(userId: string, initialMessage?: string, guestName?: string): Promise<{ status: 'success' | 'error', message: string, conversationId?: string }> {
    const db = admin.firestore();

    try {
        const participants = [userId, ADMIN_ID].sort();
        const conversationQuery = await db.collection('conversations')
            .where('participants', '==', participants)
            .where('isSupportChannel', '==', true)
            .limit(1)
            .get();

        let conversationId: string;

        if (conversationQuery.empty) {
            const newConversationRef = db.collection('conversations').doc();
            await newConversationRef.set({
                participants,
                isSupportChannel: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                unreadCounts: { [ADMIN_ID]: initialMessage ? 1 : 0, [userId]: 0 },
                ...(guestName && { guestName: guestName }),
            });
            conversationId = newConversationRef.id;
        } else {
            conversationId = conversationQuery.docs[0].id;
        }

        if (initialMessage) {
            await sendMessage({
                conversationId,
                senderId: userId,
                text: initialMessage,
            });
        }

        revalidatePath('/inbox');
        return { status: 'success', message: 'Admin conversation ready.', conversationId };

    } catch (error) {
        console.error('Error starting admin conversation:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return { status: 'error', message };
    }
}

export async function adminStartConversationWithUser(adminId: string, targetUserId: string): Promise<{ status: 'success' | 'error', message: string, conversationId?: string }> {
    const db = admin.firestore();
    try {
        await checkAdmin(adminId);

        if (adminId === targetUserId) {
            return { status: 'error', message: "Cannot start a conversation with yourself." };
        }

        const participants = [adminId, targetUserId].sort();
        const conversationQuery = await db.collection('conversations')
            .where('participants', '==', participants)
            .where('isSupportChannel', '!=', true) // Ensure it's not a support channel
            .limit(1)
            .get();

        let conversationId: string;

        if (conversationQuery.empty) {
            const newConversationRef = db.collection('conversations').doc();
            await newConversationRef.set({
                participants,
                isSupportChannel: false, // Explicitly a direct message
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
                unreadCounts: { [adminId]: 0, [targetUserId]: 0 },
            });
            conversationId = newConversationRef.id;
        } else {
            conversationId = conversationQuery.docs[0].id;
        }

        revalidatePath('/admin/inbox');
        return { status: 'success', message: 'Conversation ready.', conversationId };

    } catch (error) {
        console.error('Error starting admin conversation with user:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { status: 'error', message: message };
    }
}

export async function broadcastMessageToAllUsers(
    adminId: string,
    prevState: { status: 'idle' | 'success' | 'error', message: string },
    formData: FormData
): Promise<{ status: 'idle' | 'success' | 'error', message: string }> {
    try {
        await checkAdmin(adminId);
        const message = formData.get('message') as string;

        if (!message || message.trim().length === 0) {
            return { status: 'error', message: 'Broadcast message cannot be empty.' };
        }

        const db = admin.firestore();
        await db.collection('broadcasts').add({
            senderId: ADMIN_ID,
            text: message,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/inbox');
        revalidatePath('/startups/inbox');
        revalidatePath('/executives/inbox');

        return { status: 'success', message: `Broadcast sent successfully.` };

    } catch (error: any) {
        console.error("Error broadcasting message:", error);
        return { status: 'error', message: error.message || 'An unknown error occurred.' };
    }
}
