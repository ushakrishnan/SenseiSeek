'use server';
/**
 * @fileOverview Matches executive profiles with startup needs using AI.
 *
 * - matchExecutiveToStartup - A function that handles the matching process.
 * - MatchExecutiveToStartupInput - The input type for the matchExecutiveToStartup function.
 * - MatchExecutiveToStartupOutput - The return type for the matchExecutiveToStartup function.
 */

import { ai } from '@/ai/genkit';
import { emitMetric } from '@/lib/metrics';
import { isCooldownActive, trySetCooldownFromError } from '@/lib/ai-circuit-breaker';
import { z } from 'genkit';

const MatchExecutiveToStartupInputSchema = z.object({
  executiveProfile: z.string().describe('The detailed profile of the executive, including expertise, industry experience, availability, desired compensation, and references.'),
  startupNeeds: z.string().describe('The specific executive needs of the startup, including project scope, budget, required expertise, and company stage.'),
});
export type MatchExecutiveToStartupInput = z.infer<typeof MatchExecutiveToStartupInputSchema>;

const MatchExecutiveToStartupOutputSchema = z.object({
  matchScore: z.number().describe('A score indicating the suitability of the executive for the startup, ranging from 0 to 1.'),
  rationale: z.string().describe('An explanation of why the executive is a good or bad match for the startup.'),
  recommendation: z.string().describe('A recommendation on whether to proceed with the executive.'),
});
export type MatchExecutiveToStartupOutput = z.infer<typeof MatchExecutiveToStartupOutputSchema>;

export async function matchExecutiveToStartup(input: MatchExecutiveToStartupInput): Promise<MatchExecutiveToStartupOutput> {
  return matchExecutiveToStartupFlow(input);
}

const matchExecutiveToStartupPrompt = ai.definePrompt({
  name: 'matchExecutiveToStartupPrompt',
  input: { schema: MatchExecutiveToStartupInputSchema },
  output: { schema: MatchExecutiveToStartupOutputSchema },
  prompt: `You are an expert matchmaker connecting executive talent with startup needs.

  Given the following executive profile and startup needs, determine how well they match.

  Executive Profile: {{{executiveProfile}}}

  Startup Needs: {{{startupNeeds}}}

  Provide a matchScore (0 to 1), a rationale, and a recommendation on whether to proceed with the executive.

  Format your response as a JSON object.
  `,
});

const matchExecutiveToStartupFlow = ai.defineFlow(
  {
    name: 'matchExecutiveToStartupFlow',
    inputSchema: MatchExecutiveToStartupInputSchema,
    outputSchema: MatchExecutiveToStartupOutputSchema,
  },
  async input => {
    // Check shared Firestore-backed cooldown first to avoid cross-instance hammering.
    try {
      if (await isCooldownActive()) {
        try { emitMetric('matching.ai_cooldown_hit', 1); } catch (e) { /* noop */ }
        return {
          matchScore: 0.5,
          rationale: 'AI matching temporarily rate-limited (shared cooldown); returning conservative neutral score.',
          recommendation: 'Consider manual review. AI is rate-limited for now.'
        };
      }
    } catch (e) {
      // if circuit breaker check fails, continue with local retry logic
      console.debug('[ai-flow] failed to check shared cooldown', String(e));
    }
    // Wrap the AI prompt call with retries and exponential backoff to handle transient quota/rate-limit errors.
    const maxAttempts = Number(process.env.MATCH_AI_MAX_ATTEMPTS || '3');
    const baseDelayMs = Number(process.env.MATCH_AI_BASE_DELAY_MS || '500'); // initial backoff
    let attempt = 0;
    let lastErr: unknown = undefined;

    while (attempt < maxAttempts) {
      try {
        attempt += 1;
        if (attempt > 1) emitMetric('matching.ai_retries', 1);
        const { output } = await matchExecutiveToStartupPrompt(input);
        // Successful call
        emitMetric('matching.ai_calls', 1);
        return output!;
      } catch (err) {
        lastErr = err;
        emitMetric('matching.ai_errors', 1);

        // Detect quota/429 errors and set a cooldown to prevent repeated retries that exacerbate the issue.
        try {
          const e = err as any;
          const status = e?.status || e?.statusCode || (e?.code ? Number(e.code) : undefined);
          const msg = String(e?.message || e);
          const isQuota = status === 429 || /quota|too many requests|RateLimit/i.test(msg);
          if (isQuota) {
            // Try to honour RetryInfo if present in error details (e.g., 'retryDelay' like '2s')
            let retryDelayMs = 60 * 1000; // default 60s cooldown
            const details = e?.errorDetails || e?.details || e?.error?.details;
            if (Array.isArray(details)) {
              for (const d of details) {
                try {
                  if (d?.retryDelay) {
                    // parse strings like '2s' or '2.5s'
                    const s = String(d.retryDelay || '').trim();
                    const match = s.match(/([0-9]*\.?[0-9]+)s/);
                    if (match) retryDelayMs = Math.max(1000, Math.round(parseFloat(match[1]) * 1000));
                  }
                } catch (_) { /* noop */ }
              }
            }
            // set shared cooldown in Firestore (best-effort)
            try { await trySetCooldownFromError(e, retryDelayMs); } catch (_) { /* noop */ }
            try { emitMetric('matching.ai_quota_cooldown_set', 1); } catch (e) { /* noop */ }
            // don't retry further; return fallback
            break;
          }
        } catch (parseErr) {
          // ignore parse errors and continue with exponential backoff
        }

        // If not a quota error, backoff and retry.
        const delayMs = Math.round(baseDelayMs * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.5));
        // If this was the last attempt, break and return fallback below.
        if (attempt >= maxAttempts) break;
        // Small sleep
        await new Promise(res => setTimeout(res, delayMs));
      }
    }

    // If we reach here, retries exhausted. Log and return a safe fallback so callers can continue.
    console.error('matchExecutiveToStartupFlow: AI call failed after retries', lastErr);
    emitMetric('matching.ai_failed_retries', 1);

    // Provide a conservative fallback: neutral matchScore and an explanation noting degraded mode.
    return {
      matchScore: 0.5,
      rationale: 'AI matching temporarily unavailable; returning conservative neutral score.',
      recommendation: 'Consider manual review. AI errors: see server logs for details.'
    };
  }
);
