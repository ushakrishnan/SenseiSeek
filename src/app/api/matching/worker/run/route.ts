import { jsonOk, requireAdminHandler } from '@/lib/api-utils';
import { runRecomputeWorkerOnce } from '@/workers/recompute-matching';

export const POST = requireAdminHandler(async (req: Request, user: any) => {
    const result = await runRecomputeWorkerOnce(`admin:${user.uid}`);
    return jsonOk(result);
});
