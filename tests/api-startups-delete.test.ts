import { vi } from 'vitest';

test('DELETE /api/startups/needs/:id returns 401 without cookie (mocked)', async () => {
    vi.mock('@/lib/api-utils', () => ({
        verifySessionCookie: async () => null,
        jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
        jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
    }));

    vi.mock('@/lib/actions', () => ({
        deleteStartupNeed: async (id: string) => ({ status: 'success', message: 'deleted' }),
        updateStartupNeedStatus: async (id: string, status: string) => ({ status: 'success', message: 'status-updated' }),
    }));

    const { DELETE } = await import('../src/app/api/startups/needs/[id]/route');
    const res = await DELETE(new Request('https://example.com'), { params: { id: 'abc' } } as any);
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body.ok).toBe(false);
});

test('POST /api/startups/needs/:id status update returns 401 without cookie (mocked)', async () => {
    vi.mock('@/lib/api-utils', () => ({
        verifySessionCookie: async () => null,
        jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
        jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
    }));

    vi.mock('@/lib/actions', () => ({
        updateStartupNeedStatus: async (id: string, status: string) => ({ status: 'success', message: 'status-updated' }),
    }));

    const { POST } = await import('../src/app/api/startups/needs/[id]/route');
    const res = await POST(new Request('https://example.com', { method: 'POST', body: JSON.stringify({ status: 'active' }) }), { params: { id: 'abc' } } as any);
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body.ok).toBe(false);
});
