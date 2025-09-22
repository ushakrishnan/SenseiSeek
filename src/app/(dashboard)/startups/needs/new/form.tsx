

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTransition, useState, useMemo, useActionState, useEffect } from "react";

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
  createStartupNeed,
  updateStartupNeed,
  rewriteJobDescriptionField,
} from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { startupNeedsSchema } from "@/lib/schemas";
import type { StartupNeeds, StartupProfile } from "@/lib/types";
import { Loader2, Wand2 } from "lucide-react";
import { allSkills } from "@/lib/constants";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { analytics } from "@/lib/firebase-client";
import { logEvent } from "firebase/analytics";

type StartupNeedsFormValues = z.infer<typeof startupNeedsSchema>;

interface StartupNeedsFormProps {
  initialData?: StartupNeeds | null;
}

const engagementOptions = [
  "Project-based (1-3 months)",
  "Interim (3-6 months)",
  "Fractional (6+ months)",
  "Advisory",
];
const budgetOptions = [
  "$5,000 - $8,000 / month",
  "$8,000 - $12,000 / month",
  "$12,000 - $18,000 / month",
  "$18,000 - $25,000 / month",
  "$25,000+ / month",
  "Equity only",
];
const companyStageOptions = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Public",
];
const locationOptions = ["Remote", "Hybrid", "On-site"];
const skillOptions = allSkills.map(skill => ({ value: skill, label: skill }));

