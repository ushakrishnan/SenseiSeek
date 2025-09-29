// src/lib/client-actions.ts
const useHttp = (process.env.NEXT_PUBLIC_USE_HTTP_API === 'true') || (process.env.USE_HTTP_API === 'true');

async function unwrapApiResponse(res: Response, fallback: any = null, returnEnvelope = false): Promise<any> {
    const body = await res.json().catch(() => null);
    console.debug(`[client-actions] unwrap status=${res.status} body=`, body);
    // If the server returned an array (raw list), return it directly
    if (Array.isArray(body)) return body;
    // If response looks like our ApiResponse envelope (has `ok`), either return the envelope
    // when requested, or unwrap to the inner `data` value by default to preserve old client contracts.
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok')) {
        if (returnEnvelope) return body;
        // If ok is truthy, return data; otherwise fall back to provided fallback
        return body.ok ? body.data : (fallback !== null ? fallback : {});
    }
    // Otherwise, if there's some JSON payload, return it. If nothing, return the provided fallback or empty object.
    if (body !== null) return body;
    return fallback !== null ? fallback : {};
}

export async function getCurrentUser() {
    if (!useHttp) {
        // Fallback: try server-side import is not available on client; prefer using http.
    }
    const res = await fetch('/api/users/me', { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function postGithubInsights(repo: string) {
    const res = await fetch('/api/github/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function getStartupNeeds(userId?: string) {
    const url = userId ? `/api/startups/needs?userId=${encodeURIComponent(userId)}` : '/api/startups/needs';
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', needs: [] } as any);
}

export async function getStartupNeed(id: string, userId?: string) {
    const url = userId ? `/api/startups/needs/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}` : `/api/startups/needs/${encodeURIComponent(id)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', need: null } as any);
}

export async function getShortlistedExecutivesForStartup(startupId: string) {
    const url = `/api/startups/shortlisted?startupId=${encodeURIComponent(startupId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function createStartupNeed(data: any) {
    const res = await fetch('/api/startups/needs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function updateStartupNeed(id: string, data: any) {
    const res = await fetch(`/api/startups/needs/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function getExecutivesList() {
    const res = await fetch('/api/executives/list', { credentials: 'include' });
    return await unwrapApiResponse(res, [] as any);
}

export async function getExecutiveProfileById(startupIdOrId: string, maybeExecutiveId?: string) {
    // Support two-call signatures for backward compatibility:
    // - getExecutiveProfileById(executiveId)
    // - getExecutiveProfileById(startupId, executiveId)
    let url: string;
    if (maybeExecutiveId) {
        const startupId = startupIdOrId;
        const executiveId = maybeExecutiveId;
        url = `/api/executives/${encodeURIComponent(executiveId)}?startupId=${encodeURIComponent(startupId)}`;
    } else {
        const id = startupIdOrId;
        url = `/api/executives/${encodeURIComponent(id)}`;
    }
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

// Convenience wrapper matching previous server function name used by client code
export async function getExecutiveProfile(executiveId: string) {
    return getExecutiveProfileById(executiveId);
}

export async function getUserDetails(uid: string) {
    const res = await fetch(`/api/users/${encodeURIComponent(uid)}/details`, { credentials: 'include' });
    if (res.status === 401) console.debug('[client-actions] getUserDetails 401');
    return await unwrapApiResponse(res, null);
}

export async function getUnreadMessageCount(uid: string) {
    const res = await fetch(`/api/users/${encodeURIComponent(uid)}/unread-count`, { credentials: 'include' });
    if (res.status === 401) console.debug('[client-actions] getUnreadMessageCount 401');
    return await unwrapApiResponse(res, { status: 'error' as const, count: 0, message: 'Failed to fetch' } as any);
}

export async function createSessionCookie(idToken: string) {
    const res = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }), credentials: 'include' });
    // Keep raw body because this route can set cookies; still attempt to parse JSON safely.
    const body = await res.json().catch(() => null);
    console.debug(`[client-actions] createSessionCookie status=${res.status}`);
    if (res.status !== 200) console.debug('[client-actions] createSessionCookie body=', body);
    return body;
}

export async function finishOAuthSignup(idToken: string, role: 'startup' | 'executive') {
    const res = await fetch('/api/auth/oauth-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, role }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function postSignup(payload: { name: string; email: string; password: string; role: 'startup' | 'executive' }) {
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function postContactMessage(payload: { name: string; email: string; subject: string; message: string }) {
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function deleteStartupNeed(id: string) {
    const res = await fetch(`/api/startups/needs/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function updateStartupNeedStatus(id: string, status: 'active' | 'inactive') {
    const res = await fetch(`/api/startups/needs/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function saveExecutiveProfile(id: string, data: any) {
    const res = await fetch(`/api/executives/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

// Saved opportunities (executive side)
export async function toggleSaveOpportunity(executiveId: string, startupNeedId: string, isCurrentlySaved: boolean) {
    const res = await fetch(`/api/saved`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ executiveId, startupNeedId, save: !isCurrentlySaved }), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to toggle save', newState: isCurrentlySaved ? 'saved' : 'removed' } as any);
}

export async function getSavedOpportunities(executiveId: string) {
    const url = `/api/executives/${encodeURIComponent(executiveId)}/saved`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', matches: [] } as any);
}

export async function saveStartupProfile(id: string, data: any) {
    const res = await fetch(`/api/startups/profile/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function clearSessionCookie() {
    const res = await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
    try {
        return await res.json();
    } catch (e) {
        return { ok: true };
    }
}

export async function applyForOpportunity(needId: string, executiveId: string) {
    const res = await fetch(`/api/executives/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ needId, executiveId }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function startConversation(payload: any) {
    const res = await fetch(`/api/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to start conversation' } as any);
}

export async function generateFollowUpMessage(payload: { executiveId: string; needId: string }) {
    const res = await fetch(`/api/messages/followup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

// Generate an initial AI introduction message for a startup -> executive
export async function generateInitialMessage(payload: { startupId: string; executiveId: string }) {
    const res = await fetch(`/api/messages/initial`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function getConversationsForUser(userId: string) {
    const url = `/api/conversations?userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', conversations: [] } as any);
}

export async function getMessagesForConversation(conversationId: string, userId?: string) {
    const url = userId ? `/api/conversations/${encodeURIComponent(conversationId)}/messages?userId=${encodeURIComponent(userId)}` : `/api/conversations/${encodeURIComponent(conversationId)}/messages`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', messages: [] } as any);
}

export async function sendMessage(payload: any) {
    // If conversationId is provided, post to that conversation's messages endpoint
    const url = payload && payload.conversationId ? `/api/conversations/${encodeURIComponent(payload.conversationId)}/messages` : `/api/conversations/messages`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to send message' } as any);
}

export async function markConversationAsRead(userId: string, conversationId: string) {
    // API expects POST to /read to mark as read
    const res = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to mark read' } as any);
}

export async function startOrGetAdminConversation(userId: string, subject?: string) {
    // Use /admin/start to align with existing server route
    const res = await fetch(`/api/conversations/admin/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, subject }), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to start admin conversation' } as any);
}

// Admin: fetch all shortlisted items
export async function getAdminAllShortlisted(adminId: string) {
    const url = `/api/admin/shortlisted?adminId=${encodeURIComponent(adminId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

// Admin: fetch all users (proxy to server action)
export async function getAdminAllUsers(adminId: string) {
    const url = `/api/admin/users?adminId=${encodeURIComponent(adminId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function adminStartConversationWithUser(adminId: string, targetUserId: string) {
    const res = await fetch('/api/admin/conversations/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function getAdminDashboardStats(adminId: string) {
    const url = `/api/dashboard/admin/${encodeURIComponent(adminId)}`;
    const res = await fetch(url, { credentials: 'include' });
    const body = await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', stats: null } as any);
    // If the server returned the ApiResponse envelope { ok, data }, unwrap to the inner data
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok') && body.ok && body.data) return body.data;
    return body;
}

export async function promoteUserToAdminByEmail(adminId: string, email: string) {
    const res = await fetch(`/api/admin/promote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId, email }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function broadcastMessageToAllUsers(adminId: string, payload: { message: string }) {
    const res = await fetch(`/api/admin/broadcast`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminId, ...payload }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

// Admin: fetch all opportunities/saved/applications (client adapter wrappers)
export async function getAdminAllOpportunities(adminId: string) {
    const url = `/api/admin/opportunities?adminId=${encodeURIComponent(adminId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function getAdminAllApplications(adminId: string) {
    const url = `/api/admin/applications?adminId=${encodeURIComponent(adminId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function getAdminAllSaved(adminId: string) {
    const url = `/api/admin/saved?adminId=${encodeURIComponent(adminId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function enqueueAiMatch(executiveId: string, needId: string) {
    const res = await fetch('/api/admin/enqueue-ai-match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ executiveId, needId }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function backfillAiMatches(batchSize = 100) {
    const res = await fetch('/api/admin/backfill-ai-matches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchSize }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

// Matching backfill helpers (admin)
export async function fetchMatchingBackfillMissing(kind: 'job' | 'user', limit: number) {
    const res = await fetch('/api/matching/backfill/missing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, limit }), credentials: 'include' });
    return await unwrapApiResponse(res, { ids: [] } as any);
}

export async function fillMatchingBackfill(kind: string, ids: string[]) {
    const res = await fetch('/api/matching/backfill/fill', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, ids }), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

// Executives: list for startup
export async function getAllExecutiveProfiles(startupId: string) {
    const url = `/api/executives/list?startupId=${encodeURIComponent(startupId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, [] as any);
}

export async function getStartupDashboardStats(startupId: string) {
    const url = `/api/dashboard/startup/${encodeURIComponent(startupId)}`;
    const res = await fetch(url, { credentials: 'include' });
    const body = await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', stats: null } as any);
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok') && body.ok && body.data) return body.data;
    return body;
}

export async function getExecutiveDashboardStats(executiveId: string) {
    const url = `/api/dashboard/executive/${encodeURIComponent(executiveId)}`;
    const res = await fetch(url, { credentials: 'include' });
    const body = await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', stats: null } as any);
    if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'ok') && body.ok && body.data) return body.data;
    return body;
}

export async function getApplications(executiveId: string) {
    const url = `/api/applications?executiveId=${encodeURIComponent(executiveId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', applications: [] } as any);
}

// Shortlist toggle
export async function toggleShortlistExecutive(startupId: string, executiveId: string, isCurrentlyShortlisted: boolean) {
    const res = await fetch(`/api/shortlist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startupId, executiveId, shortlist: !isCurrentlyShortlisted }), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to toggle shortlist', newState: isCurrentlyShortlisted ? 'shortlisted' : 'removed' } as any);
}

// Applicants for a startup
export async function getApplicantsForStartup(startupId: string) {
    const url = `/api/applications?startupId=${encodeURIComponent(startupId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to fetch', applications: [] } as any);
}

// Update application status
export async function updateApplicationStatus(payload: any) {
    // payload: { applicationId, status, sendMessage, messageContent, startupId, executiveId }
    const res = await fetch(`/api/applications/${encodeURIComponent(payload.applicationId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to update application status' } as any);
}

// Generate status change message (AI)
export async function generateStatusChangeMessage(payload: { startupId: string; executiveId: string; roleTitle: string; newStatus: 'in-review' | 'hired' | 'rejected' }) {
    const res = await fetch(`/api/ai/generate-status-change`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to generate message', messageContent: '' } as any);
}

// Rewrite a message via AI (used in inbox rewrite flow)
export async function rewriteMessage(payload: { currentValue: string }) {
    const res = await fetch(`/api/ai/rewrite-message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to rewrite', rewrittenText: '' } as any);
}

// Find matches for an executive (used in executive "Find Opportunities")
export async function findMatchesForExecutive(executiveId: string) {
    const url = `/api/executives/find?executiveId=${encodeURIComponent(executiveId)}`;
    const res = await fetch(url, { credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to find matches', matches: [] } as any);
}

// AI flows: parse resume and rewrite fields
export async function postParseResume(payload: { resume: string }) {
    const res = await fetch(`/api/ai/parse-resume`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, null);
}

export async function postRewriteExecutiveField(payload: { fieldName: string; currentValue: string; index?: number }) {
    const res = await fetch(`/api/ai/rewrite-executive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to rewrite executive field' } as any);
}

export async function postRewriteStartupField(payload: { fieldName: string; currentValue: string }) {
    const res = await fetch(`/api/ai/rewrite-startup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to rewrite startup field' } as any);
}

export async function postRewriteJobDescriptionField(payload: { fieldName: string; currentValue: string }) {
    const res = await fetch(`/api/ai/rewrite-job-description`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
    return await unwrapApiResponse(res, { status: 'error' as const, message: 'Failed to rewrite job description field' } as any);
}
