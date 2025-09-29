import { jsonOk, jsonError } from '@/lib/api-utils';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, subject, message } = body || {};
        if (!name || !email || !subject || !message) return jsonError('Missing fields', 400);

        const { sendContactMessageToAdmin } = await import('@/lib/actions');
        const prevState = { status: 'idle', message: '' };
        // sendContactMessageToAdmin expects (prevState, formData) where formData is iterable of [key, value]
        const formEntries: Array<[string, string]> = [['name', name], ['email', email], ['subject', subject], ['message', message]];
        const result = await sendContactMessageToAdmin(prevState as any, formEntries as any);
        if (result?.status === 'success') return jsonOk({ status: 'success', message: result.message });
        return jsonError(result?.message || 'Failed to send message', 500);
    } catch (err) {
        return jsonError(String(err), 500);
    }
}
