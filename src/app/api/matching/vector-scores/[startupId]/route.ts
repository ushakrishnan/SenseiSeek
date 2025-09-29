import admin from '@/lib/firebase';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { startupId: string } }) {
    const { startupId } = params;
    const db = admin.firestore();
    const doc = await db.collection('matching-vector-scores').doc(`startup-${startupId}`).get();
    if (!doc.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json(doc.data());
}

export async function POST(req: Request, { params }: { params: { startupId: string } }) {
    const { startupId } = params;
    // enqueue recompute job by creating/marking matching-cache doc dirty
    const db = admin.firestore();
    await db.collection('matching-cache').doc(`startup-${startupId}`).set({ key: startupId, type: 'startup', dirty: true }, { merge: true });
    return NextResponse.json({ enqueued: true });
}

export const dynamic = 'force-dynamic';
