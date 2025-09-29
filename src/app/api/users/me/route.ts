// src/app/api/users/me/route.ts
import { verifySessionCookie, jsonOk, jsonError } from '@/lib/api-utils';

export async function GET(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        return jsonOk({ uid: (user as any).uid, email: (user as any).email, ...(user as any) });
    } catch (err) {
        return jsonError(String((err as any).message || err), 500);
    }
}
