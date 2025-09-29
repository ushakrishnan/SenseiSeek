# API Specification & Current Surface

Last updated: see `docs/ARCHITECTURE.md` for an implementation overview. This file inventories the current HTTP API surface implemented under `src/app/api/*` and describes the recommended contract for APIs the frontend consumes. It also documents migration progress: many server actions were moved behind App Router endpoints and the client now uses `src/lib/client-actions.ts` to call them.

Quick status
- Many read and write endpoints have been implemented during the App Router migration (see `docs/APP_ROUTER_MIGRATION.md` for a full list).
- Important implemented endpoints: auth/session (create/clear), users/me, startups/needs (CRUD), executives (get/save), conversations endpoints, admin endpoints (promote, broadcast), matching/backfill admin endpoints, and `GET /api/help-content`.
- Recent additions: vector/embedding helpers and admin backfill endpoints (see `scripts/backfill-embeddings.js` and `src/app/api/matching/backfill/*`), Pinecone vector-db adapter (`src/lib/vector-db.ts`), and a Firestore-backed matching cache (`src/lib/matching-cache.ts`).

Usage notes
- Prefer using the `src/lib/client-actions.ts` adapter for client code; it normalizes API envelopes and is covered by unit tests.
- APIs generally respond with an ApiResponse envelope: { ok: true, data: ... } or { ok: false, error: '...' }. Some older routes may return raw arrays for convenience; the client adapter handles both shapes.
- Performance-sensitive AI/matching endpoints may use a vector-first flow (query an ANN index then LLM rerank) and/or return cached results from the matching cache to reduce LLM calls and cost.

Security
- Server routes verify Firebase session cookies or Authorization Bearer tokens where appropriate (see `src/lib/api-utils.ts`). Admin routes require an `admin` custom claim.

API groups (implemented or in-progress)
- Auth & Session: `/api/auth/session` (create/delete), `/api/auth/oauth-signup`
- Users: `/api/users/me`, `/api/users/:id`
- Profiles & Needs: `/api/executives/*`, `/api/startups/*`, `/api/startups/needs/*`
- Matching / Backfill: `/api/matching/*` (inspect missing embeddings, fill, enqueue recompute)
- Conversations / Messaging: `/api/conversations/*`
- Admin: `/api/admin/*`
- AI: `/api/ai/*` (parse-resume, rewrite flows)
- Utilities: `/api/help-content`, `/api/health`

Notes for developers
- Use the Zod schemas in `src/lib/schemas.ts` for validation in new routes.
- Prefer the `jsonOk` / `jsonError` helpers in `src/lib/api-utils.ts` for consistent envelopes.

Migration guidance
- During migration, server actions remained available and server-side routes import them directly; client code should use the HTTP adapter to avoid bundling server-only logic.

The rest of this file historically included a full migration checklist and detailed endpoint-by-endpoint specs; that content is preserved in `docs/APP_ROUTER_MIGRATION.md` and the per-feature docs in `docs/`.

1.1 POST /api/auth/signup
- Purpose: Create a new user account (email/password) and set custom claims (role).
- Auth: public
- Input (JSON or FormData): { email: string, password: string, name: string, role: 'startup'|'executive' }
- Output (200): { status: 'success', message: string }
- Output (4xx/5xx): { status: 'error', message: string, errors?: Record<string,string[]> }
- Frontend usage:
  - `src/app/signup/signup-form.tsx` (calls `signup` server action currently)
- Edge cases: duplicate email, weak password, invalid role, email already registered.
- Tests: happy path, duplicate email error, invalid data schema.

1.2 POST /api/auth/oauth-signup
- Purpose: Complete OAuth signup flow (GitHub, Microsoft), verify ID token and create session cookie.
- Auth: public (accepts provider token)
- Input: { idToken: string, role: 'startup'|'executive' }
- Output: { status: 'success'|'error', message: string }
- Frontend usage:
  - `src/app/signup/role-selection/page.tsx` uses `handleOAuthSignup` and then `createSessionCookie`.
- Edge cases: invalid token, provider not returning email, duplicate account.
- Tests: token validation failures, success path.

1.3 POST /api/auth/session/create
- Purpose: Accept an ID token and create a session cookie (set cookie). (Or reuse `/auth/oauth-signup` to set cookie)
- Auth: public
- Input: { idToken: string }
- Output: { status:'success'|'error', message } and sets `session` httpOnly cookie.
- Frontend usage:
  - `src/app/login/login-form.tsx` calls `createSessionCookie` after sign-in.
- Edge cases: token expired, invalid.

