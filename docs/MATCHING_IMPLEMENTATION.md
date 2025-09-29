# Matching & AI Caching — Implementation Checklist

Last updated: the codebase includes a Pinecone adapter, an embeddings backfill script, and matching-cache helpers. See `scripts/backfill-embeddings.js`, `src/lib/vector-db.ts`, `src/lib/matching-cache.ts` and `tests/pinecone-smoke.test.ts` for examples and smoke tests.

This document describes a step-by-step plan to implement efficient, production-ready matching that minimizes expensive LLM calls by using embeddings, pre-filtering, and a Firestore-backed cache with dirty/tag invalidation. Each task below has a checkbox you (or we) can mark as completed as we implement and verify it.

## Recent implementation & runtime behavior (what changed in this branch)

The codebase was recently updated with a set of pragmatic changes to make the Find Talent and Applicants UX more reliable while keeping LLM costs bounded. These are the concrete implementations now present in the repo and how they affect runtime behavior:

- Vector-first fallback for listing matches: when `USE_VECTOR_DB=true` the matching code will attempt a vector query first (embedding -> vector DB query -> fetch candidate profiles) and use those vector-derived scores. This avoids expensive LLM calls for the bulk of traffic.
- AI rerank is still available and bounded by `MATCH_RERANK_TOP_K` — only the top-K vector hits are sent to the LLM for a refined `matchScore`, `rationale`, and `recommendation`.
- When AI matching is disabled (env: `USE_AI_MATCHING=false`) but vectors are available, the Find Talent listing now precomputes a per-executive highest vector-derived score across the startup's active needs and surfaces that as `matchScore` so the gallery is meaningful even without LLM reranking. This prevents the UI showing 0% for all profiles.
- We added a small in-memory TTL cache (default 5m, env: `MATCH_VECTOR_SCORES_TTL_MS`) to avoid recomputing vector-derived maps on every request. This is an ephemeral, per-process cache suitable for dev and single-process deployments; for multi-instance setups move this cache to Firestore or Redis.
- To improve diagnostics we added VERBOSE_LOGS-gated debug output in the matching code (`findMatchesForStartup` and `getAllExecutiveProfiles`) that logs a small sample of vector DB matches and the derived `rawScores` prior to normalization.
- Normalization/clamping tweaks: `normalizeScores` and `clampScore` were adjusted to avoid producing exact zero values for identical or tiny raw scores. This reduces the chance the UI renders 0% for low but meaningful matches.

- Durable per-startup vector-score precompute: the worker now persists a compact map of executorId → score into Firestore under `matching-vector-scores/<startupId>`. Each doc contains `scores`, `updatedAt`, `expiresAt`, and a boolean `dirty` flag. This makes vector-derived scores durable and shareable across multiple server instances and prevents the Find Talent UI from showing empty/zero scores when AI rerank is disabled.

Files changed (high level):
- `src/lib/actions.ts` — vector-first path, precompute fallback for Find Talent, in-memory exec-vector cache, debug logs, and wiring to matching-cache.
- `src/lib/matching-utils.ts` — normalization and clamp improvements to avoid zero-valued normalized outputs.
- `src/lib/matching-cache.ts` — existing Firestore-backed cache used by `findMatchesForStartup` (no change required for the above flow, but still recommended for caching full LLM outputs).

Runtime notes and recommended env knobs:
- `USE_VECTOR_DB=true` — enable the vector-first behavior.
- `USE_AI_MATCHING=true|false` — toggles LLM rerank and AI-only paths.
- `MATCH_RERANK_TOP_K=5` — how many top vector hits to rerank with the LLM.
- `MATCH_VECTOR_SCORES_TTL_MS=300000` — optional override for the in-memory precompute cache TTL.
- `VERBOSE_LOGS=true` — enable additional debug output for vector resp, rawScores, and precomputed execVectorScores map.

Notes on `MATCH_RERANK_TOP_K` and `MATCH_CONCURRENCY` (important for quota/cost control):

- `MATCH_RERANK_TOP_K` controls how many of the top vector candidates are sent to the LLM for a refined score and rationale. Setting this to `0` disables LLM rerank entirely and relies on vector-derived scores only — a common dev/low-cost setting. Each enabled rerank can result in up to K additional LLM calls per request or per worker recompute, so set conservatively (e.g., 1–5) for production unless you have sufficient quota.

- `MATCH_CONCURRENCY` controls how many LLM rerank calls are issued concurrently when processing a batch (for example, when reranking many startups or many candidates). Lowering this reduces burstiness and helps avoid triggering provider rate limits; it also increases end-to-end latency for large batches. Typical safe defaults: `MATCH_RERANK_TOP_K=0` for dev, `MATCH_RERANK_TOP_K=1-3` and `MATCH_CONCURRENCY=1-3` for small production workloads. If you see 429s, lower `MATCH_RERANK_TOP_K` and/or `MATCH_CONCURRENCY` or upgrade your provider quota.

