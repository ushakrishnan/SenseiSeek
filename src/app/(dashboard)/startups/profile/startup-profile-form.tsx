

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTransition, useState, useMemo, useActionState, useEffect } from "react";
import { GoogleAuthProvider, GithubAuthProvider, OAuthProvider, linkWithPopup, TwitterAuthProvider } from 'firebase/auth';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  saveStartupProfile,
  rewriteStartupProfileField,
} from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { startupProfileSchema } from "@/lib/schemas";
import type { StartupProfile } from "@/lib/types";
import { Loader2, Wand2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GitHubIcon } from "@/components/icons/github-icon";
import { MicrosoftIcon } from "@/components/icons/microsoft-icon";
import { TwitterIcon } from "@/components/icons/twitter-icon";
import { YahooIcon } from "@/components/icons/yahoo-icon";
import { analytics } from "@/lib/firebase-client";
import { logEvent } from "firebase/analytics";

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

type StartupProfileFormValues = z.infer<typeof startupProfileSchema>;

const industryOptionsList = [
    'AdTech', 'AI/ML', 'B2B Marketing', 'Big Data', 'CleanTech', 'ClimateTech', 
    'Consumer Goods (D2C)', 'DeepTech', 'EdTech', 'E-commerce', 'Energy', 'Fintech', 
    'GovTech', 'Hardware', 'HealthTech', 'Insurance', 'LegalTech', 'Life Sciences', 
    'Logistics', 'Marketplaces', 'Media & Entertainment', 'Operations Management', 
    'PropTech', 'Real Estate', 'Retail', 'Robotics', 'SaaS', 'Telecommunications', 
    'Transportation',
].map(i => ({value: i, label: i}));

const investmentStageOptions = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Public",
];

const getInitials = (name: string | null | undefined) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[1]) {
      return `${names[0][0]}${names[1][0]}`;
    }
    if (name) {
      return name.substring(0, 2);
    }
    return "";
};

