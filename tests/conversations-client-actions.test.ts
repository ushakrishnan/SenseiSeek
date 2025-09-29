import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as client from '@/lib/client-actions';

const originalFetch = global.fetch;

beforeEach(() => {
    global.fetch = vi.fn();
});

afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
});

describe('client-actions conversations adapter', () => {
    it('getConversationsForUser - calls /api/conversations with correct query', async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'c1' }] });

        const res = await client.getConversationsForUser('user-123');

        expect(global.fetch).toHaveBeenCalledWith('/api/conversations?userId=user-123', expect.any(Object));
        expect(res).toEqual([{ id: 'c1' }]);
    });

    it('getMessagesForConversation - calls /api/conversations/{id}/messages', async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'm1' }] });

        const res = await client.getMessagesForConversation('conv-1', 'user-123');

        expect(global.fetch).toHaveBeenCalledWith('/api/conversations/conv-1/messages?userId=user-123', expect.any(Object));
        expect(res).toEqual([{ id: 'm1' }]);
    });

    it('sendMessage - posts to /api/conversations/{id}/messages', async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'm2' }) });

        const payload = { conversationId: 'conv-1', body: 'hi' } as any;
        const res = await client.sendMessage(payload);

        expect(global.fetch).toHaveBeenCalledWith('/api/conversations/conv-1/messages', expect.objectContaining({ method: 'POST', body: JSON.stringify(payload) }));
        expect(res).toEqual({ id: 'm2' });
    });

    it('markConversationAsRead - posts to /api/conversations/{id}/read', async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

        const res = await client.markConversationAsRead('user-123', 'conv-1');

        expect(global.fetch).toHaveBeenCalledWith('/api/conversations/conv-1/read', expect.objectContaining({ method: 'POST' }));
        expect(res).toEqual({ success: true });
    });

    it('startOrGetAdminConversation - posts to /api/conversations/admin/start', async () => {
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'admin-conv' }) });

        const res = await client.startOrGetAdminConversation('user-123', 'help');

        expect(global.fetch).toHaveBeenCalledWith('/api/conversations/admin/start', expect.objectContaining({ method: 'POST' }));
        expect(res).toEqual({ id: 'admin-conv' });
    });
});
