
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useTransition, Suspense } from "react";
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
import { handleOAuthSignup, createSessionCookie } from "@/lib/actions";
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
            const result = await handleOAuthSignup(token, role);
            if (result.status === 'success') {
                if (analytics && provider) {
                  logEvent(analytics, 'sign_up', { method: provider });
                  logEvent(analytics, 'login', { method: provider });
                }
                await createSessionCookie(token);
                await refetchUserDetails();
                toast({ title: "Welcome!", description: "Your account has been set up." });
                router.push(role === 'executive' ? '/executives/dashboard' : '/startups/dashboard');
            } else {
                 toast({
                    title: "Error",
                    description: result.message,
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