1.4 POST /api/auth/session/clear
- Purpose: Clear session cookie and revoke tokens.
- Auth: requires cookie
- Input: none
- Output: { status:'success'|'error', message }
- Frontend usage: `src/components/header.tsx` logout calls `clearSessionCookie()`


2) Users / Profile Discovery

2.1 GET /api/users/me
- Purpose: Return current authenticated user's basic details and role-specific profile.
- Auth: requires session cookie or Authorization header with the token
- Input: none
- Output: {
    role: 'startup'|'executive'|'admin'|null,
    name: string | null,
    email: string | null,
    profile: Partial<ExecutiveProfile>|Partial<StartupProfile>|null
  }
- Frontend usage: `src/components/auth-provider.tsx`, `src/app/signup/signup-form.tsx`, `src/app/login/login-form.tsx`
- Edge cases: no session, expired session, missing profile doc in Firestore.

2.2 GET /api/users/:id
- Purpose: Public profile lookup (for displaying other users' profiles if permitted).
- Auth: may be public for non-sensitive fields; require auth for private details.
- Input: none
- Output: { status: 'success'|'error', profile: object | null }
- Frontend usage: few; admin pages may use user listing endpoints instead.


3) Profiles (Executive & Startup)

3.1 POST /api/executives
- Purpose: Create or update executive profile for authenticated executive user.
- Auth: requires session and role 'executive'
- Input: JSON body matching `executiveProfileSchema` (use `src/lib/schemas.ts`)
- Output: { status:'success'|'error', message, profileId? }
- Frontend usage:
  - `src/app/(dashboard)/executives/profile/executive-profile-form.tsx` uses `saveExecutiveProfile`.
- Edge cases: validation failure, unauthorized, partial update semantics.

3.2 GET /api/executives/:id
- Purpose: Fetch executive profile by id (used in startups' candidate pages)
- Auth: public for non-sensitive, but some fields may be redacted depending on privacy.
- Output: GetExecutiveProfileState (matches existing server action)
- Frontend usage: `src/app/(dashboard)/startups/candidates/[id]/page.tsx` and candidates listings.

3.3 GET /api/executives?startupId=<id>
- Purpose: List executive profiles relevant to a startup (used by find talent and admin views)
- Frontend usage: `src/app/(dashboard)/startups/find-talent` and others.

3.4 POST /api/startups
- Purpose: Create/update startup profile (role = startup)
- Auth: requires session role 'startup'
- Input: `startupProfileSchema` JSON
- Frontend usage: `src/app/(dashboard)/startups/profile/startup-profile-form.tsx` calls `saveStartupProfile`.

3.5 GET /api/startups/:id
- Purpose: Fetch startup profile
- Frontend usage: startup profile pages and admin views.


4) Startup Needs (Opportunities)

4.1 POST /api/needs
- Purpose: Create new startup need (opportunity)
- Auth: startup role required
- Input: JSON matching `startupNeedsSchema`
- Output: { status, message, id }
- Frontend usage: `src/app/(dashboard)/startups/needs/new/form.tsx` (createStartupNeed)
- Edge cases: validation, defaulting fields, file uploads (if required)

4.2 PUT /api/needs/:id
- Purpose: Update an existing need
- Auth: startup + owner check
- Input: JSON `startupNeedsSchema`
- Frontend usage: edit forms `.../edit/[id]/page.tsx`

4.3 GET /api/needs?creatorId=... or GET /api/needs/:id
- Purpose: List needs by creator or fetch single need
- Frontend usage: `needs-client.tsx`, `page.tsx` that show lists and detail pages

4.4 DELETE /api/needs/:id
- Purpose: Delete the need
- Auth: owner or admin
- Frontend usage: `needs-client.tsx` delete action

4.5 POST /api/needs/:id/status
- Purpose: Update status (active/inactive)
- Input: { status: 'active'|'inactive' }
- Frontend usage: needs list toggles


5) Matching / Search

5.1 GET /api/matches/startup/:startupId
- Purpose: Run the matching flow (server-side AI) and return sorted matches for a startup-need.
- Auth: startup or owner/admin
- Input: optionally query params: needId (string)
- Output: { status, message, matches: MatchResult[] }
- Frontend usage: `src/app/(dashboard)/startups/find-talent` and applicant flow (findMatchesForStartup)
- Implementation note: This can be synchronous but may be slow; consider async job queue and return jobId for heavy requests.

5.2 GET /api/matches/executive/:executiveId
- Purpose: Matches for an executive across active opportunities (uses GenKit flows)
- Frontend usage: `src/app/(dashboard)/executives/opportunities/find` (findMatchesForExecutive)


