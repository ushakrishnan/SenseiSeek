import { vi } from 'vitest';

test('GET /api/users/me returns 401 without cookie (mocked)', async () => {
    // Mock the api-utils module to avoid loading Firebase admin during tests
    vi.mock('@/lib/api-utils', () => {
        return {
            verifySessionCookie: async () => null,
            jsonOk: (data: any, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status, headers: { 'Content-Type': 'application/json' } }),
            jsonError: (message: string, status = 400) => new Response(JSON.stringify({ ok: false, error: message }), { status, headers: { 'Content-Type': 'application/json' } }),
        };
    });

    const { GET } = await import('../src/app/api/users/me/route');
    const res = await GET(new Request('https://example.com'));
    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(body.ok).toBe(false);
});
