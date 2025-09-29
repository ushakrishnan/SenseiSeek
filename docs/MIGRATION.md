# Migration notes — client-safe actions (App Router HTTP adapter)

Implementation note: recent migration work also added vector/embedding helpers, a Pinecone adapter, and admin backfill endpoints to support vector-first matching and reduce LLM costs. See `docs/MATCHING_IMPLEMENTATION.md` for implementation details.
# Migration notes — client-safe actions (App Router HTTP adapter)

This document explains the incremental migration strategy used to move client code away from importing server-only logic (notably `src/lib/actions.ts`) and toward a client-safe HTTP adapter pattern backed by Next App Router server endpoints.

Summary
 - Keep server-only logic (GenKit/AI flows, firebase-admin, any secrets) inside `src/lib/actions.ts` (server code).
 - Expose minimal HTTP proxy endpoints under `src/app/api/*/route.ts` that call the server actions. These endpoints are server-side and may perform session verification (`verifySessionCookie`) and return JSON via `jsonOk`/`jsonError` helpers.
 - Provide a single client adapter surface at `src/lib/client-actions.ts`. Client components call functions from this adapter which perform `fetch()` calls to the App Router endpoints (`/api/...`) with `credentials: 'include'`.
 - Gate rollout with the environment flags `NEXT_PUBLIC_USE_HTTP_API` / `USE_HTTP_API` where appropriate. The adapter file contains logic to respect this flag. The pattern enables incremental rollouts in small batches (3–5 files) with fast validation using build/typecheck and tests.

Why this pattern
 - Keeps secrets and server-only dependencies out of the client bundle.
 - Allows server actions (AI/GenKit flows) to stay server-side while still being accessible from the browser.
 - Makes incremental migration easy: swap client imports for adapter calls and add a matching App Router proxy route when needed.

What changed in the recent migration batch
 - Added client adapter wrappers in `src/lib/client-actions.ts` for admin lists, AI flows, signup, and many existing endpoints (fetch-based wrappers).
 - Created App Router proxy routes for admin lists and AI flows, plus `/api/auth/signup`. These routes call into `src/lib/actions.ts` on the server and return JSON.
 - Migrated these client components to call the adapter (instead of importing server-only functions):
   - `src/app/(dashboard)/admin/opportunities/opportunities-client.tsx`
   - `src/app/(dashboard)/admin/applications/applications-client.tsx`
   - `src/app/(dashboard)/admin/saved/saved-client.tsx`
   - `src/app/(dashboard)/executives/profile/executive-profile-form.tsx`
   - `src/app/(dashboard)/startups/profile/startup-profile-form.tsx`
   - `src/app/(dashboard)/startups/needs/new/form.tsx`
   - `src/app/signup/signup-form.tsx`
 - Removed a few now-unused client imports (e.g. `useActionState`) from client components.

Remaining server-side imports (expected)
These remaining imports of `@/lib/actions` are in server-side App Router route handlers. They are intentionally server-side and do not need migration:

 - `src/app/api/startups/needs/[id]/route.ts`
 - `src/app/api/executives/[id]/route.ts`
 - `src/app/api/startups/profile/[id]/route.ts`
 - `src/app/api/users/[uid]/details/route.ts`
 - `src/app/api/users/[uid]/unread-count/route.ts`
 - `src/app/api/ai/rewrite-message/route.ts`
 - `src/app/api/executives/find/route.ts`
 - `src/app/api/admin/users/route.ts`
 - `src/app/api/admin/conversations/start/route.ts`
 - `src/app/api/dashboard/admin/[adminId]/route.ts`
 - `src/app/api/admin/promote/route.ts`
 - `src/app/api/admin/broadcast/route.ts`
 - `src/app/api/admin/opportunities/route.ts`
 - `src/app/api/admin/applications/route.ts`
 - `src/app/api/admin/saved/route.ts`
 - `src/app/api/ai/parse-resume/route.ts`
 - `src/app/api/ai/rewrite-executive/route.ts`
 - `src/app/api/ai/rewrite-startup/route.ts`
 - `src/app/api/ai/rewrite-job-description/route.ts`
 - `src/app/api/auth/signup/route.ts`
 - `src/app/api/startups/needs/route.ts`
 - `src/app/api/messages/initial/route.ts`
 - `src/app/api/executives/list/route.ts`
 - `src/app/api/contact/route.ts`
 - `src/app/api/auth/oauth-signup/route.ts`

