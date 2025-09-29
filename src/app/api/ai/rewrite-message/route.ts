import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { rewriteMessage } = await import('@/lib/actions');
        // server action expects a prevState and data; provide a minimal prevState
        const prevState = { status: 'idle' as const, message: '' };
        const result = await rewriteMessage(prevState, { currentValue: body.currentValue });
        return NextResponse.json(result);
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('Error in /api/ai/rewrite-message:', e);
        return NextResponse.json({ status: 'error', message: e?.message || 'Server error' }, { status: 500 });
    }
}