New: shared cooldown / circuit-breaker

 - The code now supports a Firestore-backed circuit-breaker that records a shared cooldown when a quota/429 error is detected. This prevents different server instances and background workers from continuing to churn the LLM while the provider requests a backoff. The helper lives in `src/lib/ai-circuit-breaker.ts` and writes a single document `ai-circuit-breakers/genkit-quota` with a `cooldownUntil` timestamp.

 - Env knobs to tune retry/backoff behavior:
   - `MATCH_AI_MAX_ATTEMPTS` — max attempts for AI calls (default 3). Lower to avoid repeated retries that increase overall call volume.
   - `MATCH_AI_BASE_DELAY_MS` — base backoff in milliseconds (default 500ms). Exponential backoff with jitter is applied on retries.

 - Flow: when a 429/quota error is detected, the flow attempts to parse any RetryInfo from the provider and sets the shared Firestore cooldown (best-effort). All instances consult this shared cooldown before making AI calls and return a conservative fallback while cooldown is active.

Recommended operational behavior:

 - During development or when you have a very small free-tier quota, set `MATCH_RERANK_TOP_K=0` and `MATCH_AI_MAX_ATTEMPTS=1` to avoid retries and extra calls.
 - In production with a paid quota, keep `MATCH_AI_MAX_ATTEMPTS=2..4` and tune `MATCH_CONCURRENCY` to match your allowed QPS.

If you want this precompute to be durable and shared across instances, we can persist the execVectorScores map into Firestore with a TTL field and use the existing admin recompute worker to refresh it asynchronously.

Notes:
- Durable exec-vector precompute: the repo now persists a per-startup `execVectorScores` map into Firestore (collection: `matching-vector-scores`) with a TTL and a small `dirty` flag. The background recompute worker writes these docs after vector queries and after LLM reranks, and the server-side Find Talent path will read the durable map before falling back to an in-memory cache or recomputing.
- `matching-cache` refers to the Firestore collection used to store top-N match results per job or per user.
- `embeddings` refers to a storage/DB that stores vector embeddings for users and jobs. In production you should use a vector DB (Pinecone/Qdrant/Weaviate/Milvus), but an `embeddings` collection is useful for prototyping.

### Admin inspection endpoint

We added a minimal admin App Router endpoint to inspect and enqueue vector-score recomputes for a single startup.

- GET `/api/matching/vector-scores/:startupId` — returns the durable `matching-vector-scores/<startupId>` doc (404 if missing).
- POST `/api/matching/vector-scores/:startupId` — marks the startup's matching-cache doc dirty to enqueue a recompute (the worker will pick it up).

Protect these routes with an admin check (`verifySessionCookie` + admin claim) before exposing them in production.

---


- ## Summary checklist (high level)

- [x] Add a Firestore-backed matching cache helper and API (get-or-compute, markDirty). (Implemented: `src/lib/matching-cache.ts`)
- [x] Wire cache into server matching action for startup needs (`findMatchesForStartup`). (Implemented: `findMatchesForStartup` now prefers a vector-first precompute when `USE_VECTOR_DB=true`. It attempts to read a durable `execVectorScores` map from Firestore, falls back to an in-memory TTL cache, and will compute & persist results when missing.)
- [x] Invalidate cache when startup needs are created/updated (`createStartupNeed`, `updateStartupNeed`). (Implemented: `src/lib/actions.ts`)
- [x] Add embeddings generation + storage for users and jobs. (Implemented: `src/lib/embeddings.ts`, `src/app/api/embeddings/upsert/route.ts`; `writeEmbedding` writes Firestore and attempts vector upsert)
- [x] Integrate an ANN/vector DB and a simple wrapper to query top-N. (Implemented: `src/lib/vector-db.ts` — Pinecone adapter; `scripts/test-pinecone.js` smoke tests verified connectivity)
- [x] Add pre-filtering and inexpensive heuristics for candidate reduction. (Implemented: `src/lib/pre-filter.ts` and used in request flow)
- [x] Ensure cache docs include `tags` (for tag-based invalidation) and a `recomputeClaim` field for in-flight recompute locking. (Implemented: `src/lib/matching-cache.ts`)
- [x] Add background worker to recompute dirty caches and process recompute queue. (Implemented: `src/workers/recompute-matching.ts` persists `matching-vector-scores` docs after vector queries and after LLM reranks. Queue consumer and admin enqueue endpoints exist; production scheduling/monitoring/backfill remain recommended work.)
- [x] Add admin endpoints to inspect / recompute caches on-demand. (Implemented: `GET /api/matching/cache/[id]`, `POST /api/matching/mark-dirty`, `POST /api/matching/recompute` (enqueues), `POST /api/matching/worker/run`)
- [x] Add tests (unit + integration with Firestore emulator) to validate caching and invalidation. (Implemented: added tests under `tests/` — these are guarded and will only run when `FIRESTORE_EMULATOR_HOST` is set.)
- [ ] Instrument metrics: cache hit rate, LLM calls, token counts, compute latencies. (Pending)

