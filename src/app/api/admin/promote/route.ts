import { jsonOk, jsonError, verifySessionCookie } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const user = await verifySessionCookie(req);
        if (!user) return jsonError('Not authenticated', 401);
        const body = await req.json();
        const email = body.email as string;
        if (!email) return jsonError('Missing email', 400);
        const { promoteUserToAdminByEmail } = await import('@/lib/actions');
        // promoteUserToAdminByEmail expects (adminId, prevState, formData)
        const prevState = { status: 'idle', message: '' } as any;
        const formData = new FormData();
        formData.append('email', email);
        const result = await promoteUserToAdminByEmail((user as any).uid, prevState, formData as any);
        return jsonOk(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return jsonError(e?.message || String(err), 500);
    }
}
