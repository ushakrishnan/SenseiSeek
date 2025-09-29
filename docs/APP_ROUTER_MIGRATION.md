# App Router API Migration Plan 

Last updated: migration batch added vector-first matching, matching cache, and embedding backfill helpers. See `docs/MATCHING_IMPLEMENTATION.md` and `docs/ARCHITECTURE.md` for design notes.

This file is the single executable migration plan for converting server-only logic into App Router HTTP endpoints and rewiring the frontend to use them. It's written so you (or another dev) can follow the numbered steps and PowerShell commands without extra questions.
 - PART B 
 - PART B 

Create the shared server helpers (do these first)
 
 - Notes:
 - If your firebase admin init uses a different export, adjust the `import admin from './firebase'` line.
 - Keep `verifySessionCookie` lightweight 22 it should return `null` on failure.
 
Implementation note: during the most recent migration pass we also added `src/lib/matching-cache.ts`, `src/lib/vector-db.ts` (Pinecone adapter), and server endpoints to upsert embeddings and enqueue background recompute jobs. These are documented in `docs/MATCHING_IMPLEMENTATION.md`.
Completed in this iteration (feature branch `feat/app-router-api`):

- [x] Added read-only endpoints for startups and executives:
  - `GET /api/startups/needs` -> `src/app/api/startups/needs/route.ts`
  - `GET /api/startups/needs/:id` -> `src/app/api/startups/needs/[id]/route.ts`
  - `GET /api/executives/list` -> `src/app/api/executives/list/route.ts`
  - `GET /api/executives/:id` -> `src/app/api/executives/[id]/route.ts`
- [x] Added write endpoints (scaffolded and implemented):
  - `POST /api/startups/needs` -> create startup need (`src/app/api/startups/needs/route.ts`)
  - `PUT /api/startups/needs/:id` -> update startup need (`src/app/api/startups/needs/[id]/route.ts`)
  - `DELETE /api/startups/needs/:id` -> delete startup need (`src/app/api/startups/needs/[id]/route.ts`)
  - `POST /api/startups/needs/:id` -> status update (sub-action) (`src/app/api/startups/needs/[id]/route.ts`)
- [x] Added executive & startup profile endpoints (save/get):
  - `POST /api/executives/:id` -> save executive profile (`src/app/api/executives/[id]/route.ts`)
  - `GET /api/startups/profile/:id` -> get startup profile (`src/app/api/startups/profile/[id]/route.ts`)
  - `POST /api/startups/profile/:id` -> save startup profile (`src/app/api/startups/profile/[id]/route.ts`)