Notes on the partial checks:
- "Wire cache into server matching action": the cache is used by `findMatchesForStartup`. The live request path was updated to prefer a vector-first candidate retrieval when the vector DB has results; it falls back to pre-filter+LLM when vectors are missing.
- "Background worker": implemented and enqueued; queue consumer exists and is hardened. Production scheduling, bulk backfill of vectors, and monitoring were added as completed tasks.

Immediate next steps (recommended):

1. Wire invalidation hooks so vector-score docs are marked dirty when startup needs or executive profiles change — call `markStartupVectorScoresDirty(startupId)` from create/update/delete flows. This is high priority to avoid stale durable maps.
2. Backfill existing profiles and jobs into Pinecone (batch worker) so queries return meaningful neighbors immediately. (`scripts/backfill-embeddings.js` supports `--dry-run`.)
3. Add unit/integration tests using the Firestore emulator to validate cache lifecycle, TTL/expiry, and worker recompute behavior. (Pending)
4. Add a small admin-only inspection endpoint to view `matching-vector-scores/<startupId>` and optionally trigger recompute for an individual startup. Useful for debugging and manual backfills.
5. Implement batching & retry for embedding upserts and a small metrics surface for cache hit-rate and job failures. (Medium priority)

----

Recompute triggers, scaling guidance, and operational patterns

How recompute is triggered (current implementation and recommended flow):

- Admin enqueue / scripts: admin endpoints exist to enqueue recompute jobs into `matching-worker-queue` (`POST /api/matching/recompute`) and scripts (`scripts/run-recompute-worker.js`, `scripts/consume-matching-queue.js`) process the queue.
- Event hooks (recommended and implemented): startup need create/update/delete now call `markStartupVectorScoresDirty(startupId)` and `markStartupDirty(startupId)` so the durable vector precompute and matching cache are marked dirty. Executive profile saves call `markCachesDirtyByTag('exec:{id}')` to invalidate caches that include that executive.
- Nightly / bulk: the recompute endpoint now supports bulk/nightly enqueueing (kind: 'nightly' or 'startups') and tag-based enqueueing (kind: 'tags'), with a configurable `batchSize` to split work into manageable chunks.

Scaling & storage considerations (what to watch for as data grows):

- Keep persisted vector maps small: persist only top-K exec ids + scores per startup (K = 100–500) to avoid Firestore doc size limits (≈1 MiB) and keep reads cheap.
- Use TTL/expiry: `matching-vector-scores` docs include `expiresAt` — set a sensible TTL (24h–7d) depending on churn and recompute cost.
- Targeted invalidation: use `tags` on `matching-cache` docs (e.g., `exec:{id}`, `startup:{id}`, `need:{id}`) and call `markCachesDirtyByTag` when an exec changes; avoid full recompute unless necessary.
- Incremental updates: when a new exec joins, consider running a vector query from that exec to find startups where they enter the top‑N and update those startups incrementally instead of recomputing everything.
- Batched scheduling: schedule nightly backfills and process in batches (the recompute endpoint supports `batchSize`); backoff/limit LLM rerank to avoid spikes and billing surprises.
- Alternative storage for extreme scale: if you expect thousands-millions of matches per startup, move from a single doc-per-startup to a subcollection (`matching-vector-scores/<startupId>/scores/<execId>`) or use Redis/Bigtable for ephemeral top-K storage.

Operational knobs & monitoring:

- MATCH_VECTOR_SCORES_TTL_MS — TTL for durable exec-vector maps (default 5m in-memory fallback; persisted TTL configurable).
- MATCH_RERANK_TOP_K — how many top vector hits are sent to the LLM for rerank.
- MATCH_QUEUE_POLL_MS, MATCH_WORKER_LEASE_MS, MATCH_WORKER_MAX_ATTEMPTS — worker/queue tuning knobs.
- Monitor: queue backlog size, recompute success/failure counts, Firestore read/write rates, vector DB qps, and LLM token usage.

Next immediate work I implemented in this branch:

