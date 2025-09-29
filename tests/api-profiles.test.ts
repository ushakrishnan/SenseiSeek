import { vi } from 'vitest';

test('POST /api/executives/:id save profile returns 401 without cookie (mocked)', async () => {
    vi.mock('@/lib/api-utils', () => ({
        verifySessionCookie: async () => null,
        jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
        jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
    }));

    vi.mock('@/lib/actions', () => ({
        saveExecutiveProfile: async (id: string, data: any) => ({ status: 'success', message: 'saved' }),
        saveStartupProfile: async (id: string, data: any) => ({ status: 'success', message: 'saved' }),
    }));

    const { POST: execPost } = await import('../src/app/api/executives/[executiveId]/route');
    const res1 = await execPost(new Request('https://example.com', { method: 'POST', body: JSON.stringify({}) }), { params: { executiveId: 'abc' } } as any);
    const body1 = await res1.json();
    expect(typeof body1).toBe('object');
    expect(body1.ok).toBe(false);

    const { POST: startupPost } = await import('../src/app/api/startups/profile/[id]/route');
    const res2 = await startupPost(new Request('https://example.com', { method: 'POST', body: JSON.stringify({}) }), { params: { id: 'abc' } } as any);
    const body2 = await res2.json();
    expect(typeof body2).toBe('object');
    expect(body2.ok).toBe(false);
});
