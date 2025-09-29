"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTransition, useState, useMemo, useEffect } from "react";
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
    postParseResume,
    postRewriteExecutiveField,
    postGithubInsights,
    saveExecutiveProfile as clientSaveExecutiveProfile,
} from "@/lib/client-actions";
import { useToast } from "@/hooks/use-toast";
import { executiveProfileSchema } from "@/lib/schemas";
import type { ExecutiveProfile } from "@/lib/types";
import { Loader2, Wand2, Trash2, PlusCircle, Info, Upload } from "lucide-react";
import { allSkills } from "@/lib/constants";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth-provider";
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

type ExecutiveProfileFormValues = z.infer<typeof executiveProfileSchema>;

const availabilityOptions = [
    "Full-time (40 hours/week)",
    "Part-time (20-30 hours/week)",
    "Part-time (10-20 hours/week)",
    "Project-based",
    "Advisory",
];
const compensationOptions = [
    "$5,000 - $8,000 / month",
    "$8,000 - $12,000 / month",
    "$12,000 - $18,000 / month",
    "$18,000 - $25,000 / month",
    "$25,000+ / month",
    "Equity only",
];
const locationOptions = ["Remote", "Hybrid", "On-site"];
const skillOptions = allSkills.map(skill => ({ value: skill, label: skill }));

const initialParseState = { formState: 'idle' as const, message: '', fields: undefined };
const initialGithubInsightsState = { formState: 'idle' as const, message: '', insights: '' };

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