- [x] Added client adapter helpers in `src/lib/client-actions.ts` for the above endpoints (get/create/update/delete/status/save functions).
 - [x] Added client adapter helpers in `src/lib/client-actions.ts` for the above endpoints (get/create/update/delete/status/save functions).
 - [x] Added additional adapter helpers for shortlist/applicants/admin use-cases:
   - `getAdminAllShortlisted(adminId)` -> GET `/api/admin/shortlisted?adminId=`
   - `getAllExecutiveProfiles(startupId)` -> GET `/api/executives/list?startupId=`
   - `toggleShortlistExecutive(startupId, executiveId, isCurrentlyShortlisted)` -> POST `/api/shortlist`
   - `getApplicantsForStartup(startupId)` -> GET `/api/applications?startupId=`
   - `updateApplicationStatus(payload)` -> PATCH `/api/applications/:id`
   - `generateStatusChangeMessage(payload)` -> POST `/api/ai/generate-status-change`
 - [x] Migrated startup profile form to use the HTTP adapter for saving (`saveStartupProfile` in `src/lib/client-actions.ts`) — `src/app/(dashboard)/startups/profile/startup-profile-form.tsx`.
 - [x] Added `createStartupNeed` and `updateStartupNeed` to `src/lib/client-actions.ts` and migrated the startup needs creation/edit form to use the adapter (`src/app/(dashboard)/startups/needs/new/form.tsx`).
 - [x] Migrated additional client components to use the HTTP adapter instead of direct server imports:
   - `src/components/status-toggle.tsx` (uses `updateStartupNeedStatus` via adapter)
   - `src/app/(dashboard)/startups/needs/needs-client.tsx` (uses `getStartupNeeds`, `deleteStartupNeed` via adapter)
   - `src/app/(dashboard)/executives/opportunities/[id]/opportunity-client.tsx` (uses `getStartupNeed`, `applyForOpportunity`, `startConversation`, `generateFollowUpMessage` via adapter)
  - `src/app/(dashboard)/startups/find-talent/find-talent-client.tsx` (uses `getAllExecutiveProfiles`, `toggleShortlistExecutive` via adapter)
  - `src/app/(dashboard)/startups/applicants/candidates-client.tsx` (uses `getApplicantsForStartup`, `updateApplicationStatus`, `generateStatusChangeMessage`, `toggleShortlistExecutive` via adapter)
  - `src/app/(dashboard)/admin/shortlisted/shortlisted-client.tsx` (uses `getAdminAllShortlisted` via adapter)
 - [x] Migrated conversations inbox clients to use the HTTP adapter (prevent server-only code from bundling into the client):
   - `src/app/(dashboard)/executives/inbox/inbox-client.tsx`
   - `src/app/(dashboard)/startups/inbox/inbox-client.tsx`
   - `src/app/(dashboard)/admin/inbox/inbox-client.tsx`
 
  Admin pages migrated in this iteration
  ------------------------------------
  - `src/app/(dashboard)/admin/users/users-client.tsx` now uses `getAdminAllUsers` + `adminStartConversationWithUser` via `src/lib/client-actions.ts`.
  - `src/app/(dashboard)/admin/dashboard/dashboard-client.tsx` now uses `getAdminDashboardStats`, `promoteUserToAdminByEmail`, and `broadcastMessageToAllUsers` via `src/lib/client-actions.ts` (writes proxied through `POST /api/admin/promote` and `POST /api/admin/broadcast`).
  - `src/app/(dashboard)/admin/inbox/inbox-client.tsx` rewrite flow now uses `rewriteMessage` via the client adapter.

  New admin API proxies added (server-side routes under `src/app/api`):
  - `GET /api/admin/users` -> `src/app/api/admin/users/route.ts` (calls server `getAdminAllUsers`)
  - `POST /api/admin/conversations/start` -> `src/app/api/admin/conversations/start/route.ts` (calls server `adminStartConversationWithUser`)
  - `GET /api/dashboard/admin/[adminId]` -> `src/app/api/dashboard/admin/[adminId]/route.ts` (calls server `getAdminDashboardStats`)
  - `POST /api/admin/promote` -> `src/app/api/admin/promote/route.ts` (calls server `promoteUserToAdminByEmail`)
  - `POST /api/admin/broadcast` -> `src/app/api/admin/broadcast/route.ts` (calls server `broadcastMessageToAllUsers`)
 - [x] Migrated additional inbox/shortlist/applicants clients to use the HTTP adapter:
  - `src/app/(dashboard)/startups/find-talent/find-talent-client.tsx` (uses `getAllExecutiveProfiles`, `toggleShortlistExecutive`)
  - `src/app/(dashboard)/startups/applicants/candidates-client.tsx` (uses `getApplicantsForStartup`, `updateApplicationStatus`, `generateStatusChangeMessage`)
  - `src/app/(dashboard)/admin/shortlisted/shortlisted-client.tsx` (uses `getAdminAllShortlisted`)
- [x] Added unit tests (Vitest) that mock server-only initialization and actions so tests run without Firebase credentials:
  - `tests/api-users-me.test.ts`
  - `tests/api-startups.test.ts`
  - `tests/api-executives.test.ts`
  - `tests/api-startups-write.test.ts`
  - `tests/api-startups-delete.test.ts`
  - `tests/api-profiles.test.ts`
  - `tests/conversations-client-actions.test.ts` (conversation adapter unit tests)
  
Tests & Validation
------------------
- All Vitest unit tests pass locally after these changes (previous run: Test Files 9 passed; Tests 19 passed). I ran the test suite after adding the adapter helpers and migrating the three clients to ensure there were no regressions.
- [x] Added a CI workflow (.github/workflows/ci.yml) and OpenAPI generator + Redoc page (static `public/openapi.json` and `src/app/docs/page.tsx`)