How to migrate a client file (3–5 file batch)
1. Identify the client file that currently imports a server-only function from `@/lib/actions`.
2. Add a small wrapper in `src/lib/client-actions.ts` that calls the corresponding `/api/...` endpoint using `fetch(..., { credentials: 'include' })`. Use JSON for simple payloads; FormData for file/complex server actions if necessary.
3. Add a server App Router route at `src/app/api/.../route.ts` which imports the server action from `src/lib/actions.ts` and calls it. If the server action expects (prevState, input) or FormData, construct a minimal prevState and convert the JSON body to FormData where needed.
4. Replace the client-side import of the server function with the adapter function. If the client previously used `useActionState` or server form actions, replace the form action with a client `onSubmit` handler that posts to the adapter and manages local state or optimistic UI.
5. Run TypeScript typecheck, Next build, and Vitest to validate:

```powershell
npm run -s typecheck
npm run -s build
npm run -s test
```

6. Commit the change in a small PR (3–5 files) so it’s easy to review and revert if necessary.

Notes & gotchas
 - Server actions sometimes use the `prevState + FormData` signature. App Router proxies should construct a minimal `prevState` (e.g. `{}`) and convert incoming JSON to `FormData` if the server action expects FormData.
 - Keep fetch calls in the adapter using `credentials: 'include'` to preserve session cookies.
 - Feature-flag rollout: the adapter file checks `NEXT_PUBLIC_USE_HTTP_API` / `USE_HTTP_API`. Use this to gate switching clients to the HTTP adapter if you want to toggle gradually.
 - Third-party build warnings (e.g. optional OpenTelemetry exporters or Handlebars loader) may appear during Next builds; they are typically non-blocking but noisy. Triage separately if needed.

Recommended follow-ups
 - Add unit tests for `src/lib/client-actions.ts` wrappers (some tests were added during this batch). Keep tests that mock `fetch` and assert the right URL and method are used.
 - Create a short PR template checklist for migration PRs (build, tests, list of files) to enforce the small-batch discipline.
 - If you want to remove server-side route handlers eventually, plan a separate server-side refactor after client migration is complete.

If you want, I can:
 - Add this migration doc to the repository (done) and open a short PR summarizing the recent file changes, or
 - Immediately update `docs/FEATURES.md` or `docs/TODO.md` instead of a dedicated file.

-- Migration guide generated automatically by the migration agent

## Detailed TODO — finish API-driven migration

This is a prioritized, actionable checklist to finish moving the codebase to a fully API-driven platform (client -> `src/lib/client-actions.ts` -> `/api/*` App Router routes -> `src/lib/actions.ts` server logic). Each item includes a brief description, acceptance criteria, suggested commands, and an estimated effort.

1) CI: add a GitHub Actions workflow (High)
   - Why: ensure every PR runs typecheck, build, and tests so regressions are blocked early.
   - What to do:
     - Add `.github/workflows/ci.yml` that runs: `npm ci`, `npm run -s typecheck`, `npm run -s build`, `npm run -s test`.
   - Acceptance criteria: PRs must pass CI; workflow completes within CI time budget (~10–15m).
   - Command (local):
     - `npm run -s typecheck && npm run -s build && npm run -s test`
   - Est: 1–2h

2) Integration tests for critical API routes (High)
   - Why: unit tests mock fetch; integration tests exercise App Router proxy -> server action behavior.
   - Targets: `/api/auth/signup`, `/api/ai/parse-resume`, `/api/admin/opportunities`, `/api/github/insights`.
   - What to do:
     - Add a lightweight integration test harness (using `node` + `supertest` or `undici` + `next dev` in CI) that starts a dev server and hits endpoints.
     - Alternatively, use Playwright to run end-to-end smoke tests against a running staging deploy.
   - Acceptance criteria: tests hit the real route and assert `200` + expected shape; run in CI as optional workflow or gated job.
   - Est: 4–8h for a minimal set of 3–5 endpoints.

3) API coverage audit (Medium)
   - Why: ensure every client-side call has a corresponding `/api/*` endpoint.
   - What to do:
     - Search for any remaining client imports of server-only modules (already done). Then map client adapter functions in `src/lib/client-actions.ts` to the App Router routes and server actions.
     - Create a small spreadsheet or markdown table mapping client function -> `/api` route -> `src/lib/actions.ts` function.
   - Acceptance criteria: 100% mapping documented; any gaps are added to the integration tests list.
   - Est: 1–3h

