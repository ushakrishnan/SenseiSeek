import { NextResponse } from 'next/server';
import { computeEmbedding, writeEmbedding } from '@/lib/embeddings';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, type, text } = body;
        if (!id || !type || (type !== 'user' && type !== 'job')) {
            return NextResponse.json({ ok: false, error: 'Missing id or invalid type' }, { status: 400 });
        }

        const snapshot = text || '';
        const vec = await computeEmbedding(snapshot);
        await writeEmbedding(id, type, snapshot, vec);

        return NextResponse.json({ ok: true, id, type, dim: vec.length });
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        return NextResponse.json({ ok: false, error: e?.message || String(err) }, { status: 500 });
    }
}
