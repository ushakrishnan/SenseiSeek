import { vi } from 'vitest';

test('GET /api/executives/list returns 401 without cookie (mocked)', async () => {
    vi.mock('@/lib/api-utils', () => {
        return {
            verifySessionCookie: async () => null,
            jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
            jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
        };
    });

    vi.mock('@/lib/actions', () => ({
        getAllExecutiveProfiles: async (startupId: string) => ({ status: 'success', message: 'ok', profiles: [] }),
    }));

    const { GET } = await import('../src/app/api/executives/list/route');
    const res = await GET(new Request('https://example.com'));
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body.ok).toBe(false);
});
