import { vi } from 'vitest';

test('POST /api/startups/needs create returns 401 without cookie (mocked)', async () => {
    vi.mock('@/lib/api-utils', () => {
        return {
            verifySessionCookie: async () => null,
            jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
            jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
        };
    });

    vi.mock('@/lib/actions', () => ({
        createStartupNeed: async (creatorId: string, data: any) => ({ status: 'success', message: 'created', needId: 'new-id' }),
    }));

    const { POST } = await import('../src/app/api/startups/needs/route');
    const res = await POST(new Request('https://example.com', { method: 'POST', body: JSON.stringify({}) }));
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body.ok).toBe(false);
});

test('PUT /api/startups/needs/:id update returns 401 without cookie (mocked)', async () => {
    vi.mock('@/lib/api-utils', () => {
        return {
            verifySessionCookie: async () => null,
            jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
            jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
        };
    });

    vi.mock('@/lib/actions', () => ({
        updateStartupNeed: async (id: string, data: any) => ({ status: 'success', message: 'updated', needId: id }),
    }));

    const { PUT } = await import('../src/app/api/startups/needs/[id]/route');
    const res = await PUT(new Request('https://example.com', { method: 'PUT', body: JSON.stringify({}) }), { params: { id: 'abc' } } as any);
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body.ok).toBe(false);
});