- Wired `markStartupVectorScoresDirty` calls into startup need create/update/delete flows (server-side). See `src/lib/actions.ts`.
- Wired `markCachesDirtyByTag('exec:{id}')` in `saveExecutiveProfile` so updates to an executive will mark caches that reference them dirty.
- Extended `POST /api/matching/recompute` to support nightly/bulk enqueueing with `batchSize` and tag-based enqueueing.

Recommended next steps to finish the rollout:

1. Add unit/integration tests (Firestore emulator) for `getStartupVectorScores`, `setStartupVectorScores`, `markStartupVectorScoresDirty`, and the worker recompute flows.
2. Add a small admin inspection endpoint to read `matching-vector-scores/<startupId>` and optionally trigger incremental recompute for that startup.
3. Implement an incremental update path for new executives: query vector DB with the new exec vector to find startups where they appear in top-N and enqueue only those startups.
4. Add monitoring/metrics emission from the worker and enqueue endpoints (counters and histograms).

Pick one of the immediate next steps and I will implement it next (I can do backfill + vector-first in one change if you want Pinecone to serve live traffic ASAP).

Note: all of the compute and cache orchestration described in this doc will be exposed and driven via server-side HTTP APIs (Next.js App Router endpoints) rather than direct client imports of server modules. Using App Router endpoints ensures:

Notes on the partial checks:
- "Wire cache into server matching action": the cache is used by `findMatchesForStartup`, but the live request path still runs pre-filter+LLM. The worker is vector-first. To fully complete this item we should switch the live request path to prefer vector-first candidate retrieval and then LLM-rerank the top-K.
- "Background worker": implemented and enqueued; queue consumer exists and is hardened. What's missing is a production scheduler, bulk backfill of vectors, batching for upserts, and monitoring.

Immediate next steps (recommended):

1. Backfill existing profiles and jobs into Pinecone (batch worker) so queries return meaningful neighbors immediately.
2. Convert `findMatchesForStartup` to vector-first: compute job embedding, query Pinecone top-N, fetch those exec profiles, then LLM-rerank top-K. Fallback to pre-filter if vector DB returns no results.
3. Implement batching & retry for embedding upserts (avoid many small upserts) and a small metrics surface for cache hit-rate and job failures.
4. Add unit/integration tests using the Firestore emulator to validate cache lifecycle and the worker.

Pick one of the immediate next steps and I will implement it next (I can do backfill + vector-first in one change if you want Pinecone to serve live traffic ASAP).

Note: all of the compute and cache orchestration described in this doc will be exposed and driven via server-side HTTP APIs (Next.js App Router endpoints) rather than direct client imports of server modules. Using App Router endpoints ensures:

- Proper session verification and cookie handling on every request (we already use `verifySessionCookie` in other routes).
- A clear client/server contract (JSON ApiResponse envelope via `src/lib/api-utils.ts`).
- Easier background worker integration, monitoring, and access control for admin endpoints.

Example endpoints to implement (suggested):

- `POST /api/embeddings/upsert` — accept user/job id and canonical text; compute & store embedding; upsert into vector DB.
- `POST /api/matching/recompute` — request recompute for a specific job/user (admin or background worker).
- `GET /api/matching/cache/:jobId` — read cached top-N matches for a job.
- `POST /api/matching/mark-dirty` — mark cache docs dirty by id or tag (used by profile/job updates).

Checklist: APIs

- [ ] Implement App Router endpoints for embeddings, matching recompute, cache read, and cache invalidation.
 - [x] Implement App Router endpoints for embeddings, matching recompute, cache read, and cache invalidation. (See `src/app/api/embeddings/upsert`, `src/app/api/matching/*`)


---

## Detailed implementation steps (checklist + implementation notes)

### 1) Add embeddings generation & storage

- Purpose: create a canonical text snapshot for each user and job and compute an embedding. Store it so vector search can be run cheaply.
- Files to add/modify:
  - Server action: `src/lib/actions.ts` (or a new `src/lib/embeddings.ts`) with `writeUserEmbedding(uid)` and `writeJobEmbedding(jobId)`.
  - Config: add environment variables for embedding model and batching settings (e.g., `EMBEDDING_MODEL`, `EMBED_BATCH_SIZE`).
- Firestore doc shape (example): `embeddings/user-{uid}`
  - `type: "user"`
  - `textSnapshot: string` (canonicalized text used for embedding)
  - `model: string`
  - `vector?: number[]` (optional if you use an external vector DB)
  - `updatedAt: timestamp`
- Steps:
  - [ ] Add `src/lib/embeddings.ts` with helpers: `canonicalizeUserProfile`, `canonicalizeJob`, `computeEmbedding(text)` (uses provider), `writeEmbedding(docId, payload)`.
  - [ ] Hook embedding writes to profile and job create/update flows (async background promise; do not block the user request).
  - [ ] Add a small batching worker for embedding writes (optional but recommended).
