# Architecture — Sensei Seek (compact)

Last updated: 2025-09-25 — includes notes about vector-first matching, Pinecone adapter, and backfill tooling.

This document describes the high-level architecture, key components, and where to look in the codebase for matching-related behavior, embeddings, backfill tooling, and background workers.

## Overview

Sensei Seek is a Next.js app with server logic and a Firestore backend. It uses embeddings + a vector database (Pinecone) to perform candidate reduction for matching, plus a Firestore-based matching cache and background worker pipeline to recompute caches and reduce LLM calls.

Core goals:
- Reduce LLM usage and cost by performing vector-first candidate reduction.
- Keep matching responsive with a Firestore cache and background recompute workers.
- Provide admin tooling to backfill or recompute embeddings and matching caches.

## Main components and where to find them

- Web app (Next.js App Router): `src/app` — pages, server routes, and admin UI components.
- Client components & UI: `src/components` and `src/app/(dashboard)`
- Embeddings helpers: `src/lib/embeddings.ts` — compute and canonicalize embeddings for profiles and jobs.
- Vector DB (Pinecone) adapter: `src/lib/vector-db.ts` — thin REST wrapper for upsert, query, and fetch.
- Matching & cache logic: `src/lib/matching-cache.ts` and `src/lib/actions.ts` — orchestrates vector-first matching and fallback flows.
- Pre-filter heuristics: `src/lib/pre-filter.ts` — simple heuristics used as a fallback when vector DB isn't available.
- Background worker: `src/workers/recompute-matching.ts` — picks up recompute claims and rebuilds matching cache entries.
- Scripts (operators):
  - `scripts/backfill-embeddings.js` — Node script to compute embeddings for existing documents, write Firestore `embeddings/*` docs, and upsert vectors to Pinecone. Supports `--dry-run`.
  - `scripts/pinecone-query.js` — helper to query Pinecone for one embedding doc.
  - `scripts/promote-admin.js` — promote a user to admin (one-time, safe script).

## Matching pipeline (runtime)
1. Compute or receive a normalized representation of a startup need (text snapshot).
2. Compute embedding for that text (cache result when possible).
3. Query Pinecone with the embedding to get top-K candidate profile IDs.
4. Fetch the candidate profiles from Firestore and optionally rerank with an LLM for final ordering.
5. Store the result in the Firestore matching cache, tagged by input keys for invalidation.

If Pinecone is unavailable or disabled, a pre-filter + LLM rerank flow is used as a fallback.

## Background recompute & invalidation
- Cache entries in Firestore include tag metadata (for example, profile versions, resume updates).
- Workers claim recompute tasks by writing a recompute claim; `src/workers/recompute-matching.ts` runs in a worker environment to rebuild cache entries without blocking the web request.

## Admin tooling
- Admin API server routes live under `src/app/api/matching/backfill/*` (App Router server endpoints) to list missing embeddings and to fill them on demand.
- Admin UI components to inspect & run backfill are under `src/app/(dashboard)/admin/matching-backfill/`.

## Tests
- Unit + integration tests use Vitest (see `vitest.config.ts`).
- A smoke test that queries Pinecone is in `tests/pinecone-smoke.test.ts` and is opt-in via `RUN_PINECONE_SMOKE=1`.

## Operational notes
- Environment variables: We expect `FIREBASE_ADMIN_SDK_CONFIG_BASE64`, Pinecone variables (`PINECONE_API_KEY`, `PINECONE_ENV`, `PINECONE_INDEX_NAME` or `PINECONE_BASE_URL`), and optional embedding provider vars (`EMBEDDING_API_URL`, `EMBEDDING_API_KEY`, `EMBEDDING_MODEL`).
- Backfill batches: controlled via `EMBED_BACKFILL_BATCH`.
- Deterministic embedding fallback: the backfill script computes a deterministic vector when no embedding provider is configured.

## Where to look for further changes
- If you want to change how embeddings are computed: `src/lib/embeddings.ts` and `scripts/backfill-embeddings.js`.
- If you want to change the vector DB provider: `src/lib/vector-db.ts`.
- If you want to change cache invalidation logic: `src/lib/matching-cache.ts` and `src/workers/recompute-matching.ts`.

## Contact
For questions about deployment, infra, or architecture decisions, contact the repo owner: ushapriya.krishnan@gmail.com