6) Applications, Saving, Shortlist

6.1 POST /api/opportunities/:id/save
- Purpose: Toggle saved state for current executive user
- Auth: executive
- Input: { saved: boolean }
- Output: { status, message }
- Frontend usage: `saved-opportunities-client.tsx`, `find-opportunities-client.tsx`

6.2 POST /api/opportunities/:id/apply
- Purpose: Executive applies for opportunity
- Auth: executive
- Input: { executiveId: string } (or derive from session)
- Output: application object or status
- Frontend usage: `opportunity-client.tsx` apply button (applyForOpportunity)

6.3 GET /api/applications?executiveId=... or /api/applications?startupId=...
- Purpose: List applications for dashboards
- Frontend usage: `.../applications-client.tsx`, admin pages

6.4 PATCH /api/applications/:id
- Purpose: Update application status (startup or admin)
- Auth: startup owner or admin
- Input: { status: 'accepted'|'rejected'|'withdrawn'|'interview' etc., note: matches existing ApplicationStatus }
- Frontend usage: `dashboard-client.tsx` for startups

6.5 POST /api/shortlist
- Purpose: Toggle shortlist for executive (startup-specific)
- Input: { startupId, executiveId, shortlist: boolean }
- Frontend usage: `find-talent-client.tsx`, `applicants-client.tsx` (toggleShortlistExecutive)


7) Dashboards & Stats

7.1 GET /api/dashboard/executive/:id
- Purpose: Return stats & summary for executive dashboard (matches, saved count, unread msgs)
- Output: { status, stats }
- Frontend usage: `src/app/(dashboard)/executives/dashboard/dashboard-client.tsx`

7.2 GET /api/dashboard/startup/:id
- Purpose: Startup dashboard stats
- Frontend usage: `.../startups/dashboard/dashboard-client.tsx`

7.3 GET /api/admin/stats
- Purpose: Admin overview stats
- Auth: admin
- Frontend usage: admin dashboard


8) Conversations & Messaging

8.1 POST /api/conversations
- Purpose: Start a conversation (or return existing) between two users.
- Auth: authenticated users
- Input: { participantIds: string[], initialMessage?: string }
- Output: { status, conversationId }
- Frontend usage: `startConversation` usages in multiple pages (see code references)

8.2 GET /api/conversations?userId=...
- Purpose: Return list of conversations for a user
- Output: { status, conversations: ConversationWithRecipient[] }
- Frontend usage: inbox clients `inbox-client.tsx`

8.3 GET /api/conversations/:id/messages
- Purpose: Return messages for the conversation
- Frontend usage: `inbox-client.tsx` uses `getMessagesForConversation`

8.4 POST /api/conversations/:id/messages
- Purpose: Send a message in a conversation
- Input: { senderId, text, isBroadcast? }
- Output: { status, message }
- Frontend usage: various inbox client send handlers (sendMessage)

8.5 GET /api/conversations/:id/unread-count
- Purpose: Return unread message count for a user
- Frontend usage: `auth-provider.tsx` to show unread count

8.6 POST /api/conversations/:id/mark-read
- Purpose: Mark conversation as read for the user
- Input: { userId }
- Frontend usage: when opening conversation


9) Admin Endpoints

9.1 GET /api/admin/users
- Purpose: List users (with pagination)
- Auth: admin
- Frontend usage: `src/app/(dashboard)/admin/users/users-client.tsx`

9.2 POST /api/admin/promote
- Purpose: Promote user to admin by email
- Input: { email }
- Auth: admin
- Frontend usage: admin pages, `promote-admin.js` script could be refactored to call this.

9.3 GET /api/admin/opportunities
- Purpose: List all startup needs

9.4 GET /api/admin/applications
- Purpose: List all applications

9.5 POST /api/admin/broadcast
- Purpose: Admin broadcast message to all users (careful — this is powerful)
- Input: { subject, text }


10) AI / Rewrite / Message generation

10.1 POST /api/ai/parse-resume
- Purpose: Accept resume text and return parsed executive profile fields (calls `executiveProfileFromResume` flow)
- Auth: public (form-driven) or authenticated
- Input: { resume: string }
- Output: { status, fields: Partial<ExecutiveProfile> }
- Frontend usage: resume parsing flows in signup/profile forms (see `parseResume` server action usage)

