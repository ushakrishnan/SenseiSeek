import { jsonOk, jsonError, requireAdminHandler } from '@/lib/api-utils';
import aiBreaker from '@/lib/ai-circuit-breaker';

export const GET = requireAdminHandler(async (req: Request, user: any) => {
    try {
        const until = await aiBreaker.getCooldownUntil();
        return jsonOk({ cooldownUntil: until });
    } catch (err) {
        return jsonError('Failed to fetch cooldown state', 500);
    }
});

export const POST = requireAdminHandler(async (req: Request, user: any) => {
    try {
        const body = await req.json().catch(() => ({}));
        const seconds = Number(body.seconds || 60);
        const reason = body.reason || 'manual';
        if (!Number.isFinite(seconds) || seconds <= 0) return jsonError('Invalid seconds', 400);
        const until = Date.now() + Math.round(seconds * 1000);
        await aiBreaker.setCooldownUntil(until, reason);
        return jsonOk({ cooldownUntil: until });
    } catch (err) {
        return jsonError('Failed to set cooldown', 500);
    }
});

export const DELETE = requireAdminHandler(async (req: Request, user: any) => {
    try {
        await aiBreaker.setCooldownUntil(0, 'cleared');
        return jsonOk({ cooldownUntil: 0 });
    } catch (err) {
        return jsonError('Failed to clear cooldown', 500);
    }
});
