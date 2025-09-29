import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '@/lib/client-actions';

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('client-actions adapter', () => {
    it('finishOAuthSignup posts to /api/auth/oauth-signup and returns json', async () => {
        const mockJson = { ok: true, data: { status: 'success' } };
        const fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(mockJson) } as any));
        // @ts-ignore
        global.fetch = fetchMock;

        const res = await client.finishOAuthSignup('token-123', 'startup');
        expect(fetchMock).toHaveBeenCalled();
        expect(res).toEqual(mockJson.data);
    });

    it('postContactMessage posts to /api/contact and returns json', async () => {
        const mockJson = { ok: true, data: { status: 'success', message: 'Sent' } };
        const fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(mockJson) } as any));
        // @ts-ignore
        global.fetch = fetchMock;

        const payload = { name: 'Test', email: 'a@b.com', subject: 'Hi', message: 'Hello' };
        const res = await client.postContactMessage(payload);
        expect(fetchMock).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
        expect(res).toEqual(mockJson.data);
    });

    it('getAdminAllOpportunities fetches admin opportunities with adminId', async () => {
        const mockJson = { ok: true, data: { items: [] } };
        const fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(mockJson) } as any));
        // @ts-ignore
        global.fetch = fetchMock;

        const res = await client.getAdminAllOpportunities('admin-123');
        expect(fetchMock).toHaveBeenCalledWith('/api/admin/opportunities?adminId=admin-123', expect.objectContaining({ credentials: 'include' }));
        expect(res).toEqual(mockJson.data);
    });

    it('postParseResume posts resume text to /api/ai/parse-resume', async () => {
        const mockJson = { ok: true, data: { parsed: {} } };
        const fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(mockJson) } as any));
        // @ts-ignore
        global.fetch = fetchMock;

        const payload = { resume: 'Experienced leader...' };
        const res = await client.postParseResume(payload);
        expect(fetchMock).toHaveBeenCalledWith('/api/ai/parse-resume', expect.objectContaining({ method: 'POST' }));
        expect(res).toEqual(mockJson.data);
    });

    it('postRewriteExecutiveField posts to /api/ai/rewrite-executive and returns json', async () => {
        const mockJson = { ok: true, data: { status: 'success', rewrittenText: '...' } };
        const fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(mockJson) } as any));
        // @ts-ignore
        global.fetch = fetchMock;

        const payload = { fieldName: 'bio', currentValue: 'old' };
        const res = await client.postRewriteExecutiveField(payload);
        expect(fetchMock).toHaveBeenCalledWith('/api/ai/rewrite-executive', expect.objectContaining({ method: 'POST' }));
        expect(res).toEqual(mockJson.data);
    });

    it('postSignup posts signup payload to /api/auth/signup', async () => {
        const mockJson = { ok: true, data: { status: 'created' } };
        const fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(mockJson) } as any));
        // @ts-ignore
        global.fetch = fetchMock;

        const payload = { name: 'Alice', email: 'a@b.com', password: 'pass', role: 'startup' };
        const res = await client.postSignup(payload as any);
        expect(fetchMock).toHaveBeenCalledWith('/api/auth/signup', expect.objectContaining({ method: 'POST' }));
        expect(res).toEqual(mockJson.data);
    });
});