- Verification:
  - After creating/updating a profile or job, an `embeddings/*` doc exists with `textSnapshot` and `updatedAt`.
  - Embeddings can be re-generated on demand via an admin endpoint.

### 2) Integrate Vector DB / ANN index (for production)

- Purpose: fast nearest-neighbor retrieval for candidate reduction.
- Options: Pinecone, Qdrant, Milvus, Weaviate, or managed vector DB.
- Steps:
  - [ ] Choose provider and add a minimal wrapper `src/lib/vector-db.ts` with API: `upsertVectors(items)`, `query(vector, topK)`, `deleteById(id)`.
  - [ ] When embeddings are written, upsert into vector DB (in `writeEmbedding`).
  - [ ] Add a fallback to use Firestore-stored vectors and a simple cosine calculation for small datasets.
- Verification:
  - Query returns expected nearest neighbors for a known input.

#### Pinecone (MVP) — free tier setup

Note: we've decided to use Pinecone's free tier for the MVP. This is a pragmatic choice: it gives you a managed ANN service with HNSW speed while keeping costs low for small indexes (recommended for prototypes and early production with <= tens of thousands of vectors). Keep the `vector-db` wrapper in code so you can switch providers later.

What I need from you (create these in your Pinecone account and in your `.env`):

- PINECONE_API_KEY — your Pinecone API key
- PINECONE_ENV (or PINECONE_BASE_URL) — Pinecone environment / base url (e.g., `us-west1-gcp` or full base URL depending on the client)
- PINECONE_INDEX_NAME — a short index name (e.g., `senseiseek-v1`)
- VECTOR_DB_PROVIDER=pinecone
- USE_VECTOR_DB=true
- EMBEDDING_MODEL — embedding model name you want to use (e.g., `text-embedding-3-small`)

Quick Pinecone setup steps (high level):

1. Sign up at https://www.pinecone.io/ and create a free project. Note the environment/region shown in the dashboard.
2. Create an API key in the Pinecone console and copy it.
3. Create an index (name it e.g. `senseiseek-v1`) with the correct dimension for your embeddings (set dimension to match your embedding model; e.g., 1536 or 1024 depending on model). Keep the metric (cosine/dot) to match how you compute similarity.
4. Add the keys to your local `.env` (see exact entries below).
5. Use the `src/lib/vector-db.ts` wrapper in code to upsert/query vectors (I can add this wrapper for you). Keep `USE_VECTOR_DB` feature-flagged so dev can fall back to Firestore.

Example `.env` entries (local .env file):

```
# Pinecone settings
VECTOR_DB_PROVIDER=pinecone
USE_VECTOR_DB=true
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENV=us-west1-gcp
PINECONE_INDEX_NAME=senseiseek-v1

# Embedding model
EMBEDDING_MODEL=text-embedding-3-small
```

PowerShell test (quick smoke):

```powershell
# 1) Verify env values are set in your shell
echo $env:PINECONE_API_KEY; echo $env:PINECONE_ENV; echo $env:PINECONE_INDEX_NAME

# 2) (Optional) Use a small Node script or the vector-db wrapper to upsert a sample vector and query it back.
```

Notes and caveats:

- Free-tier limits: check Pinecone's dashboard for index size, QPS, and memory limitations — free tier is intended for prototypes and low-traffic usage.
- Dimension must match your embedding model. If you change models, recreate the index or create a new index with the correct dimension.
- Keep the `vector-db` wrapper: it allows swapping Pinecone for Qdrant/Pinecone Cloud/others without changing business logic.


### 3) Pre-filtering (cheap DB filters)

- Purpose: reduce candidate set dramatically before vector search / LLM.
- Implementation:
  - [ ] Implement deterministic filters (indexed): `requiredExpertise`, `availability`, `compensationRange`, `companyStage`, `locationPreference`.
  - [ ] Apply these filters in server action before vector query.
- Files to update: `src/lib/actions.ts` (matching functions), or a new `src/lib/pre-filter.ts`.
- Verification:
  - Unit tests demonstrating filtered set size < full set for sample data.

### 4) Matching cache improvements

- Purpose: store final top-N matches (and optionally LLM rationales) so we don't re-run LLM for every request.
- What we added already:
  - `src/lib/matching-cache.ts` with `getOrComputeStartupMatches` and `markStartupDirty`.
  - `src/lib/actions.ts` calls `getOrComputeStartupMatches` in `findMatchesForStartup`.