export function StartupNeedsForm({ initialData }: StartupNeedsFormProps) {
  const router = useRouter();
  const { user, userDetails } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isRewriting, setIsRewriting] = useState<string | null>(null);
  const [rewriteState, rewriteAction, isRewritePending] = useActionState(rewriteJobDescriptionField, {status: 'idle', message: ''});


  const isEditMode = !!initialData;
  const startupProfile = userDetails?.profile as Partial<StartupProfile> | null;

  const defaultValues = useMemo(() => ({
    companyName: initialData?.companyName || startupProfile?.companyName || "",
    companyStage: initialData?.companyStage || startupProfile?.investmentStage || "",
    roleTitle: initialData?.roleTitle || "",
    roleSummary: initialData?.roleSummary || "",
    keyDeliverables: initialData?.keyDeliverables || "",
    keyChallenges: initialData?.keyChallenges || "",
    requiredExpertise: Array.isArray(initialData?.requiredExpertise) ? initialData.requiredExpertise : [],
    engagementLength: initialData?.engagementLength || "",
    budget: initialData?.budget || "",
    locationPreference: initialData?.locationPreference || "",
    links: {
        companyWebsite: initialData?.links?.companyWebsite || startupProfile?.companyWebsite || "",
        jobPosting: initialData?.links?.jobPosting || "",
        linkedinProfile: initialData?.links?.linkedinProfile || ""
    },
  }), [initialData, startupProfile]);

  const form = useForm<StartupNeedsFormValues>({
    resolver: zodResolver(startupNeedsSchema),
    defaultValues,
  });

  useEffect(() => {
    if (rewriteState.status === 'success' && rewriteState.rewrittenText && rewriteState.field) {
        form.setValue(rewriteState.field as any, rewriteState.rewrittenText, { shouldValidate: true });
        toast({ title: 'Success', description: `${rewriteState.fieldName} rewritten.` });
    } else if (rewriteState.status === 'error') {
        toast({ title: 'Error', description: rewriteState.message, variant: 'destructive' });
    }
    if(!isRewritePending) {
      setIsRewriting(null);
    }
  },[rewriteState, isRewritePending, form, toast]);

   const handleRewrite = (fieldName: keyof StartupNeedsFormValues, fieldLabel: string) => {
    startTransition(() => {
        setIsRewriting(fieldName);
        const currentValue = form.getValues(fieldName);
        rewriteAction({
          fieldName: fieldLabel,
          currentValue: currentValue as string,
        });
    });
  };


  const onSubmit = (data: StartupNeedsFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create or update a need.", variant: "destructive"});
      return;
    }

    startTransition(async () => {
      const action = isEditMode
        ? updateStartupNeed(initialData.id, data)
        : createStartupNeed(user.uid, data);

      const result = await action;

      if (result.status === "success") {
        if (analytics && result.needId) {
            logEvent(analytics, 'post_score', {
                score: 1,
                level: 1,
                character: isEditMode ? 'startup_need_edit' : 'startup_need_create',
                content_type: 'opportunity',
                item_id: result.needId
            });
        }
        toast({
          title: "Success!",
          description: result.message,
        });
        router.push("/startups/needs");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader><CardTitle>Role Details</CardTitle></CardHeader>
                     <CardContent className="space-y-4">
                        <FormField
                        control={form.control}
                        name="roleTitle"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role Title</FormLabel>
                                <FormDescription>A concise, compelling title for the position (e.g., "Fractional CMO", "Interim COO"). Max 50 characters.</FormDescription>
                                <div className="flex items-center gap-2">
                                    <FormControl>
                                        <Input placeholder="e.g. Fractional CMO" {...field} />
                                    </FormControl>
                                    <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('roleTitle', 'Role Title')} disabled={!!isRewriting}>
                                        {isRewriting === 'roleTitle' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="roleSummary"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role Summary</FormLabel>
                                <FormDescription>Briefly describe the core mission and objectives of this role.</FormDescription>
                                <div className="flex items-start gap-2">
                                     <FormControl>
                                        <Textarea rows={4} placeholder="e.g. We are seeking a Fractional CMO to lead our go-to-market strategy for a new B2B SaaS product..." {...field} />
                                     </FormControl>
                                     <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('roleSummary', 'Project Scope')} disabled={!!isRewriting}>
                                         {isRewriting === 'roleSummary' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                                     </Button>
                                 </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="keyDeliverables"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Key Deliverables</FormLabel>
                                <FormDescription>What are the primary outcomes or results this person will be responsible for?</FormDescription>
                                 <div className="flex items-start gap-2">
                                     <FormControl>
                                        <Textarea rows={4} placeholder="e.g. - Develop and execute a GTM strategy. - Build a 3-month marketing roadmap. - Achieve 50 new MQLs per month." {...field} />
                                     </FormControl>
                                      <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('keyDeliverables', 'Key Deliverables')} disabled={!!isRewriting}>
                                         {isRewriting === 'keyDeliverables' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                                     </Button>
                                 </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="keyChallenges"
                        render={({ field }) => (
                            <FormItem>
                                 <FormLabel>Key Challenges or Dealbreakers (Optional)</FormLabel>
                                <FormDescription>Are there any specific hurdles, non-negotiables, or must-have experiences for this role?</FormDescription>
                                 <div className="flex items-start gap-2">
                                     <FormControl>
                                        <Textarea rows={3} placeholder="e.g. Must have experience displacing a large legacy competitor in the enterprise space." {...field} />
                                     </FormControl>
                                     <Button type="button" size="icon" variant="ghost" onClick={() => handleRewrite('keyChallenges', 'Key Challenges')} disabled={!!isRewriting}>
                                         {isRewriting === 'keyChallenges' ? <Loader2 className="animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
                                     </Button>
                                 </div>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                         <FormField
                            control={form.control}
                            name="requiredExpertise"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Required Expertise</FormLabel>
                                <FormDescription>Select the key skills and expertise required for this role.</FormDescription>
                                <FormControl>
                                    <MultiSelect
                                        options={skillOptions}
                                        defaultValue={field.value}
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
                    <CardHeader><CardTitle>Logistics</CardTitle></CardHeader>
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
                            name="companyStage"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Company Stage</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select stage" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {companyStageOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="engagementLength"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Engagement Length</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select length" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {engagementOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="budget"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Budget (Monthly Retainer)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select budget" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {budgetOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
                                <FormLabel>Location Preference</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            name="links.companyWebsite"
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
                            name="links.jobPosting"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>External Job Posting</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://linkedin.com/jobs/..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="links.linkedinProfile"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Your LinkedIn Profile</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://linkedin.com/in/..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     </CardContent>
                 </Card>
            </div>
        </div>

        <div className="flex justify-end mt-8">
          <Button type="submit" disabled={isPending || isRewritePending} className="w-full">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {isEditMode ? "Save Changes" : "Create Need"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
