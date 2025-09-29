import { vi } from 'vitest';

test('GET /api/startups/needs returns 401 without cookie (mocked)', async () => {
    vi.mock('@/lib/api-utils', () => {
        return {
            verifySessionCookie: async () => null,
            jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
            jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
        };
    });
    // Also mock actions to avoid initializing Firebase admin in tests
    vi.mock('@/lib/actions', () => ({
        getStartupNeeds: async (creatorId: string) => ({ status: 'success', message: 'ok', needs: [] }),
    }));

    const { GET } = await import('../src/app/api/startups/needs/route');
    const res = await GET(new Request('https://example.com'));
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body.ok).toBe(false);
});