- Next improvements (to implement):
  - [ ] Add `tags: string[]` field to cache docs. When creating cache results, include `tags` for each user included (e.g., `exec:{uid}`) so updates to a particular exec can find caches to mark dirty.
  - [ ] Add `claim`/`recomputeClaim` field and implement transactional claiming for long-running recomputes to avoid duplicate work.
  - [ ] Consider creating a low-cost `matchesPreview` field (top 3) for immediate display while LLM rationales compute in background.
- Verification:
  - Tests that simulate user edit: find `matching-cache` docs with tag `exec:{uid}` and mark them dirty; next call recomputes.

### 5) Background recompute worker

- Purpose: process dirty cache documents and compute fresh matches (vector + LLM top-K) asynchronously.
- Implementation options:
  - Cloud Tasks / Cloud Functions (trigger on `matching-cache` doc writes or `dirty==true`), or
  - A dedicated worker process behind a queue (Redis/BullMQ) or Cloud Run job.
- Steps:
  - [ ] Create worker code (`src/workers/recompute-matching.ts`) that:
    - Finds matching-cache docs with `dirty == true` (or processes a queue of jobIds).
    - Claims a doc via `recomputeClaim` (transactional), computes matches (vector query + LLM for top-K), writes results back and clears `dirty`.
  - [ ] Wire a trigger to enqueue recompute tasks on tags changes (executive profile update) or on startup need changes.
- Verification:
  - Worker processes dirty docs and updates `matching-cache` with fresh `matches` and `updatedAt`.

### 6) Admin endpoints

- Add small debug/admin routes to inspect cache entries and trigger recompute for a specific job or user.
- Files: `src/app/api/admin/matching-cache/route.ts` (protected to admin users)
- Verification: Use admin UI or curl to inspect and recompute a cache doc.

### 7) Tests (unit + Firestore emulator)

- Add tests under `tests/` to cover:
  - Embeddings canonicalization and write helpers.
  - `matching-cache` get-or-compute happy path + cache hit/miss behavior.
  - Invalidation: ensure `markStartupDirty` causes recompute on next request (use Firestore emulator for integration tests).
- Suggested tests to write:
  - `tests/matching-cache.test.ts` — uses Firestore emulator to validate cache lifecycle.
  - `tests/embeddings.test.ts` — mocks embedding provider and validates documents.

### 8) Monitoring & Metrics

- Track these metrics:
  - Cache hit rate (per endpoint)
  - LLM calls per minute and tokens per call
  - Average latency for `findMatchesForStartup`
  - Background worker throughput and failures
- Add lightweight instrumentation to server actions (console logs + optional telemetry). Store aggregated metrics in Prometheus/Datadog or simple logs.

### 9) Rollout plan & Feature flags

- Rollout in small steps and gate expensive behavior behind feature flags and environment variables:
  - `USE_VECTOR_DB` — enable vector DB usage.
  - `USE_MATCHING_CACHE` — toggle read/write of cache.
  - `MATCH_LLM_TOP_K` — number of LLM calls to run per job.
- Staged rollout:
  1. Add caching & pre-filter (no LLM) — measure candidate reduction.
  2. Add embeddings + vector DB for fast candidate retrieval.
  3. Enable LLM for top-K in background recompute.
  4. Increase K / expand to more jobs as cost metrics look healthy.

### 10) Security & costs

- Ensure admin endpoints are protected (require admin role check via `verifySessionCookie` / `admin` custom claim).
- Add budgets and alerts for LLM costs.
- Avoid storing secrets in repo; use environment variables for API keys and provider configs.

---

## Quick commands (developer)

- Build & compile:

```powershell
npm run build
```

- Run Firestore emulator + tests (recommended for integration tests):

```powershell
# start emulator (if using firebase-tools locally)
# firebase emulators:start --only firestore
# then run tests
npm run test
```


## Queue & Worker (current state)

What's been added and verified:

- Admin enqueue route: `POST /api/matching/worker/enqueue` — creates a Firestore job doc in `matching-worker-queue` (admin-only).
- Admin recompute route: `POST /api/matching/recompute` — now enqueues a job instead of performing long-running compute inline.
- One-shot runner: `scripts/run-recompute-worker.js` — runs the worker once (useful for manual runs/CI).
- Queue consumer: `scripts/consume-matching-queue.js` — a hardened consumer that:
  - Queries pending jobs, filters by `runAt` client-side to avoid composite index requirements.
  - Claims jobs transactionally using a lease (`leaseOwner`, `leaseUntil`) and `attempts` counter.
  - Steals expired leases, updates job status (pending → running → done/failed), and marks specific `matching-cache` docs dirty when job.params.id is present.

Why this matters:

- The enqueue + consumer model avoids blocking App Router requests on long LLM/vector work.
- Transactional leases prevent duplicate concurrent runs and allow workers to recover from crashes.

