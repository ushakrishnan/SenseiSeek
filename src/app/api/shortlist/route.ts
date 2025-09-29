import { NextResponse } from 'next/server';
import { verifySessionCookie, jsonOk, jsonError } from '@/lib/api-utils';
import { toggleShortlistExecutive } from '@/lib/actions';

export async function POST(request: Request) {
    try {
        const session = await verifySessionCookie(request);
        if (!session) return jsonError('Unauthorized', 401);

        const body = await request.json();
        const { startupId, executiveId, shortlist } = body || {};

        if (!startupId || !executiveId || typeof shortlist !== 'boolean') {
            return jsonError('Missing required parameters', 400);
        }

        const result = await toggleShortlistExecutive(startupId, executiveId, !shortlist);
        return jsonOk(result);
    } catch (err: unknown) {
        console.error('[api/shortlist] error', err);
        // If verifySessionCookie throws an error it may mean unauthorized; mirror that
        return jsonError(err instanceof Error ? err.message : 'Unknown error', 500);
    }
}
