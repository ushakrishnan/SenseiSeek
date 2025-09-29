// src/lib/api-utils.ts
import { NextResponse } from 'next/server';
import admin from './firebase';
import { checkAdmin } from './actions';

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
    const start = Date.now();
    try {
        const cookie = req.headers.get('cookie') || '';
        // Prefer the canonical 'ss-session' but accept legacy 'session' during migration.
        let sessionCookie: string | null = null;
        let usedName: string | null = null;
        const m1 = cookie.match(/ss-session=([^;]+)/);
        if (m1) {
            sessionCookie = m1[1];
            usedName = 'ss-session';
        } else {
            const m2 = cookie.match(/session=([^;]+)/);
            if (m2) {
                sessionCookie = m2[1];
                usedName = 'session';
            }
        }
        if (!sessionCookie) return null;
        if (usedName) console.debug(`[verifySessionCookie] using cookie name=${usedName}`);

        // In-memory short-lived cache to avoid repeated network calls to Firebase
        // Keyed by the raw session cookie value. Entries expire after SESSION_VERIFY_CACHE_MS.
        // Default to 5 minutes to reduce repeated verification latency in dev and staging.
        const cacheMs = Number(process.env.SESSION_VERIFY_CACHE_MS || 300000);
        // Lazy init cache on module
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (global as any).__ss_session_cache = (global as any).__ss_session_cache || new Map<string, { decoded: any; expires: number }>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionCache: Map<string, { decoded: any; expires: number }> = (global as any).__ss_session_cache;

        const cached = sessionCache.get(sessionCookie);
        if (cached && cached.expires > Date.now()) {
            console.debug(`[verifySessionCookie] cacheHit uid=${(cached.decoded as any)?.uid || 'unknown'} ms=${Date.now() - start}`);
            return cached.decoded;
        }
        console.debug(`[verifySessionCookie] cacheMiss ms=${Date.now() - start}`);

        const verifyStart = Date.now();
        // Firebase admin verifySessionCookie has an optional checkRevoked boolean that
        // can be slower because it checks refresh token revocation. Skip the revocation
        // check in non-production to reduce latency; always check in production.
        const checkRevoked = process.env.NODE_ENV === 'production';
        console.debug(`[verifySessionCookie] checkRevoked=${checkRevoked}`);
        const decoded = await admin.auth().verifySessionCookie(sessionCookie, checkRevoked);
        const verifyMs = Date.now() - verifyStart;
        try {
            // Enforce a max size on the Map to avoid unbounded memory usage in long-running dev servers
            const maxEntries = Number(process.env.SESSION_VERIFY_CACHE_MAX || 200);
            sessionCache.set(sessionCookie, { decoded, expires: Date.now() + cacheMs });
            if (sessionCache.size > maxEntries) {
                // delete the oldest entry (Map preserves insertion order)
                const oldestKey = sessionCache.keys().next().value as string | undefined;
                if (oldestKey) {
                    sessionCache.delete(oldestKey);
                    console.debug(`[verifySessionCookie] evicted oldest cache key to maintain maxEntries=${maxEntries}`);
                }
            }
        } catch (err) {
            // ignore cache set errors
        }
        console.debug(`[verifySessionCookie] uid=${(decoded as any)?.uid || 'unknown'} verifyMs=${verifyMs} totalMs=${Date.now() - start}`);
        return decoded; // contains uid, email, etc.
    } catch (err) {
        console.debug(`[verifySessionCookie] failed totalMs=${Date.now() - start} err=${String(err)}`);
        return null;
    }
}

// Require that the request comes from an authenticated admin user.
// Returns the decoded token on success or null if not authenticated.
export async function requireAdmin(req: Request) {
    const user = await verifySessionCookie(req);
    if (!user) return null;
    const uid = (user as any).uid as string;
    try {
        await checkAdmin(uid);
        return user;
    } catch (err) {
        return null;
    }
}

// Wrap a route handler with admin authorization and basic error handling.
// handler: async (req: Request, user: any) => NextResponse | ApiResponse
export function requireAdminHandler(handler: (req: Request, user: any) => Promise<any>) {
    return async function (req: Request) {
        try {
            const user = await requireAdmin(req);
            if (!user) return jsonError('Not authorized', 401);
            const result = await handler(req, user);
            // If the handler already returned a NextResponse or ApiResponse, pass it through
            return result;
        } catch (err: unknown) {
            const e = err as { message?: string } | undefined;
            console.error('[requireAdminHandler] error=', e);
            return jsonError(e?.message || String(err), 500);
        }
    };
}