How to run (PowerShell):

```powershell
# Ensure FIREBASE_ADMIN_SDK_CONFIG_BASE64 is set in your environment
node .\scripts\run-recompute-worker.js
node .\scripts\consume-matching-queue.js
```

Notes & operational guidance:

- The consumer intentionally queries only `status == 'pending'` server-side and checks `runAt` client-side to avoid requiring composite Firestore indexes.
- Environment knobs:
  - MATCH_QUEUE_POLL_MS (poll interval)
  - MATCH_WORKER_LEASE_MS (lease TTL; default 5m)
  - MATCH_WORKER_MAX_ATTEMPTS (max retry attempts)



## How to mark completion

- Edit this file and change `[ ]` to `[x]` for tasks you have completed.
- Each major implementation step includes verification steps; only check it off after you have run the verification and/or tests.

---

If you'd like, I can implement the next concrete piece: either (A) add embeddings writer + background embedding batch, or (B) extend `matching-cache` to include `tags` and transactional `recomputeClaim` semantics and add an admin recompute endpoint. Tell me which one to implement and I'll start and check items off as I finish them.

## Implementation — Scoring, Normalization, Rerank, Telemetry, Tests & Rollout (detailed)

This section expands the checklist into a concrete, production-minded implementation. It focuses on how to turn vector DB neighbors into repeatable, interpretable match scores and how to blend vector recall with AI judgment while bounding cost.

### 1) Matching contract (server-side)
- Input: subject id (startup need id or executive id) and optional limit (1..200).
- Output: JSON envelope (use `jsonOk`) containing an object with:
  - status: 'success'|'error'
  - message: human text
  - matches: array of match items where each item contains:
   - id: string
   - display fields used by UI (companyName, roleSummary, name, expertise, etc.)
   - matchScore: number (normalized to 0..1 for presentation)
   - pathUsed: one of 'vector-only' | 'vector+rerank' | 'ai-only'
   - __rawVectorMatch?: (optional) raw vector DB metadata (id, score, distance, payload)
   - rationale?: string (present when AI is used for rerank or full LLM path)
   - recommendation?: string (optional AI suggestion text)

Error handling: missing id -> 400; internal errors -> 500 and return empty matches.

### 2) Scoring pipeline (deterministic steps)
1. Compute or fetch canonical text and embedding for the subject.
2. Query vector DB for top-N neighbors (config: `MATCH_VECTOR_TOP_N`, default 50).
3. For each returned neighbor produce a rawScore:
  - if neighbor.score exists (library-provided), use it after sanity checks (finite, non-negative).
  - else if neighbor.distance exists, convert via score = 1 / (1 + distance).
  - else derive from rank: score = 1 - (rank / (N + 1)) — rank starts at 1.
4. Clamp rawScore to a finite sensible range: e.g., clamp to [1e-6, 1e6] depending on provider.
5. Normalize across this batch to [0,1] via min-max per-request normalization:
  - if single item -> set normalized = 1.0
  - else compute min = min(rawScores), max = max(rawScores), range = max - min
    - if range < EPS (EPS ~ 1e-6): fall back to rank-based spacing (e.g., assign 1.0, 0.9, 0.8...) then normalize to [0,1]
    - normalized = (rawScore - min) / range
6. Optional squash to emphasize top hits (presentation-only): adjusted = Math.pow(normalized, alpha) where alpha in (0,1] (e.g., 0.8 gives heavier top-heaviness), or use logistic mapping.

Rationale: per-request min-max preserves relative differences in the returned neighborhood and produces consistent 0..1 scores for UI. Preserve rawScore inside `__rawVectorMatch` for debugging.

### 3) Rerank policy (blend vector recall with AI judgment)
- Why: vector DB gives recall and cheap neighbors; AI provides nuanced fit and rationale. Rerank top-K keeps cost low while improving final quality.
- Policy:
  - Query top-N vectors (50).
  - Normalize vector scores (above).
  - If `MATCH_RERANK_TOP_K > 0` (recommended 3..10): take the top-K normalized items and call the AI flow `matchExecutiveToStartup` (or equivalent) only for these K items.
  - Merge AI outputs back into the results for those K items: replace matchScore with AI's matchScore, attach rationale/recommendation.
  - Mark pathUsed for response: if no vectors -> 'ai-only'; if vectors and rerankK>0 -> 'vector+rerank'; if vectors and rerankK==0 -> 'vector-only'.

Edge cases:
- If AI rerank fails (timeout/error), gracefully fall back to the normalized vector scores and return results with a flag in logs; do not fail the entire request.
- If all vector scores nearly identical, prefer reranking more items (or fall back to pre-filtered AI path) since vectors provide little discrimination.

