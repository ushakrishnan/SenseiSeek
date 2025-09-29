
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { finishOAuthSignup, createSessionCookie } from "@/lib/client-actions";
import { useAuth } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Logo } from "@/components/logo";
import { analytics } from "@/lib/firebase-client";
import { logEvent } from "firebase/analytics";

function RoleSelectionContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { refetchUserDetails } = useAuth();

    const [role, setRole] = useState<'startup' | 'executive' | ''>('');
    const [isPending, startTransition] = useTransition();

    const token = searchParams.get("token");
    const provider = searchParams.get("provider");

    // If the OAuth redirect included an idToken in the URL, exchange it for
    // a server-side session cookie immediately so the server sees the user
    // as authenticated before they submit the role selection form. This
    // fixes the case where the page loads with a token but no session cookie
    // is set (browser navigations from OAuth providers won't call our
    // client-side sign-in flow that normally sets the cookie).
    const [cookieExchanged, setCookieExchanged] = useState(false);

    // Exchange token for session cookie once on mount
    useEffect(() => {
        if (!token || cookieExchanged) return;
        let mounted = true;
        (async () => {
            try {
                await createSessionCookie(token);
                // After cookie is set, refetch current user details so UI updates
                await refetchUserDetails();
            } catch (err) {
                // swallow; we'll surface errors on explicit submit
                console.debug('[role-selection] createSessionCookie failed', err);
            } finally {
                if (mounted) setCookieExchanged(true);
            }
        })();
        return () => { mounted = false; };
    }, [token, cookieExchanged, refetchUserDetails]);

    const handleSubmit = async () => {
        if (!role) {
            toast({
                title: "Selection Required",
                description: "Please select a role to continue.",
                variant: "destructive"
            });
            return;
        }

        if (!token) {
            toast({
                title: "Authentication Error",
                description: "Your session token is missing. Please try signing in again.",
                variant: "destructive"
            });
            router.push('/login');
            return;
        }

        startTransition(async () => {
            const result = await finishOAuthSignup(token, role as 'startup' | 'executive');
            // Accept both envelope { ok, data } and unwrapped response
            const body = (result && typeof result === 'object' && (result as any).ok && Object.prototype.hasOwnProperty.call((result as any), 'data')) ? (result as any).data : result;
            // Accept both unwrapped responses ({ status, message }) and
            // legacy envelope forms. Don't rely on `.ok` on the outer
            // envelope here — check the actual payload fields.
            if (body?.status === 'success' || body?.status === 'created' || body?.success === true) {
                if (analytics && provider) {
                    logEvent(analytics, 'sign_up', { method: provider });
                    logEvent(analytics, 'login', { method: provider });
                }
                // refetch user details after cookie has been set by the server
                await refetchUserDetails();
                toast({ title: "Welcome!", description: "Your account has been set up." });
                router.push(role === 'executive' ? '/executives/dashboard' : '/startups/dashboard');
            } else {
                toast({
                    title: "Error",
                    description: body?.error || body?.message || 'Unknown error',
                    variant: "destructive"
                });
            }
        });
    }

    return (
        <div className="theme-orange flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4">
                            <Logo />
                        </div>
                        <CardTitle className="text-2xl">One Last Step</CardTitle>
                        <CardDescription>
                            To complete your profile, please tell us who you are.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={role} onValueChange={(value) => setRole(value as any)} className="space-y-4">
                            <Label
                                htmlFor="role-startup"
                                className="flex items-center space-x-4 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                            >
                                <RadioGroupItem value="startup" id="role-startup" />
                                <div className="flex flex-col">
                                    <span className="font-semibold">I'm a Startup</span>
                                    <span className="text-sm text-muted-foreground">I'm looking to hire fractional executive talent.</span>
                                </div>
                            </Label>
                            <Label
                                htmlFor="role-executive"
                                className="flex items-center space-x-4 rounded-md border p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
                            >
                                <RadioGroupItem value="executive" id="role-executive" />
                                <div className="flex flex-col">
                                    <span className="font-semibold">I'm an Executive</span>
                                    <span className="text-sm text-muted-foreground">I'm looking for high-impact fractional roles.</span>
                                </div>
                            </Label>
                        </RadioGroup>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Complete Signup
                        </Button>
                    </CardFooter>
                </Card>
            </main>
            <Footer />
        </div>
    );
}


export default function RoleSelectionPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RoleSelectionContent />
        </Suspense>
    )
}
