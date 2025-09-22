
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, OAuthProvider, TwitterAuthProvider } from 'firebase/auth';
import { auth, analytics } from '@/lib/firebase-client';
import { getUserDetails, createSessionCookie } from '@/lib/actions';
import { useAuth } from '@/components/auth-provider';
import { Separator } from '@/components/ui/separator';
import { GitHubIcon } from '@/components/icons/github-icon';
import { MicrosoftIcon } from '@/components/icons/microsoft-icon';
import { TwitterIcon } from '@/components/icons/twitter-icon';
import { YahooIcon } from '@/components/icons/yahoo-icon';
import { logEvent } from 'firebase/analytics';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        {...props}
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
        <path d="M1 1h22v22H1z" fill="none" />
      </svg>
    );
}

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { refetchUserDetails } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginSuccess = async (role: 'startup' | 'executive' | 'admin', method: string) => {
    if (analytics) {
      logEvent(analytics, 'login', { method });
    }
    await refetchUserDetails();
    toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
    });
    if (role === 'admin') {
      router.push('/admin/dashboard');
    } else if (role === 'executive') {
      router.push('/executives/dashboard');
    } else {
      router.push('/startups/dashboard'); 
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const idToken = await userCredential.user.getIdToken();
      await createSessionCookie(idToken);

      const userDetails = await getUserDetails(userCredential.user.uid);
      if (!userDetails?.role) {
          throw new Error("Could not determine user role.");
      }
      
      handleLoginSuccess(userDetails.role, "password");

    } catch (err: any) {
      let errorMessage = 'An unknown error occurred. Please try again.';
      if (err.code === 'auth/invalid-credential') {
          errorMessage = 'Invalid email or password. Please try again.';
      }
      
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (providerName: 'google' | 'github' | 'microsoft' | 'twitter' | 'yahoo') => {
    setIsLoading(true);
    setError(null);
    let provider;
    switch(providerName) {
        case 'google':
            provider = new GoogleAuthProvider();
            break;
        case 'github':
            provider = new GithubAuthProvider();
            break;
        case 'microsoft':
            provider = new OAuthProvider('microsoft.com');
            break;
        case 'twitter':
            provider = new TwitterAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account',
            });
            break;
        case 'yahoo':
            provider = new OAuthProvider('yahoo.com');
            break;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const userDetails = await getUserDetails(user.uid);

      if (userDetails && userDetails.role) {
        await createSessionCookie(idToken);
        handleLoginSuccess(userDetails.role, providerName);
      } else {
        // This case handles new OAuth users who need to select a role.
        const url = `/signup/role-selection?provider=${providerName}&token=${encodeURIComponent(idToken)}`;
        router.push(url);
      }
    } catch (error: any) {
      let friendlyMessage = 'An unknown error occurred during sign-in.';
      if (error.code === 'auth/account-exists-with-different-credential') {
        friendlyMessage = 'An account already exists with this email. To link your accounts, please sign in with your original method first, then connect your new sign-in provider from your profile settings.';
      } else if (error.message) {
        friendlyMessage = error.message;
      }

      setError(friendlyMessage);
      toast({ title: "Sign-In Failed", description: friendlyMessage, variant: "destructive" });
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        {error && <CardDescription className="text-destructive pt-2">{error}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
            <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn('google')} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2" />}
                Continue with Google
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn('github')} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitHubIcon className="mr-2" />}
                Continue with GitHub
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn('microsoft')} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MicrosoftIcon className="mr-2" />}
                Continue with Microsoft
            </Button>
            <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn('twitter')} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TwitterIcon className="mr-2" />}
                Continue with Twitter
            </Button>
             <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn('yahoo')} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <YahooIcon className="mr-2" />}
                Continue with Yahoo
            </Button>
        </div>
        <div className="my-4 flex items-center">
            <Separator className="flex-1" />
            <span className="mx-4 text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="e.g. jane@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
                        Forgot password?
                    </Link>
                </div>
                <div className="relative">
                <Input 
                    id="password" 
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="********" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                >
                    {showPassword ? <EyeOff /> : <Eye />}
                    <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                </Button>
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
            </Button>
        </form>
       </CardContent>
       <CardFooter className="flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                  Sign up
              </Link>
          </div>
      </CardFooter>
    </Card>
  );
}
