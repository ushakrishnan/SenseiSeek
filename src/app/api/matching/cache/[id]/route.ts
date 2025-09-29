import { jsonOk, jsonError, requireAdmin } from '@/lib/api-utils';
import { getStartupCacheDoc } from '@/lib/matching-cache';

export async function GET(req: Request) {
    try {
        const user = await requireAdmin(req);
        if (!user) return jsonError('Not authorized', 401);

        const url = new URL(req.url);
        const id = url.searchParams.get('id') || '';
        if (!id) return jsonError('Missing id', 400);

        const doc = await getStartupCacheDoc(id);
        if (!doc) return jsonOk(null);
        return jsonOk(doc.data || null);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('[api/matching/cache/[id]] GET error=', e);
        return jsonError(e?.message || String(err), 500);
    }
}
