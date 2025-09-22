
"use client";

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { signup, getUserDetails, createSessionCookie } from '@/lib/actions';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, OAuthProvider, TwitterAuthProvider } from 'firebase/auth';
import { auth, analytics } from '@/lib/firebase-client';
import { useAuth } from '@/components/auth-provider';
import { GitHubIcon } from '@/components/icons/github-icon';
import { MicrosoftIcon } from '@/components/icons/microsoft-icon';
import { TwitterIcon } from '@/components/icons/twitter-icon';
import { YahooIcon } from '@/components/icons/yahoo-icon';
import { logEvent } from 'firebase/analytics';

const initialSignupState = {
  status: "idle" as "idle" | "loading" | "success" | "error",
  message: "",
  errors: null as Record<string, string[] | undefined> | null,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign Up'}
    </Button>
  );
}

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


const RequiredIndicator = () => <span className="text-destructive">*</span>;

export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [signupState, signupAction] = useActionState(signup, initialSignupState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { refetchUserDetails } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (signupState.status === 'success') {
      if (analytics) {
        logEvent(analytics, 'sign_up', { method: 'password' });
      }
      toast({
        title: "Account Created!",
        description: "Please log in to continue.",
      });
      router.push('/login');
    } else if (signupState.status === 'error' && signupState.message) {
      toast({
        title: "Error",
        description: signupState.message,
        variant: "destructive",
      });
    }
  }, [signupState, toast, router]);
  
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
        if (analytics) {
          logEvent(analytics, 'login', { method: providerName });
        }
        await createSessionCookie(idToken);
        await refetchUserDetails();
        toast({ title: "Login Successful" });
        if (userDetails.role === 'admin') {
            router.push('/admin/dashboard');
        } else {
            router.push(userDetails.role === 'executive' ? '/executives/dashboard' : '/startups/dashboard');
        }
      } else {
        const providerId = provider.providerId.split('.')[0];
        router.push(`/signup/role-selection?provider=${providerId}&token=${encodeURIComponent(idToken)}`);
      }
    } catch (error: any) {
      let friendlyMessage = 'An unknown error occurred during sign-up.';
       if (error.code === 'auth/account-exists-with-different-credential') {
        friendlyMessage = 'An account already exists with this email. To link your accounts, please sign in with your original method first, then connect your new sign-in provider from your profile settings.';
      } else if (error.message) {
        friendlyMessage = error.message;
      }

      setError(friendlyMessage);
      toast({ title: "Sign-Up Failed", description: friendlyMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  const getError = (field: string) => signupState.errors?.[field]?.[0];

  return (
    <Card>
      <CardHeader>
        {signupState.status === 'error' && signupState.message && !signupState.errors && (
          <CardDescription className="text-destructive pt-2">{signupState.message}</CardDescription>
        )}
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
        <form action={signupAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name <RequiredIndicator /></Label>
            <Input id="name" name="name" placeholder="e.g. Jane Doe" required />
            {getError('name') && <p className="text-sm text-destructive">{getError('name')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address <RequiredIndicator /></Label>
            <Input id="email" name="email" type="email" placeholder="e.g. jane@example.com" required />
            {getError('email') && <p className="text-sm text-destructive">{getError('email')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password <RequiredIndicator /></Label>
            <div className="relative">
              <Input 
                id="password" 
                name="password" 
                type={showPassword ? "text" : "password"} 
                placeholder="********" 
                required 
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
             {getError('password') && <p className="text-sm text-destructive">{getError('password')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password <RequiredIndicator /></Label>
             <div className="relative">
              <Input 
                id="confirmPassword" 
                name="confirmPassword" 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="********" 
                required 
              />
               <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
                onClick={() => setShowConfirmPassword(!setShowConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            {getError('confirmPassword') && <p className="text-sm text-destructive">{getError('confirmPassword')}</p>}
          </div>
          <div className="space-y-2">
            <Label>I am a... <RequiredIndicator /></Label>
            <RadioGroup required name="role" className="flex gap-4 pt-2">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="startup" id="role-startup" />
                    <Label htmlFor="role-startup">Startup looking to hire</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="executive" id="role-executive" />
                    <Label htmlFor="role-executive">Executive looking for roles</Label>
                </div>
            </RadioGroup>
            {getError('role') && <p className="text-sm text-destructive">{getError('role')}</p>}
          </div>
          <SubmitButton />
        </form>
       </CardContent>
       <CardFooter className="flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                  Login
              </Link>
          </div>
      </CardFooter>
    </Card>
  );
}
