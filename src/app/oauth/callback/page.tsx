"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSessionCookie, getCurrentUser } from '@/lib/client-actions';
import { Loader2 } from 'lucide-react';

export default function OAuthCallbackPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
            const token = params.get('token');
            const provider = params.get('provider') || undefined;
            if (!token) {
                router.replace('/login');
                return;
            }

            try {
                // Exchange idToken for ss-session cookie
                await createSessionCookie(token);

                // Query the server for current user details — if role exists, send to dashboard
                const me = await getCurrentUser();
                if (!mounted) return;
                if (me && me.data && me.data.role) {
                    const role = me.data.role;
                    if (role === 'admin') router.replace('/admin/dashboard');
                    else if (role === 'executive') router.replace('/executives/dashboard');
                    else router.replace('/startups/dashboard');
                } else {
                    // New user — redirect to role selection without exposing token
                    const q = provider ? `?provider=${encodeURIComponent(provider)}` : '';
                    router.replace(`/signup/role-selection${q}`);
                }
            } catch (err: unknown) {
                console.debug('[oauth-callback] exchange failed', err);
                if (!mounted) return;
                const e = err as { message?: string } | undefined;
                console.error('OAuth callback error', err);
                setError(e?.message || 'OAuth sign-in failed.');
                // fallback: send to role-selection so user can continue manually
                const q = provider ? `?provider=${encodeURIComponent(provider)}` : '';
                router.replace(`/signup/role-selection${q}`);
            }
        })();
        return () => { mounted = false; };
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
                <div className="text-lg">Completing sign-in...</div>
                {error && <div className="text-sm text-destructive mt-2">{error}</div>}
            </div>
        </div>
    );
}