Build validation: I ran `npm run build` on the feature branch. The build completed successfully but with non-blocking warnings coming from optional OpenTelemetry exporters and a handlebars usage in a third-party dependency (genkit). These do not break the build; I can silence or isolate them in a follow-up.

Recent commits (high level):

- `feat(api): scaffold api-utils, types, adapter and initial routes (users/me, auth/session, github/insights)`
- `chore(api): add openapi generator, redoc docs page, vitest config and tests`
- `feat(api): add openapi route, adapt executive profile form to use http adapter, add CI workflow`
- `feat(api): add startups and executives read endpoints, adapter helpers and tests`
- `feat(api): add create/update startup needs endpoints and tests`
- `feat(api): add delete and status update for startup needs, adapter helpers and tests`
- `feat(api): add executive/startup profile save endpoints, adapter helpers and tests`

Recent repo scan
----------------

I ran a repository search for direct imports of `@/lib/actions`. These are the remaining places to inspect and migrate (server routes are intentionally importing `actions` in many cases, those are fine; the list below focuses on client-side code that should be updated to use `src/lib/client-actions.ts` so server-only code isn't bundled into the browser):

Files that still import `@/lib/actions` (snapshot):
- `src/app/(dashboard)/executives/profile/executive-profile-form.tsx`
- `src/app/api/startups/needs/route.ts` (server route)
- `src/app/api/startups/needs/[id]/route.ts` (server route)
- `src/app/api/executives/list/route.ts` (server route)
- `src/app/api/executives/[id]/route.ts` (server route)
- `src/app/api/startups/profile/[id]/route.ts` (server route)
- `src/components/auth-provider.tsx`

Note: `src/app/(dashboard)/startups/profile/startup-profile-form.tsx` was manually edited and now uses `saveStartupProfile` from the client adapter for the form submission (so it no longer performs a direct client-side import for saves). It still intentionally imports `rewriteStartupProfileField` from `@/lib/actions` to use via `useActionState` (server action) — this is a deliberate, allowed pattern while the AI rewrite feature remains server-only.
- `src/app/startups/page.tsx`
- `src/app/signup/signup-form.tsx`
- `src/app/signup/role-selection/page.tsx`
- `src/app/login/login-form.tsx`
- `src/app/contact/page.tsx`
- `src/app/(dashboard)/startups/shortlisted/shortlisted-client.tsx`
- `src/app/(dashboard)/startups/needs/[id]/page.tsx`
- `src/app/(dashboard)/startups/profile/startup-profile-form.tsx`
- `src/app/(dashboard)/startups/needs/needs-client.tsx`
- `src/app/(dashboard)/startups/needs/new/form.tsx`
- `src/app/(dashboard)/startups/needs/edit/[id]/page.tsx`
<!-- migrated: src/components/status-toggle.tsx, src/app/(dashboard)/startups/needs/needs-client.tsx, src/app/(dashboard)/executives/opportunities/[id]/opportunity-client.tsx -->
- `src/app/(dashboard)/startups/find-talent/find-talent-client.tsx`
- `src/app/(dashboard)/startups/dashboard/dashboard-client.tsx`
- `src/app/(dashboard)/startups/candidates/[id]/page.tsx`
- `src/app/(dashboard)/startups/applicants/page.tsx`
 - `src/app/(dashboard)/startups/applicants/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/executives/saved/saved-opportunities-client.tsx`
- `src/app/(dashboard)/executives/opportunities/[id]/opportunity-client.tsx`
- `src/app/(dashboard)/executives/opportunities/find/find-opportunities-client.tsx`
- `src/app/(dashboard)/executives/dashboard/dashboard-client.tsx`
- `src/app/(dashboard)/executives/profile/page.tsx`
- `src/app/(dashboard)/admin/users/users-client.tsx`
- `src/app/(dashboard)/admin/shortlisted/shortlisted-client.tsx`
- `src/app/(dashboard)/admin/saved/saved-client.tsx`
- `src/app/(dashboard)/admin/opportunities/opportunities-client.tsx`
- `src/app/(dashboard)/executives/applications/applications-client.tsx`
<!-- inbox clients migrated to client adapter, removed from this snapshot -->
- `src/app/(dashboard)/admin/dashboard/dashboard-client.tsx`
- `src/app/(dashboard)/admin/applications/applications-client.tsx`
- `src/components/status-toggle.tsx`

Notes on that snapshot:
- Server routes under `src/app/api/...` should continue to import `@/lib/actions` (they are server-side). Those are already wrapped or scaffolded to call server logic.
- Client-side pages and `*-client.tsx` components must not import `@/lib/actions` directly — these are the priority targets to switch to `src/lib/client-actions.ts`.

Categorized priority (suggested order):
1. High priority (small surface, user-visible, low-risk):
  - `src/components/status-toggle.tsx` (uses `updateStartupNeedStatus`)
  - `src/app/(dashboard)/executives/opportunities/[id]/opportunity-client.tsx` (opportunity page interactions)
  - `src/app/(dashboard)/startups/needs/needs-client.tsx` and `new/form.tsx` (create/delete/update startup needs)
2. Medium priority (forms and pages that submit data):
  - `src/app/signup/*`, `src/app/login/login-form.tsx`, `src/app/contact/page.tsx`
  - `src/app/(dashboard)/startups/profile/startup-profile-form.tsx`
  - `src/app/(dashboard)/executives/profile/executive-profile-form.tsx` (already migrated)
3. Lower priority (admin pages, dashboards, bulk reads):
  - admin clients and dashboards (`src/app/(dashboard)/admin/**`)

What I changed recently (delta)
- Added Vitest globals to `tsconfig.json` so editor TypeScript no longer flags `test`/`expect` in `tests/`.
- Migrated `src/components/header.tsx` and `src/components/dashboard-header.tsx` to use `clearSessionCookie` from `src/lib/client-actions.ts`.

Immediate next actions (in progress):
1. Automated migration step: replace client imports of `@/lib/actions` with `@/lib/client-actions` for the High priority list (three to five files). I have migrated the following files in this session:
  - `src/components/status-toggle.tsx`
  - `src/app/(dashboard)/executives/opportunities/[id]/opportunity-client.tsx`
  - `src/app/(dashboard)/startups/needs/needs-client.tsx`

2. Add unit tests for the client adapter functions I add or update (e.g., `clearSessionCookie`) to avoid regressions.
3. Next target: migrate `src/app/(dashboard)/startups/profile/startup-profile-form.tsx` to use `saveStartupProfile` from `src/lib/client-actions.ts` (I will update this now). After that I will continue with signup/login/contact forms and the rest of Medium priority.

Manual edits note:
- You made manual edits to `src/app/contact/page.tsx`, `src/app/signup/signup-form.tsx`, and `src/app/login/login-form.tsx`. I preserved server-action usage where forms rely on `useActionState`. Where safe, I updated client-only imports to use the adapter (e.g., `createSessionCookie`, `getUserDetails`).

Completed in this batch:
- Migrated to client adapter: `src/components/status-toggle.tsx`, `src/app/(dashboard)/executives/opportunities/[id]/opportunity-client.tsx`, `src/app/(dashboard)/startups/needs/needs-client.tsx`, `src/components/auth-provider.tsx`, `src/app/login/login-form.tsx` (client imports), and added `GET /api/users/[uid]/details` and `GET /api/users/[uid]/unread-count` routes.
- Migrated startup profile save: `src/app/(dashboard)/startups/profile/startup-profile-form.tsx` now calls `saveStartupProfile` from `src/lib/client-actions.ts` for form submissions (retains `rewriteStartupProfileField` as a server action used via `useActionState`).

- [x] Migrated Contact form to HTTP API + adapter:
  - `POST /api/contact` -> `src/app/api/contact/route.ts` (calls server action `sendContactMessageToAdmin`)
  - `src/app/contact/page.tsx` now submits via `postContactMessage` in `src/lib/client-actions.ts` (client-side fetch)
  - `sendContactMessageToAdmin` remains server-side and is invoked by the route (we pass form entries compatible with the server action signature).

Next immediate action: Completed — startup profile form updated and tests run.

- Tests: `npm test` completed successfully (exit code 0) after the change; unit tests are passing locally.

- Adapter unit tests added (local): `tests/client-actions.test.ts` - tests mock `fetch` to validate `finishOAuthSignup` and `postContactMessage` behavior.

Build validation: `npm run build` completed successfully (non-blocking warnings from optional GenKit/OpenTelemetry integrations remain). The new API routes (including `/api/contact` and `/api/auth/oauth-signup`) were discovered by Next.js.

Next targets (immediate):
1. Migrate client-only parts of auth and contact flows to use `src/lib/client-actions.ts` where safe (priority: `src/app/signup/*` OAuth client flows, `src/app/login/login-form.tsx` client imports already adapted, and `src/app/contact/page.tsx` actions that can be moved off server actions).
2. Add unit tests for newly added adapter functions (start with `clearSessionCookie`, `createSessionCookie`, and `saveStartupProfile`).
3. Continue migrating the remaining high-priority client components (applications, saved/shortlist toggles, applyForOpportunity) in 3–5 file batches, running tests and a build after each batch.

Longer term:
- Improve OpenAPI generator to include all endpoints and regenerate `public/openapi.json`.
- Replace any remaining server action usages in client bundles and remove adapter fallbacks once migration completes.


Next steps I will take now (I'll proceed unless you tell me otherwise):

1. Replace a small set of client components to use the HTTP adapter instead of server-side imports (low-risk):
   - `src/components/github-input.tsx` (already adapted in earlier commit as an example)
   - `src/app/(dashboard)/executives/profile/executive-profile-form.tsx` (update form submit to call `saveExecutiveProfile`)
   - `src/components/header.tsx` and `src/components/dashboard-header.tsx` (logout now uses `clearSessionCookie` via `src/lib/client-actions.ts`)
2. Expand `scripts/generate-openapi.js` to include all new endpoints and regenerate `public/openapi.json`.
3. Migrate the next batch of server actions (applications, saved/shortlist toggle, applyForOpportunity) as read endpoints first, then write with feature flag.
4. Add a small integration test that uses the Firebase Emulator (optional, follow-up) or continue mocking for unit tests.

If you want a different priority, tell me which and I'll switch. Otherwise I'll start by updating the two client components above and adding OpenAPI entries for the new routes.

Update: I updated `src/app/(dashboard)/executives/profile/executive-profile-form.tsx` to use the HTTP adapter `saveExecutiveProfile` and handle the `ApiResponse` shape. This removes the direct server action import from that client component.
Update: I also replaced direct `clearSessionCookie` imports in `src/components/header.tsx` and `src/components/dashboard-header.tsx` to use the client adapter. Additionally, I added Vitest globals to `tsconfig.json` so editor TypeScript stops flagging test globals like `test` and `expect`.
# App Router API Migration Plan — Detailed, Step-by-Step

This file is the single executable migration plan for converting server-only logic into App Router HTTP endpoints and rewiring the frontend to use them. It's written so you (or another dev) can follow the numbered steps and PowerShell commands without extra questions.

Goals (what this achieves):
- Move server-only exports behind well-defined HTTP endpoints under `src/app/api/*/route.ts`.
- Preserve existing behavior while migrating (adapter + feature flag).
- Provide OpenAPI documentation (static or served) and a Redoc UI.
- Provide tests, CI, and a safe rollout strategy.

Assumptions (do not proceed if these are not true):
- Project uses Next.js App Router and TypeScript (check `src/app`).
- Firebase is used for auth (you have server-side Firebase Admin setup accessible from server code).
- The main server logic lives in `src/lib/actions.ts` (and similar files).

If any assumption is false, stop and adjust the steps where noted.

---

How to use this file:
- Follow steps in order. Each step has an exact PowerShell command (where applicable) and example code. Check the checkbox when done.
- If you want me to implement the first steps for you, reply "Scaffold now" and I'll create a feature branch and commit the scaffolding.

---

PART A — Branches, environment, and quick-start

1) Create the migration branch (PowerShell):

```powershell
git checkout -b feat/app-router-api
git push -u origin feat/app-router-api
```

2) Add a feature flag environment variable to `.env.local` (do not commit secrets):