10.2 POST /api/ai/rewrite-field
- Purpose: Rewrite a field (job description, executive field, startup field) using GenKit flows.
- Input: { type: 'startup'|'executive'|'jobDescription', fieldName: string, text: string, styleHints?: string }
- Output: { status, rewrittenText }
- Frontend usage: inline rewrite/edit actions (`rewriteJobDescriptionField`, `rewriteExecutiveProfileField`, etc.)

10.3 POST /api/ai/generate-message
- Purpose: Generate an initial introduction message or follow-up
- Input: { startupId, executiveId, context?: string }
- Output: { status, messageText }
- Frontend usage: createMessage flows (`createIntroductionMessage`, `createFollowUpMessage`, `createStatusChangeMessage`)

10.4 POST /api/ai/generate-status-change
- Purpose: Generate status-change messages used by startups when changing application status
- Input: { statusFrom, statusTo, candidateName, roleName, reason? }
- Output: { status, message }


11) GitHub insights

11.1 POST /api/github/insights
- Purpose: Accept a GitHub handle or repo URL and return GitHubInsightsState used by executive profiles.
- Input: { githubHandle?: string, repo?: string }
- Output: GithubInsightsState (match the existing helper return shape)
- Frontend usage: `src/components/github-input.tsx` and any place that calls `fetchGithubInsights` (tests in `src/lib/fetchGithubInsights.test.ts`)
- Notes: Rate-limit, cache results, accept either handle or repo url; optionally pass `GITHUB_TOKEN` on server side.


12) Utilities

12.1 GET /api/help-content
- Already implemented at `src/app/api/help-content/route.ts`. Serves `docs/HELP.md`.

12.2 GET /api/health
- Purpose: Simple health check endpoint.
- Returns { status: 'ok', time: ISOString }


Frontend mappings (where to change calls)
- `src/components/auth-provider.tsx`: replace `getUserDetails` and `getUnreadMessageCount` imports with `fetch('/api/users/me')` and `fetch('/api/conversations/<id>/unread-count')` or a single `users/me` that contains unread counts.
- `src/app/signup/signup-form.tsx`: call `POST /api/auth/signup` and then `POST /api/auth/session/create` (or return tokens) instead of directly calling `signup` and `createSessionCookie` server actions.
- `src/app/login/login-form.tsx`: call `POST /api/auth/session/create` and `GET /api/users/me`.
- `src/app/signup/role-selection/page.tsx`: call `POST /api/auth/oauth-signup` and then session endpoints.
- Needs & opportunities pages:
  - `src/app/(dashboard)/startups/needs/needs-client.tsx` → `GET /api/needs?creatorId=` and `DELETE /api/needs/:id`
  - `src/app/(dashboard)/startups/needs/new/form.tsx` → `POST /api/needs`
  - `src/app/(dashboard)/startups/needs/edit/[id]/page.tsx` → `PUT /api/needs/:id`
- Matching & search:
  - `src/app/(dashboard)/executives/opportunities/find` uses `GET /api/matches/executive/:id`.
  - `src/app/(dashboard)/startups/find-talent` uses `GET /api/matches/startup/:id`.
- Profile save/load pages:
  - `saveExecutiveProfile` → `POST /api/executives` (or `PUT`)
  - `saveStartupProfile` → `POST /api/startups`
  - `getExecutiveProfile` and `getStartupProfile` → `GET /api/executives/:id` and `GET /api/startups/:id` respectively
- Applications & Admin pages:
  - `applyForOpportunity` → `POST /api/opportunities/:id/apply`
  - `updateApplicationStatus` → `PATCH /api/applications/:id`
  - Admin listing endpoints → `/api/admin/*`
- Messaging inboxes:
  - `getConversationsForUser` → `GET /api/conversations?userId=`
  - `getMessagesForConversation` → `GET /api/conversations/:id/messages`
  - `sendMessage` → `POST /api/conversations/:id/messages`
  - `startConversation` → `POST /api/conversations`

Security & Auth model
- Session cookie: use Firebase Admin `createSessionCookie` and set an httpOnly cookie named `session` (existing code uses this). API routes should verify it with `admin.auth().verifySessionCookie()` to determine `uid` and `customClaims`.
- For API routes that support both cookie and Authorization header (Bearer idToken), verify both:
  - If `Authorization: Bearer <token>` present verify token with `admin.auth().verifyIdToken()`.
  - Else read `session` cookie and verify via `admin.auth().verifySessionCookie()`.
- Enforce role checks per endpoint (e.g., startup-only endpoints).

Validation & Schemas
- Reuse `src/lib/schemas.ts` and `src/lib/validators.ts` Zod schemas for server-side input validation. Return `400` with a structured error when validation fails.

