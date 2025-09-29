import { NextResponse } from 'next/server';
import { jsonOk, jsonError } from '@/lib/api-utils';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const executiveId = url.searchParams.get('executiveId');
        const limitParam = url.searchParams.get('limit');
        const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam))) : 50; // default 50, clamp 1..200
        if (!executiveId) return NextResponse.json({ status: 'error', message: 'Missing executiveId', matches: [] }, { status: 400 });

        const { findMatchesForExecutive } = await import('@/lib/actions');
        const result = await findMatchesForExecutive(executiveId, limit);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('Error in /api/executives/find:', e);
        return jsonError(e?.message || 'Server error', 500);
    }
}