```
USE_HTTP_API=false
```

3) Add a small note to `README.md` under "Development" about `USE_HTTP_API` and the cookie name you will use (e.g., `ss-session`).

---

PART B — Create the shared server helpers (do these first)

Files to create:
- `src/lib/api-utils.ts` (server-only helpers)
- `src/lib/types/api.ts` (shared TypeScript interfaces for API payloads)

Create `src/lib/api-utils.ts` with the exact contents below and adjust imports to your Firebase admin init file (likely `src/lib/firebase.ts`):

```ts
// src/lib/api-utils.ts
import { NextResponse } from 'next/server';
import admin from './firebase'; // adjust if your admin init file is named differently

export type ApiResponse<T = any> = { ok: true; data: T } | { ok: false; error: string };

export function jsonOk<T>(data: T, status = 200) {
  return new NextResponse(JSON.stringify({ ok: true, data } as ApiResponse<T>), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonError(message: string, status = 400) {
  return new NextResponse(JSON.stringify({ ok: false, error: message } as ApiResponse), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Verify the Firebase session cookie named 'ss-session'. Returns Firebase decoded token or null.
export async function verifySessionCookie(req: Request) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/ss-session=([^;]+)/);
    const sessionCookie = match ? match[1] : null;
    if (!sessionCookie) return null;
    const decoded = await admin.auth().verifySessionCookie(sessionCookie, true);
    return decoded; // contains uid, email, etc.
  } catch (err) {
    return null;
  }
}
```

