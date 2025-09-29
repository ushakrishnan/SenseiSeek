// src/app/api/github/insights/route.ts
import { verifySessionCookie, jsonOk, jsonError } from '@/lib/api-utils';
import { GithubInsightsRequest } from '@/lib/types/api';
import { fetchGithubInsights } from '@/lib/github-insights';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body: GithubInsightsRequest = await req.json();
        if (!body?.repo) return jsonError('Missing repo', 400);
        // fetchGithubInsights expects a prevState and an input; call with an empty prevState.
        const prevState = { formState: 'idle', message: '' } as any;
        const result = await fetchGithubInsights(prevState, { githubHandle: body.repo });
        // If the underlying fetch reported an error, return an HTTP error so callers don't see a 200 with a failed payload
        if (result?.formState === 'error') {
            const msg = result.message || 'Failed to fetch GitHub insights.';
            // Map common messages to better HTTP status codes
            if (msg.toLowerCase().includes('not found')) return jsonError(msg, 404);
            return jsonError(msg, 400);
        }
        // result contains .structured and .insights; return structured when available
        const payload = result.structured || { insights: result.insights };
        return jsonOk(payload);
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