4) Auth & security audit (High)
   - Why: client calls use cookies/session; ensure server endpoints verify auth/roles correctly and reject unauthorized requests.
   - What to do:
     - Review every `/api/admin/*` endpoint and ensure `verifySessionCookie` + role checks are present.
     - Add unit/integration tests that assert `401/403` for unauthorized requests and `200` for authorized.
   - Acceptance criteria: tests pass and there is a documented policy for cookie/session attributes in production (sameSite, secure, httpOnly, expiry).
   - Est: 3–6h

5) Observability & error reporting (Medium)
   - Why: server proxy endpoints may call AI flows which can fail or be slow — need visibility.
   - What to do:
     - Add structured logging (request id, route, duration, error stack) to server proxies (use existing logging infra or console for now).
     - Add a small metrics counter (e.g., in-memory Prometheus exporter or integrate with GenKit tracing if configured) for failures and latencies.
   - Acceptance criteria: logs include request id and error; sample dashboards/alerts documented.
   - Est: 4–8h

6) Clean build warnings (Optional / Low)
   - Why: OpenTelemetry and Handlebars warnings are noisy in build logs. They don't block deployment but make real issues harder to surface.
   - What to do:
     - Option A: add optional packages `@opentelemetry/winston-transport` and `@opentelemetry/exporter-jaeger` as dev deps if used.
     - Option B: patch genkit/lib imports or configure webpack to ignore `require.extensions` uses (higher risk).
   - Acceptance criteria: Next build runs with fewer or no related warnings.
   - Est: 1–4h depending on approach.

7) Feature-flag rollout & cleanup (Medium)
   - Why: maintain control over switching clients to HTTP; eventually remove old code paths.
   - What to do:
     - Validate `NEXT_PUBLIC_USE_HTTP_API` behavior in dev/staging. Flip in staging and run smoke tests.
     - After all clients are migrated and stable, remove server-only client imports and the flag gating logic if desired.
   - Acceptance criteria: staging smoke tests passing and a rollback plan documented.
   - Est: 2–4h for rollout + monitoring.

8) PR checklist & developer docs (Low)
   - Why: keep migration batches small and predictable.
   - What to do:
     - Add a PR template (e.g., `.github/PULL_REQUEST_TEMPLATE.md`) with checklist: short description, files changed (<=5), commands run (typecheck/build/tests), migration doc updated.
     - Add a short `docs/MIGRATION.md` section (done) and a sample code snippet for converting a server action call to the adapter + proxy.
   - Acceptance criteria: pull requests include the checklist and CI gates pass.
   - Est: 1–2h

9) Integration smoke in staging (High)
   - Why: validate real-world behavior (auth, AI latency, file uploads) outside of unit tests.
   - What to do:
     - Deploy a staging build with `NEXT_PUBLIC_USE_HTTP_API=true` and run a small smoke test (signup, profile rewrite, admin lists, messaging flow). Optionally automate via Playwright.
   - Acceptance criteria: smoke tests pass and no critical errors in logs during test window.
   - Est: 2–6h

10) Remove direct server-only imports from any remaining code (if any) and finalize cleanup (Low)
    - Why: ensure no accidental server-only logic leaks into the client bundle.
    - What to do: re-run repo search for imports of `@/lib/actions`, `firebase-admin`, `genkit` etc. If any client files still import them, migrate them in small PRs.
    - Acceptance criteria: no client-side files import server-only libraries.
    - Est: 1–3h

Priority & owners
- Critical (CI, integration tests, auth audit, staging smoke): prioritize now. Assign to backend/infra devs for auth/observability and frontend devs for adapter/tests.
- Medium (observability, feature-flag rollout, API audit): follow-up after critical items are green.
- Low (PR checklist, docs polish, build warnings): can be done in parallel or bundled with PRs.

Quality gates for each PR (minimal)
 - Run: `npm run -s typecheck && npm run -s build && npm run -s test`
 - Add at least one unit test that covers the client adapter change (mock `fetch`).
 - If adding a route, add a small integration test that hits the route (or add to the integration test task list).

How I can help next
 - Add a simple GitHub Actions `ci.yml` and push it to a branch (I can create the branch and PR for you).
 - Create integration test scaffolding (supertest + start/stop Next dev server) and add 3 endpoint tests.
 - Triage build warnings and propose fixes.

If you want me to implement one of the items above, tell me which one and I'll start it (I recommend CI + 2–3 integration tests first).