Notes:
- If your firebase admin init uses a different export, adjust the `import admin from './firebase'` line.
- Keep `verifySessionCookie` lightweight — it should return `null` on failure.

Create `src/lib/types/api.ts` and store API request/response interfaces you will reuse. Example starter:

```ts
// src/lib/types/api.ts
export interface GithubInsightsRequest { repo: string };
export interface GithubInsightsResponse { skills: string[]; repoName: string };

export interface ApiError { ok: false; error: string }
export interface ApiOk<T = any> { ok: true; data: T }

export type ApiResponse<T = any> = ApiOk<T> | ApiError;
```

Commit these helper files:

```powershell
git add src/lib/api-utils.ts src/lib/types/api.ts
git commit -m "chore(api): add api-utils and api types"
git push
```

---

PART C — Scaffold the first endpoints (exact files and code)

We will implement three first endpoints: `GET /api/users/me`, `POST /api/auth/session`, `POST /api/github/insights`.

1) `GET /api/users/me`

Create file: `src/app/api/users/me/route.ts`

```ts
// src/app/api/users/me/route.ts
import { verifySessionCookie, jsonOk, jsonError } from '@/lib/api-utils';

export async function GET(req: Request) {
  try {
    const user = await verifySessionCookie(req);
    if (!user) return jsonError('Not authenticated', 401);
    return jsonOk({ uid: user.uid, email: user.email, ...user });
  } catch (err) {
    return jsonError(String(err), 500);
  }
}
```

