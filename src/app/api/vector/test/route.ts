import { NextResponse } from 'next/server';
import { upsert, query } from '@/lib/vector-db';

export async function POST(req: Request) {
    try {
        // small deterministic sample vector (dimension must match your Pinecone index)
        const sample = { id: `test-${Date.now()}`, values: Array.from({ length: 8 }, (_, i) => Math.sin(i + Date.now() % 10)), metadata: { test: true } };
        await upsert([sample]);
        const q = await query(sample.values, 3, true);
        return NextResponse.json({ ok: true, upserted: sample.id, query: q });
    } catch (err: unknown) {
        const e = err as { message?: string } | undefined;
        console.error('vector test failed', e);
        return NextResponse.json({ ok: false, error: e?.message || String(err) }, { status: 500 });
    }
}
