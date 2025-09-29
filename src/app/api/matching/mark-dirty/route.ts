import { jsonOk, jsonError, requireAdminHandler } from '@/lib/api-utils';
import { markStartupDirty, markCachesDirtyByTag } from '@/lib/matching-cache';
export const POST = requireAdminHandler(async (req: Request/*, user */) => {
    const body = await req.json();
    const { id, tag } = body as any;
    if (!id && !tag) return jsonError('Missing id or tag', 400);

    if (id) {
        await markStartupDirty(id);
        return jsonOk({ id });
    }
    const count = await markCachesDirtyByTag(tag);
    return jsonOk({ tag, count });
});