2) `POST /api/auth/session` — create a session cookie from an ID token

Create file: `src/app/api/auth/session/route.ts`

```ts
// src/app/api/auth/session/route.ts
import admin from '@/lib/firebase'; // adjust path
import { jsonOk, jsonError } from '@/lib/api-utils';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const idToken = body.idToken;
    if (!idToken) return jsonError('Missing idToken', 400);
    // Session cookie duration: 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
    const res = jsonOk({ ok: true });
    // Set cookie in NextResponse
    res.headers.append('Set-Cookie', `ss-session=${sessionCookie}; HttpOnly; Path=/; Max-Age=${Math.floor(expiresIn/1000)}; Secure; SameSite=Lax`);
    return res;
  } catch (err) {
    return jsonError(String(err), 500);
  }
}

export async function DELETE() {
  // Clear cookie
  const res = jsonOk({ ok: true });
  res.headers.append('Set-Cookie', 'ss-session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  return res;
}
```

3) `POST /api/github/insights` — wrapper for existing server logic

Create file: `src/app/api/github/insights/route.ts`

```ts
// src/app/api/github/insights/route.ts
import { verifySessionCookie, jsonOk, jsonError } from '@/lib/api-utils';
import { GithubInsightsRequest, GithubInsightsResponse } from '@/lib/types/api';
import { getGithubInsights } from '@/lib/github-insights';

export async function POST(req: Request) {
  try {
    const user = await verifySessionCookie(req);
    if (!user) return jsonError('Not authenticated', 401);
    const body: GithubInsightsRequest = await req.json();
    if (!body?.repo) return jsonError('Missing repo', 400);
    const data: GithubInsightsResponse = await getGithubInsights(body.repo, { userId: user.uid });
    return jsonOk(data);
  } catch (err) {
    return jsonError(String(err), 500);
  }
}
```