export function ExecutiveProfileForm({ initialData }: { initialData: Partial<ExecutiveProfile> | null }) {
    const router = useRouter();
    const { toast } = useToast();
    const { user, refetchUserDetails } = useAuth();
    const [isSaving, startSaving] = useTransition();
    const [isGhTransitionPending, startGhTransition] = useTransition();
    const [isRewriting, setIsRewriting] = useState<string | null>(null);
    const [isParseDialogOpen, setIsParseDialogOpen] = useState(false);
    const [isLinking, setIsLinking] = useState<string | null>(null);

    const [parseState, setParseState] = useState<any>(initialParseState);
    const [isParsing, setIsParsing] = useState(false);

    const handleParseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsParsing(true);
        try {
            const formData = new FormData(e.currentTarget as HTMLFormElement);
            const resume = String(formData.get('resume') || '');
            const res: any = await postParseResume({ resume });
            if (res?.status === 'success') {
                setParseState(res);
            } else {
                setParseState({ formState: 'error', message: res?.message || 'Unknown error' });
            }
        } catch (err: unknown) {
            const e = err as { message?: string } | undefined;
            setParseState({ formState: 'error', message: e?.message || String(err) });
        } finally {
            setIsParsing(false);
        }
    };

    const [ghState, setGhState] = useState<any>(initialGithubInsightsState);
    const [isGhPending, setIsGhPending] = useState(false);

    const [rewriteState, setRewriteState] = useState<any>({ status: 'idle', message: '' });
    const [isRewritePending, setIsRewritePending] = useState(false);


    const isNewProfile = !initialData?.expertise;

    const defaultValues = useMemo(() => ({
        name: initialData?.name || "",
        photoUrl: initialData?.photoUrl || "",
        expertise: initialData?.expertise || "",
        industryExperience: initialData?.industryExperience || [],
        availability: initialData?.availability || "",
        desiredCompensation: initialData?.desiredCompensation || "",
        locationPreference: initialData?.locationPreference || "",
        city: initialData?.city || "",
        state: initialData?.state || "",
        country: initialData?.country || "",
        keyAccomplishments: initialData?.keyAccomplishments && initialData.keyAccomplishments.length > 0 ? initialData.keyAccomplishments : [{ value: "" }],
        links: {
            linkedinProfile: initialData?.links?.linkedinProfile || "",
            personalWebsite: initialData?.links?.personalWebsite || "",
            portfolio: initialData?.links?.portfolio || "",
        },
        githubHandle: initialData?.githubHandle || "",
        githubInsights: initialData?.githubInsights || "",
        resumeText: initialData?.resumeText || "",
    }), [initialData]);

    const form = useForm<ExecutiveProfileFormValues>({
        resolver: zodResolver(executiveProfileSchema),
        defaultValues,
        mode: 'onChange',
    });

    const watchedPhotoUrl = form.watch('photoUrl');
    const watchedName = form.watch('name');

    const { fields: accomplishmentFields, append: appendAccomplishment, remove: removeAccomplishment } = useFieldArray({
        control: form.control,
        name: "keyAccomplishments",
    });

    useEffect(() => {
        if (parseState?.formState === 'success' && parseState.fields) {
            Object.entries(parseState.fields).forEach(([key, value]) => {
                form.setValue(key as keyof ExecutiveProfileFormValues, value as unknown as any, { shouldValidate: true });
            });
            toast({ title: 'Success', description: parseState.message });
            setIsParseDialogOpen(false);
        } else if (parseState?.formState === 'error') {
            toast({ title: 'Error', description: parseState.message, variant: 'destructive' });
        }
    }, [parseState, form, toast]);

    // When GitHub insights are returned, prefill the `githubInsights` form value
    useEffect(() => {
        if (ghState?.formState === 'success' && ghState.insights) {
            form.setValue('githubInsights' as keyof ExecutiveProfileFormValues, ghState.insights as unknown as any, { shouldValidate: true });
            toast({ title: 'GitHub insights generated', description: 'Review the highlights below and edit before saving to your profile.' });
        } else if (ghState?.formState === 'error') {
            toast({ title: 'GitHub insights failed', description: ghState.message, variant: 'destructive' });
        }
    }, [ghState, form, toast]);

    useEffect(() => {
        if (rewriteState?.status === 'success' && rewriteState.rewrittenText) {
            if (rewriteState.field === 'expertise') {
                form.setValue('expertise', rewriteState.rewrittenText, { shouldValidate: true });
            } else if (rewriteState.field === 'accomplishment' && rewriteState.index !== undefined) {
                form.setValue(`keyAccomplishments.${rewriteState.index}.value` as unknown as keyof ExecutiveProfileFormValues, rewriteState.rewrittenText as any, { shouldValidate: true });
            }
            toast({ title: 'Success', description: `Field rewritten.` });
        } else if (rewriteState?.status === 'error') {
            toast({ title: 'Error', description: rewriteState.message, variant: 'destructive' });
        }
        if (!isRewritePending) {
            setIsRewriting(null);
        }
    }, [rewriteState, form, toast, isRewritePending]);

    const handleRewrite = (fieldName: 'expertise' | 'accomplishment', fieldLabel: string, index?: number) => {
        startSaving(async () => {
            setIsRewriting(fieldName + (index ?? ''));
            setIsRewritePending(true);
            const allValues = form.getValues();
            const currentValue = fieldName === 'expertise'
                ? String(allValues.expertise ?? '')
                : String(allValues.keyAccomplishments?.[index as number]?.value ?? '');
            try {
                const res: any = await postRewriteExecutiveField({ fieldName: fieldLabel, currentValue, index });
                if (res?.status === 'success') {
                    setRewriteState(res);
                } else {
                    setRewriteState({ status: 'error', message: res?.message || 'Unknown error' });
                }
            } catch (e: unknown) {
                const ee = e as { message?: string } | undefined;
                setRewriteState({ status: 'error', message: ee?.message || String(e) });
            } finally {
                setIsRewritePending(false);
            }
        })
    };

    const handleLinkAccount = async (providerName: 'google' | 'github' | 'microsoft' | 'twitter' | 'yahoo') => {
        if (!user) return;

        let provider;
        switch (providerName) {
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


    const onSubmit = async (data: ExecutiveProfileFormValues) => {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in to save your profile.", variant: "destructive" });
            return;
        }
        startSaving(async () => {
            // Use HTTP API adapter which returns ApiResponse<{ status: string; message: string }>
            try {
                const res: any = await clientSaveExecutiveProfile(user.uid, data);
                if (res?.status === 'success') {
                    if (analytics) {
                        logEvent(analytics, 'post_score', {
                            score: 1,
                            level: 1,
                            character: 'executive_profile',
                            content_type: 'profile',
                        });
                    }
                    await refetchUserDetails();
                    toast({ title: 'Success!', description: res.data.message });
                    router.push('/executives/profile/view');
                    router.refresh();
                } else {
                    const message = res?.message || res?.error || 'Unknown error';
                    toast({ title: 'Error', description: message, variant: 'destructive' });
                }
            } catch (e: any) {
                toast({ title: 'Error', description: e?.message || String(e), variant: 'destructive' });
            }
        });
    };

    const connectedProviders = user?.providerData.map(p => p.providerId.replace('.com', '')) || [];

    return (
        <Form {...form}>
            <div className="flex flex-col-reverse md:flex-row gap-8 items-start">
                <div className="flex-1 w-full">
                    <h1 className="text-2xl font-bold mb-2">My Executive Profile</h1>
                    <p className="text-muted-foreground mb-6">The more details you provide, the better we can match you with the perfect role.</p>
                </div>
            </div>

            {isNewProfile && (
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wand2 /> Get Started with AI</CardTitle>
                        <CardDescription>
                            To get started quickly, paste your resume text or a URL to your LinkedIn profile below. We'll use AI to pre-fill your profile.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleParseSubmit}>
                        <CardContent className="space-y-4">
                            <Textarea name="resume" rows={8} placeholder="Paste resume text or URL here..." />
                            <Button type="submit" disabled={isParsing}>
                                {isParsing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Parsing...
                                    </>
                                ) : 'Parse Resume'}
                            </Button>
                        </CardContent>
                    </form>
                </Card>
            )}

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Professional Summary */}
                        <Card>
                            <CardHeader><CardTitle>Professional Summary</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="expertise"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Expertise Summary</FormLabel>
                                            <FormDescription>A powerful "elevator pitch" that highlights your primary value proposition.</FormDescription>
                                            <div className="flex items-start gap-2">
                                                <FormControl>
                                                    <Textarea rows={5} placeholder="e.g. I am a Fractional CMO with over 15 years of experience..." {...field} />
                                                </FormControl>
                                                <div className="flex flex-col gap-1">
                                                    <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('expertise', 'Expertise Summary')} disabled={isRewritePending}>
                                                        {isRewriting === 'expertise' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="keyAccomplishments"
                                    render={() => (
                                        <FormItem>
                                            <div className="flex items-center gap-2">
                                                <FormLabel>Key Accomplishments</FormLabel>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger type="button">
                                                            <Info className="h-4 w-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="max-w-xs">
                                                                Use the STAR method:
                                                                <br />- <strong>S</strong>ituation: Context of the story.
                                                                <br />- <strong>T</strong>ask: Your responsibility.
                                                                <br />- <strong>A</strong>ction: What did you do?
                                                                <br />- <strong>R</strong>esult: What was the outcome?
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            <FormDescription>List your top 3-5 achievements. Use metrics where possible (e.g., "Increased MQLs by 300% in 6 months").</FormDescription>
                                            <div className="space-y-4">
                                                {accomplishmentFields.map((item, index) => (
                                                    <FormField
                                                        key={item.id}
                                                        control={form.control}
                                                        name={`keyAccomplishments.${index}.value`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <div className="flex items-start gap-2">
                                                                    <FormControl>
                                                                        <Textarea {...field} rows={2} placeholder={`Accomplishment #${index + 1}`} />
                                                                    </FormControl>
                                                                    <div className="flex flex-col gap-1">
                                                                        <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('accomplishment', 'Key Accomplishments', index)} disabled={isRewritePending}>
                                                                            {isRewriting === ('accomplishment' + index) ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                                                        </Button>
                                                                        {accomplishmentFields.length > 1 && (
                                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeAccomplishment(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => appendAccomplishment({ value: "" })}
                                            >
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Accomplishment
                                            </Button>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="industryExperience"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Skills & Industry Experience</FormLabel>
                                            <FormDescription>Select the skills and industries that best represent your expertise.</FormDescription>
                                            <FormControl>
                                                <MultiSelect
                                                    options={skillOptions}
                                                    defaultValue={field.value || []}
                                                    onValueChange={field.onChange}
                                                    placeholder="Select skills..."
                                                    creatable
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Profile Photo</CardTitle></CardHeader>
                            <CardContent className="space-y-4 flex flex-col items-center">
                                <FormField
                                    control={form.control}
                                    name="photoUrl"
                                    render={({ field }) => (
                                        <FormItem className="w-full">
                                            <div className="flex flex-col items-center gap-4">
                                                <Avatar className="h-24 w-24">
                                                    <AvatarImage src={watchedPhotoUrl} className="object-cover" />
                                                    <AvatarFallback>{getInitials(watchedName)}</AvatarFallback>
                                                </Avatar>
                                                <FormControl>
                                                    <div>
                                                        <Input type="file" id="photo-upload" className="sr-only" onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                const file = e.target.files[0];
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    field.onChange(reader.result as string);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }} />
                                                        <label htmlFor="photo-upload" className="cursor-pointer">
                                                            <Button type="button" variant="outline" asChild>
                                                                <span><Upload className="mr-2 h-4 w-4" /> Upload Photo</span>
                                                            </Button>
                                                        </label>
                                                        {/* Hidden input to hold the URL value for the form */}
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
                            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Jane Doe" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>City</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. San Francisco" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex gap-4">
                                    <FormField
                                        control={form.control}
                                        name="state"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>State / Province</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. CA" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem className="flex-1">
                                                <FormLabel>Country</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. USA" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Your Preferences</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="availability"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Availability</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select your availability" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {availabilityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="desiredCompensation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Desired Compensation</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select your desired compensation" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {compensationOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="locationPreference"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Work Location Preference</FormLabel>
                                            <FormDescription>Where would you prefer to work?</FormDescription>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select location preference" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {locationOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader><CardTitle>Relevant Links (Optional)</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="links.linkedinProfile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>LinkedIn Profile</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://linkedin.com/in/..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="links.personalWebsite"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Personal Website</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="links.portfolio"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Portfolio / Other</FormLabel>
                                            <FormControl>
                                                <Input placeholder="https://github.com/..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="githubHandle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GitHub Handle</FormLabel>
                                            <FormDescription>Provide your GitHub username (e.g., <em>ushakrishnan</em>) so we can analyze public repositories to generate highlights. You'll be able to review and edit these insights before saving them to your profile. This helps our AI better understand your capabilities and improves matching.</FormDescription>
                                            <div className="flex items-center gap-2">
                                                <FormControl>
                                                    <Input placeholder="e.g. ushakrishnan" {...field} />
                                                </FormControl>
                                                <Button type="button" onClick={async () => {
                                                    // New: call HTTP API via adapter to demonstrate migration path
                                                    startGhTransition(async () => {
                                                        try {
                                                            const { postGithubInsights } = await import('@/lib/client-actions');
                                                            const repo = String(field.value || '');
                                                            const res: any = await postGithubInsights(repo);
                                                            if (res?.status === 'success' || res?.insights || res?.data) {
                                                                const insights = res?.insights || res?.data?.insights || JSON.stringify(res?.data);
                                                                form.setValue('githubInsights' as any, insights, { shouldValidate: true });
                                                                toast({ title: 'GitHub insights generated', description: 'Insights loaded from API.' });
                                                            } else {
                                                                toast({ title: 'GitHub insights failed', description: res?.message || res?.error || 'Unknown error', variant: 'destructive' });
                                                            }
                                                        } catch (e: any) {
                                                            toast({ title: 'GitHub insights failed', description: e?.message || String(e), variant: 'destructive' });
                                                        }
                                                    });
                                                }} disabled={isGhPending || isGhTransitionPending}>
                                                    {isGhPending || isGhTransitionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GitHubIcon className="mr-2 h-4 w-4" />}
                                                    Analyze (API)
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        {/* GitHub Highlights (editable) */}
                        <Card>
                            <CardHeader>
                                <CardTitle>GitHub Highlights</CardTitle>
                                <CardDescription>Generated from your public GitHub profile. Edit these highlights before saving them to your profile. They will be used to augment your profile for AI-based matching.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="githubInsights"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea rows={6} placeholder="GitHub highlights will appear here after analysis..." {...field} />
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

                <div className="flex justify-end mt-8">
                    <Button type="submit" disabled={isSaving || isRewritePending} className="w-full">
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {isNewProfile ? "Save Profile" : "Save Changes"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