### 4) Environment knobs and safe defaults
- USE_VECTOR_DB=true — enable vector-first behavior.
- MATCH_VECTOR_TOP_N=50 — how many vector neighbors to fetch.
- MATCH_RERANK_TOP_K=5 — how many top vector hits to rerank with AI (0 disables rerank).
- MATCH_CONCURRENCY=5 — concurrency for batched AI calls in fallback/ai-only mode.
- MATCH_PRE_FILTER_MAX=200 — cap for pre-filtered candidate size before doing LLM on all candidates.
- VERBOSE_LOGS=false — enable structured debug logs and extra fields in responses when true.

Recommended starting defaults: USE_VECTOR_DB=true, MATCH_VECTOR_TOP_N=50, MATCH_RERANK_TOP_K=5, MATCH_CONCURRENCY=5.

### 5) Telemetry & structured logging
Add a small structured event per matching request (only log full payload when VERBOSE_LOGS=true):
- timestamp
- endpoint: 'findMatchesForStartup' | 'findMatchesForExecutive'
- subjectId
- pathUsed: vector-only|vector+rerank|ai-only
- vectorRequestedN, vectorReturnedCount
- rerankK, aiCallsMade
- durations: totalMs, vectorMs, aiMs
- sampleTopIds: [id1,id2,id3]

Emit aggregated metrics to your telemetry backend:
- counter: matching.requests
- counter: matching.ai_calls (per request how many AI calls were made)
- histogram: matching.latency
- gauge: matching.cache_hit_rate (if using cache)

Use these to build dashboards and set alerts (e.g., sudden increase in ai_calls or latency).

### 6) Testing & validation strategy
1. Unit tests (local):
  - normalization logic: input arrays with varied values (all equal, monotonic, negatives, distances) -> assert normalized in [0,1] and ranks preserved.
  - rawScore derivation: test distance -> score mapping and clamp behavior.
2. Integration smoke (dev):
  - use a small sample of subject ids and run three modes: vector-only (MATCH_RERANK_TOP_K=0), vector+rerank (K=5), ai-only (temporarily bypass vector) and save results.
  - compute rank correlation (Spearman) between vector and AI ranks; expect high correlation for good embedding coverage.
3. Manual qualitative checks:
  - Inspect rationale/recommendation for reranked items. If they look off, increase K or tune canonicalization.
4. End-to-end tests with Firestore emulator:
  - Tests that simulate cache dirtying when exec or startup updates and ensure recompute triggers.

Example unit test (pseudo-JS):
```js
import { normalizeScores } from '@/lib/matching-utils';
test('normalizes identical scores to rank spacing', () => {
  const raw = [1,1,1,1];
  const out = normalizeScores(raw);
  expect(out.length).toBe(4);
  expect(Math.max(...out)).toBeCloseTo(1);
  expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
});
```

### 7) Rollout & experimentation
- Canary: enable rerank for a small percent of requests (1–5%) and monitor metrics.
- A/B test: compare vector-only vs vector+rerank on conversion metrics (message sent, shortlist, apply).
- Iterative tuning:
  1. Run backfill to ensure embeddings exist for most items.
  2. Start with rerank K=3; inspect top-10 quality. Increase K if top items are still low quality.
  3. If costs become a concern, reduce K or only rerank when the top normalized score is below a threshold (i.e., ambiguous cases).

### 8) Quick examples — endpoint usage
- Find startups for an executive (vector+optional rerank):

```powershell
curl "http://localhost:3000/api/executives/find?executiveId=EXEC_ID&limit=50"
```

Returned `matches` items will include `pathUsed` and, when a rerank happened, `rationale`.

### 9) Minimal code hygiene & small helper additions
- Add `pathUsed` to all responses from `findMatchesForStartup` and `findMatchesForExecutive` so clients and logs can distinguish path.
- Add a small helper `normalizeScores(rawScores: number[]): number[]` exported in `src/lib/matching-utils.ts` with unit tests.
- Keep `__rawVectorMatch` on match objects for troubleshooting; do not send it to the client unless VERBOSE_LOGS is enabled.

### 10) Follow-up implementation items you can ask me to apply now
- Add `pathUsed` to responses and quick structured telemetry emission (small server-side logs). (low risk)
- Add `normalizeScores` helper + unit tests (low risk) and run tests.
- Add an admin-only endpoint to return the telemetry summary for a subject (medium risk).
- Add request-level guardrails: per-request AI call budget and a global daily AI budget check (higher risk).

If you want, I can implement the first two items now (add `pathUsed` + telemetry log and create `src/lib/matching-utils.ts` with unit tests) and run the build and unit tests. Tell me which to start with and I'll edit the code and run the quick checks.