Performance & Scaling
- GenKit/AI endpoints (matches, message generation, resume parsing) can be slow and expensive. Options:
  - Synchronous but with request timeouts; return 202 + jobId and process async via background worker for large batches.
  - Add caching layer (Redis or Firestore with TTL) for GitHub insights, match results for identical inputs.
- Rate limit GitHub insights and AI endpoints per IP and per user (to prevent abuse).

Logging & Monitoring
- Log request IDs and important events. Use structured JSON logs.
- Monitor error rates on heavy endpoints (AI and GitHub).

Testing
- Unit tests for each API route input validation and happy/error flows (use Jest or the project's test runner).
- End-to-end tests (Playwright) for signup, login, profile save & apply flows.
- Add API contract tests ensuring response shapes (e.g., with Pact or simple JSON schema tests).

Migration plan (step-by-step)
1. Create skeleton API routes under `src/app/api/` for each resource (start with low-risk read endpoints):
   - `GET /api/users/me`, `GET /api/needs/:id`, `GET /api/executives/:id`, `GET /api/startups/:id`, and `GET /api/help-content` (already exists).
   - Implement authentication helper utilities in `src/lib/api-utils.ts` (verifySessionCookie, requireRole, getUidFromRequest) to centralize cookie/token verification.
2. Update frontend read-only pages to call those GET endpoints (non-breaking): replace `getExecutiveProfile(...)` imports with fetch calls. Deploy and test.
3. Implement write endpoints in safe order: `/api/needs` (create/update/delete), `/api/executives`, `/api/startups`, `/api/opportunities/:id/apply`, `/api/opportunities/:id/save`.
4. Migrate inbox/messaging endpoints: `/api/conversations/*` and ensure websockets or polling implementation if required. Keep server action versions intact until migration complete.
5. Migrate AI endpoints and matching flows (these are expensive): implement sync versions first; for long-running flows expose a job-based async API if necessary.
6. Migrate auth flows: implement `POST /api/auth/session/create` to set session cookie and `POST /api/auth/session/clear`. Update frontend login/signup to call these endpoints and stop using server action wrappers.
7. Remove direct server imports from frontend: search and replace `import { ... } from '@/lib/actions'` in client/edge files. Keep the `src/lib/actions.ts` module available for server-only usage during migration, but mark methods as deprecated.
8. Hardening: add rate-limiting, caching, monitoring and add tests.
9. Cutover: when all frontend code uses HTTP APIs and tests are green, remove server actions or refactor `src/lib/actions.ts` into internal services used only by API route handlers (not by the frontend).

Developer checklist for each endpoint
- Add route file at `src/app/api/<resource>/route.ts`.
- Input validation with existing Zod schemas.
- Auth guard via `api-utils.ts`.
- Unit tests for positive and negative paths.
- Integration test with frontend component (optional staging environment).
- Add OpenAPI or Swagger fragment (optional) for documentation.

Operational considerations
- Secrets: ensure `GITHUB_TOKEN`, `FIREBASE_ADMIN_SDK` keys, GenKit API keys are only available server-side (Vercel secrets or env). Never expose them to client.
- CORS: since frontend and API will be same origin for App Router, CORS shouldn't be needed. If the API becomes a separate service, add CORS configuration.
- Rate limits: enforce per-endpoint policies; especially `POST /api/github/insights` and `POST /api/ai/*`.

Estimated implementation effort (rough)
- Phase 1 (read endpoints, utilities): 1-2 days
- Phase 2 (write endpoints for needs/profiles/applications): 2-4 days
- Phase 3 (messaging & admin): 1-2 days
- Phase 4 (AI/matching & GitHub insights with caching): 2-5 days (depends on job queue decision)
- Testing, QA, and deployment: 1-3 days

Appendix: Quick example endpoint spec

POST /api/github/insights
- Input: { githubHandle?: string, repo?: string }
- Auth: optional (but rate-limited per IP/user).
- Output example (200):
{
  status: 'success',
  githubHandle: 'octocat',
  repoCount: 12,
  topLanguages: ['JavaScript','TypeScript'],
  lastActive: '2025-09-20T12:00:00.000Z',
  bio: '...'
}

Error example (400): { status: 'error', message: 'Missing handle or repo' }

---

If you want, next I can:
- Generate skeleton route files for a small subset (e.g., Auth & Users + Help) to show the pattern.
- Or create an OpenAPI/Swagger yaml `docs/api.yaml` from this spec.

Tell me which of the two you'd prefer next, or say "Generate all route skeletons" and I'll scaffold them according to this plan (I will make the changes in code when you confirm).