Notes:
- `getGithubInsights` should remain server-only in `src/lib/github-insights.ts`. The route imports it server-side and calls it.
- If `getGithubInsights` requires different params, adapt the wrapper accordingly.

Commit the routes:

```powershell
git add src/app/api/users/me/route.ts src/app/api/auth/session/route.ts src/app/api/github/insights/route.ts
git commit -m "feat(api): add users/me, auth/session, github/insights routes"
git push
```

---

PART D — Adapter & feature-flag for gradual migration

Create an adapter so frontend code can call the same functions while you switch implementations.

Create `src/lib/client-actions.ts` (the frontend imports this instead of directly importing server functions).

```ts
// src/lib/client-actions.ts
const useHttp = process.env.NEXT_PUBLIC_USE_HTTP_API === 'true' || process.env.USE_HTTP_API === 'true';

export async function getCurrentUser(){
  if (!useHttp){
    // During migration fallback: import server helper (if running server-side) OR mock client behaviour
    // ...existing code path placeholder; prefer using fetch during migration
  }
  const res = await fetch('/api/users/me', { credentials: 'include' });
  return res.json();
}

export async function postGithubInsights(repo:string){
  if (!useHttp){
    // fallback to old path if necessary (not recommended long-term)
  }
  const res = await fetch('/api/github/insights', { method: 'POST', headers: { 'Content-Type':'application/json'}, body: JSON.stringify({ repo }), credentials: 'include' });
  return res.json();
}
```

Update frontend code to import from `src/lib/client-actions` instead of server functions.

Example change in `src/components/github-input.tsx` (client component):

```diff
 - import { getGithubInsights } from '@/lib/github-insights';
 + import { postGithubInsights } from '@/lib/client-actions';

 - const data = await getGithubInsights(repo);
 + const data = await postGithubInsights(repo);
```

When ready to flip traffic to the HTTP API, set `USE_HTTP_API=true` (or `NEXT_PUBLIC_USE_HTTP_API=true` for client builds) in your deployment environment.

---

PART E — OpenAPI / Redoc documentation (quick recipe)

Option A — Static `public/openapi.json` generated by a script (recommended initially):

1. Add `scripts/generate-openapi.js` (place under `scripts/`):

```js
// scripts/generate-openapi.js
const fs = require('fs');
const path = require('path');
const out = path.join(process.cwd(), 'public', 'openapi.json');
const openapi = {
  openapi: '3.0.1',
  info: { title: 'SenseiSeek API', version: '1.0.0' },
  paths: {
    '/api/users/me': { get: { summary: 'Get current user', responses: { '200': { description: 'OK' } } } },
    '/api/auth/session': { post: { summary: 'Create session cookie' } },
    '/api/github/insights': { post: { summary: 'Get github insights' } },
  }
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(openapi, null, 2));
console.log('Wrote', out);
```

2. Run:

```powershell
node scripts/generate-openapi.js
```

3. Add a Redoc page: `src/app/docs/page.tsx`

```tsx
export default function DocsPage(){
  return (
    <div style={{height:'100vh'}}>
      <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
      <redoc spec-url="/openapi.json"></redoc>
    </div>
  );
}
```

Option B — Serve OpenAPI JSON from an API route (if you want dynamic spec): implement `src/app/api/openapi/route.ts` that returns the JSON object.

Commit generator and page when ready.

---

PART F — Tests, types, and CI

1. Add a minimal test for `GET /api/users/me` using `vitest` or `jest`. Example with `vitest` (install `vitest` + `@testing-library/react` as needed).

Create `tests/api-users-me.test.ts` (outline):

```ts
import { GET } from '../src/app/api/users/me/route';

test('GET /api/users/me returns 401 without cookie', async () => {
  const res = await GET(new Request('https://example.com'));
  const body = await res.json();
  expect(res.status).toBe(401);
  expect(body.ok).toBe(false);
});
```

2. Add CI workflow `.github/workflows/ci.yml` (snippet):

```yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

---

PART G — Rollout, monitoring, and cleanup

Rollout steps (explicit):
1. Merge the skeleton PR to `main` or `staging` (small PR). Deploy to staging with `USE_HTTP_API=false`.
2. Merge read-only endpoints and update the UI to call them. Flip `USE_HTTP_API=true` in staging and smoke test.
3. Implement write endpoints behind feature flag. Flip per-endpoint when ready.
4. When everything is stable, remove the adapter fallback code and set `NEXT_PUBLIC_USE_HTTP_API=true` in production.

Monitoring: Add logs and an error tracker (Sentry). Track endpoint latency and error rates.

Cleanup: After a successful rollout and a stabilisation window (1–2 weeks), remove legacy server direct-import paths in the frontend and delete dead code.

---

PART H — Final, exhaustive checklist (Follow in order)

- [ ] Create migration branch `feat/app-router-api` and push it
- [ ] Add `USE_HTTP_API=false` to `.env.local` (do not commit env file)
- [ ] Add `src/lib/api-utils.ts` and `src/lib/types/api.ts` (commit)
- [ ] Scaffold route files: `users/me`, `auth/session`, `github/insights` (commit)
- [ ] Create adapter `src/lib/client-actions.ts` and update imports in at least the biggest callers (e.g., `src/components/github-input.tsx`) to use adapter instead of direct imports
- [ ] Add `scripts/generate-openapi.js` and run it to create `public/openapi.json` (or implement `/api/openapi`)
- [ ] Add `src/app/docs/page.tsx` to host Redoc
- [ ] Add tests for new routes and run them locally
- [ ] Add CI workflow to run lint/build/test
 - [x] Add `scripts/generate-openapi.js` and run it to create `public/openapi.json` (or implement `/api/openapi`)
 - [x] Add `src/app/docs/page.tsx` to host Redoc
 - [x] Add tests for new routes and run them locally
 - [x] Add CI workflow to run lint/build/test
- [ ] Deploy to staging with `USE_HTTP_API=false` and validate (smoke tests)
- [ ] Flip `USE_HTTP_API=true` in staging for read-only endpoints and test
- [ ] Migrate write endpoints incrementally with feature flags
- [ ] Monitor for errors and performance regressions
- [ ] Remove legacy server import paths and delete replaced server code
- [ ] Commit final cleanup and merge to `main`

<--- Progress update (automatically recorded) --->

- [x] Create migration branch `feat/app-router-api` and push it
- [x] Add `src/lib/api-utils.ts` and `src/lib/types/api.ts` (commit)
- [x] Scaffold route files: `users/me`, `auth/session`, `github/insights` (commit)
- [x] Create adapter `src/lib/client-actions.ts` (commit)

Build validation: I ran `npm run build` on the feature branch. The build completed successfully but with warnings from optional OpenTelemetry integrations and handlebars requiring a loader. These are non-blocking warnings right now; if you want I can add conditional imports or exclude these instrumentation modules from the client bundle to remove warnings.

Next steps I will take if you want me to continue: mark the OpenAPI generator and docs page, add one unit test for `GET /api/users/me`, and update a small frontend caller (`src/components/github-input.tsx`) to use `src/lib/client-actions.ts` as an example. Reply "continue" to let me proceed, or tell me which of the remaining checklist items to prioritize.


---

Notes & troubleshooting hints
- If cookies are not persisting: verify domain, `Secure`, and `SameSite` settings. In local `localhost` use `SameSite=Lax` and remove `Secure` if not using HTTPS locally (or use a local proxy with HTTPS).
- If you see CORS errors during external testing: App Router routes on same origin don't need CORS; ensure your requests come from the same host and scheme.
- If you run into runtime import issues (server-only modules accidentally imported in client code), examine the import stack trace: any client bundle importing server modules must be replaced with adapter calls.

---

If you want, I will now scaffold the branch and commit the helper files and the three routes listed above (I will:
 - create branch `feat/app-router-api`
 - create `src/lib/api-utils.ts` and `src/lib/types/api.ts`
 - create `src/app/api/users/me/route.ts`, `src/app/api/auth/session/route.ts`, and `src/app/api/github/insights/route.ts`
 - create `src/lib/client-actions.ts` adapter skeleton
 - run `npm run build` to validate and report back)

Reply "Scaffold now" to have me implement the scaffolding and run a build, or reply with changes you want to the step list.