export function StartupProfileForm({ initialData }: { initialData: Partial<StartupProfile> | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, refetchUserDetails } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isRewriting, setIsRewriting] = useState<string | null>(null);
  const [, startRewriteTransition] = useTransition();
  const [isLinking, setIsLinking] = useState<string | null>(null);


  const [rewriteState, rewriteAction, isRewritePending] = useActionState(rewriteStartupProfileField, {status: 'idle', message: ''});

  const isNewProfile = !initialData?.shortDescription;

  const defaultValues = useMemo(() => ({
    userName: initialData?.userName || "",
    userEmail: initialData?.userEmail || "",
    yourRole: initialData?.yourRole || "",
    companyName: initialData?.companyName || "",
    companyWebsite: initialData?.companyWebsite || "",
    companyLogoUrl: initialData?.companyLogoUrl || "",
    industry: initialData?.industry || [],
    investmentStage: initialData?.investmentStage || "",
    investmentRaised: initialData?.investmentRaised || "",
    largestInvestor: initialData?.largestInvestor || "",
    shortDescription: initialData?.shortDescription || "",
    currentChallenge: initialData?.currentChallenge || "",
    whyUs: initialData?.whyUs || "",
  }), [initialData]);

  const form = useForm<StartupProfileFormValues>({
    resolver: zodResolver(startupProfileSchema),
    defaultValues,
    mode: 'onChange'
  });
  
  const watchedLogoUrl = form.watch('companyLogoUrl');
  const watchedCompanyName = form.watch('companyName');

  useEffect(() => {
    if (rewriteState.status === 'success' && rewriteState.rewrittenText && rewriteState.field) {
        form.setValue(rewriteState.field as any, rewriteState.rewrittenText, { shouldValidate: true });
        toast({ title: 'Success', description: `Field rewritten.` });
    } else if (rewriteState.status === 'error') {
        toast({ title: 'Error', description: rewriteState.message, variant: 'destructive' });
    }
    if (!isRewritePending) {
        setIsRewriting(null);
    }
  }, [rewriteState, form, toast, isRewritePending]);


  const handleRewrite = async (fieldName: 'shortDescription' | 'currentChallenge' | 'whyUs', fieldLabel: string) => {
    startRewriteTransition(() => {
        setIsRewriting(fieldName);
        const currentValue = form.getValues(fieldName);
        rewriteAction({
          fieldName: fieldLabel,
          currentValue: currentValue,
        });
    });
  };
  
  const handleLinkAccount = async (providerName: 'google' | 'github' | 'microsoft' | 'twitter' | 'yahoo') => {
    if (!user) return;
    
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
            break;
        case 'yahoo':
            provider = new OAuthProvider('yahoo.com');
            break;
    }

    setIsLinking(providerName);
    try {
        await linkWithPopup(user, provider);
        toast({ title: "Account Linked!", description: `Your ${providerName} account has been successfully linked.` });
        await refetchUserDetails();
    } catch (error: any) {
        let message = "An unknown error occurred.";
        if (error.code === 'auth/credential-already-in-use') {
            message = "This account is already linked to another user.";
        }
        toast({ title: "Linking Failed", description: message, variant: "destructive" });
    } finally {
        setIsLinking(null);
    }
  }


  const onSubmit = (data: StartupProfileFormValues) => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in to save your profile.", variant: "destructive"});
        return;
    }
    startTransition(async () => {
      const result = await saveStartupProfile(user.uid, data);

      if (result.status === "success") {
        if (analytics) {
            logEvent(analytics, 'post_score', {
                score: 1,
                level: 1,
                character: 'startup_profile',
                content_type: 'profile',
            });
        }
        await refetchUserDetails();
        toast({
          title: "Success!",
          description: result.message,
        });
        router.push("/startups/profile/view");
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };
  
  const connectedProviders = user?.providerData.map(p => p.providerId.replace('.com','')) || [];

  return (
    <Form {...form}>
       <h1 className="text-2xl font-bold mb-2">My Startup Profile</h1>
        <p className="text-muted-foreground mb-6">Keep your company information up-to-date to attract the best talent.</p>

        {isNewProfile && (
          <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wand2 /> Get Started with AI</CardTitle>
                <CardDescription>
                    Fill out the fields below, especially the "Company Story" section. Use the <Wand2 className="inline-block h-4 w-4" /> buttons next to each field to let our AI help you craft a compelling and professional narrative.
                </CardDescription>
            </CardHeader>
          </Card>
        )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader><CardTitle>Company Story</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                        control={form.control}
                        name="shortDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Company Mission</FormLabel>
                                <FormDescription>A concise and powerful summary of your company's mission and value proposition.</FormDescription>
                                <div className="flex items-start gap-2">
                                    <FormControl>
                                        <Textarea rows={4} placeholder="e.g. We are building the future of..." {...field} />
                                    </FormControl>
                                    <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('shortDescription', 'Short Description')} disabled={isRewritePending}>
                                        {isRewriting === 'shortDescription' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                         <FormField
                        control={form.control}
                        name="currentChallenge"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Challenge</FormLabel>
                                <FormDescription>Articulate the core business problem you're trying to solve.</FormDescription>
                                <div className="flex items-start gap-2">
                                     <FormControl>
                                        <Textarea rows={4} placeholder="e.g. Our primary challenge is scaling our sales team..." {...field} />
                                     </FormControl>
                                     <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('currentChallenge', 'Current Challenge')} disabled={isRewritePending}>
                                         {isRewriting === 'currentChallenge' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                                     </Button>
                                 </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                         <FormField
                        control={form.control}
                        name="whyUs"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Why Join Us?</FormLabel>
                                <FormDescription>Craft a compelling narrative about your company's unique strengths, culture, and market opportunity.</FormDescription>
                                 <div className="flex items-start gap-2">
                                     <FormControl>
                                        <Textarea rows={4} placeholder="e.g. You'll be joining a passionate team..." {...field} />
                                     </FormControl>
                                     <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('whyUs', 'Why Us')} disabled={isRewritePending}>
                                         {isRewriting === 'whyUs' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                                     </Button>
                                 </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                    </CardContent>
                 </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader><CardTitle>Company Logo</CardTitle></CardHeader>
                    <CardContent className="space-y-4 flex flex-col items-center">
                       <FormField
                            control={form.control}
                            name="companyLogoUrl"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <div className="flex flex-col items-center gap-4">
                                        <Avatar className="h-24 w-24 rounded-md">
                                            <AvatarImage src={watchedLogoUrl} className="object-contain" />
                                            <AvatarFallback className="rounded-md">{getInitials(watchedCompanyName)}</AvatarFallback>
                                        </Avatar>
                                        <FormControl>
                                            <div>
                                                <Input type="file" id="logo-upload" className="sr-only" onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        const file = e.target.files[0];
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            field.onChange(reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }} />
                                                 <label htmlFor="logo-upload" className="cursor-pointer">
                                                    <Button type="button" variant="outline" asChild>
                                                        <span><Upload className="mr-2 h-4 w-4"/> Upload Logo</span>
                                                    </Button>
                                                </label>
                                                <Input type="text" {...field} className="sr-only" />
                                            </div>
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Company Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <FormField
                            control={form.control}
                            name="companyName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Acme Inc." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="companyWebsite"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Company Website</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="industry"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Industry</FormLabel>
                                <FormControl>
                                     <MultiSelect
                                        options={industryOptionsList}
                                        defaultValue={field.value || []}
                                        onValueChange={field.onChange}
                                        placeholder="Select industries..."
                                        creatable
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Funding</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4">
                        <FormField
                            control={form.control}
                            name="investmentStage"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Investment Stage</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {investmentStageOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="investmentRaised"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Total Capital Raised (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. $5M" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="largestInvestor"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Largest Investor (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Sequoia Capital" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader><CardTitle>Primary Contact</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="userName"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Your Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. John Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="userEmail"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Your Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. john@acme.com" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="yourRole"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Your Role</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. CEO, Founder" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Account Security</CardTitle>
                        <CardDescription>Connect other sign-in methods to your account.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => handleLinkAccount('google')}
                            disabled={isLinking !== null || connectedProviders.includes('google')}
                        >
                            {isLinking === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                            {connectedProviders.includes('google') ? 'Connected to Google' : 'Connect Google Account'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                             onClick={() => handleLinkAccount('github')}
                            disabled={isLinking !== null || connectedProviders.includes('github')}
                        >
                             {isLinking === 'github' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitHubIcon className="mr-2 h-4 w-4" />}
                            {connectedProviders.includes('github') ? 'Connected to GitHub' : 'Connect GitHub Account'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                             onClick={() => handleLinkAccount('microsoft')}
                            disabled={isLinking !== null || connectedProviders.includes('microsoft')}
                        >
                             {isLinking === 'microsoft' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MicrosoftIcon className="mr-2 h-4 w-4" />}
                            {connectedProviders.includes('microsoft') ? 'Connected to Microsoft' : 'Connect Microsoft Account'}
                        </Button>
                         <Button 
                            variant="outline" 
                            className="w-full justify-start"
                             onClick={() => handleLinkAccount('twitter')}
                            disabled={isLinking !== null || connectedProviders.includes('twitter')}
                        >
                             {isLinking === 'twitter' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TwitterIcon className="mr-2 h-4 w-4" />}
                            {connectedProviders.includes('twitter') ? 'Connected to Twitter' : 'Connect Twitter Account'}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start"
                             onClick={() => handleLinkAccount('yahoo')}
                            disabled={isLinking !== null || connectedProviders.includes('yahoo')}
                        >
                             {isLinking === 'yahoo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <YahooIcon className="mr-2 h-4 w-4" />}
                            {connectedProviders.includes('yahoo') ? 'Connected to Yahoo' : 'Connect Yahoo Account'}
                        </Button>
                    </CardContent>
                 </Card>
            </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isRewritePending} className="w-full">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isNewProfile ? "Save Profile" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
