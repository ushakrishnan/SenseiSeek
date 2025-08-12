
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Briefcase,
  DollarSign,
  Clock,
  MapPin,
  Pencil,
  Building,
  Link as LinkIcon,
  AlertCircle,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { StartupNeeds } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function ViewNeedClient({ initialData, errorMessage }: { initialData: StartupNeeds | null, errorMessage?: string | null }) {
    const { id } = useParams();

  if (errorMessage) {
    return (
        <Card className="text-center">
            <CardHeader>
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <CardTitle>Error</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  if (!initialData) {
    return (
        <Card className="text-center">
            <CardHeader>
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle>Not Found</CardTitle>
                <CardDescription>Could not find the requested need.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/startups/needs">Back to Needs</Link>
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  const need = initialData;

  return (
    <div className="mx-auto">
        <div className="flex justify-end mb-6 gap-2">
            <Button asChild variant="outline">
                <Link href={`/startups/applicants?need=${id}`}>
                    <Users className="mr-2 h-4 w-4" />
                    View Applicants
                </Link>
            </Button>
            <Button asChild>
                <Link href={`/startups/needs/edit/${id}`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Need
                </Link>
            </Button>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-bold">{need.roleTitle}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{need.companyName}</span>
                </div>
            </CardHeader>
            <CardContent>
                    <div className="flex flex-wrap gap-2 mb-6">
                    <Badge variant="secondary" className="flex items-center"><MapPin className="mr-1.5 h-3 w-3"/>{need.locationPreference}</Badge>
                    <Badge variant="secondary" className="flex items-center"><DollarSign className="mr-1.5 h-3 w-3"/>{need.budget}</Badge>
                    <Badge variant="secondary" className="flex items-center"><Clock className="mr-1.5 h-3 w-3"/>{need.engagementLength}</Badge>
                    <Badge variant="secondary" className="flex items-center"><Briefcase className="mr-1.5 h-3 w-3"/>{need.companyStage}</Badge>
                </div>
                <Separator className="my-6"/>
                <div className="space-y-6 prose prose-sm dark:prose-invert max-w-none">
                    <div>
                        <h3 className="font-semibold text-foreground">Role Summary</h3>
                        <p className="text-muted-foreground">{need.roleSummary}</p>
                    </div>
                        <div>
                        <h3 className="font-semibold text-foreground">Key Deliverables</h3>
                        <p className="text-muted-foreground whitespace-pre-wrap">{need.keyDeliverables}</p>
                    </div>
                    {need.keyChallenges && (
                            <div>
                            <h3 className="font-semibold text-foreground">Key Challenges</h3>
                            <p className="text-muted-foreground whitespace-pre-wrap">{need.keyChallenges}</p>
                        </div>
                    )}
                        <div>
                        <h3 className="font-semibold text-foreground">Required Expertise</h3>
                        <div className="flex flex-wrap gap-2">
                            {(Array.isArray(need.requiredExpertise) ? need.requiredExpertise : need.requiredExpertise.split(',')).map(skill => (
                                <Badge key={skill} variant="outline">{skill.trim()}</Badge>
                            ))}
                        </div>
                    </div>
                     {(need.links?.companyWebsite || need.links?.jobPosting) && (
                         <div>
                             <h3 className="font-semibold text-foreground">Relevant Links</h3>
                            <div className="flex flex-col gap-2">
                                {need.links.companyWebsite && (
                                    <a href={need.links.companyWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                        <LinkIcon className="h-4 w-4"/>
                                        Company Website
                                    </a>
                                )}
                                 {need.links.jobPosting && (
                                    <a href={need.links.jobPosting} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                                        <LinkIcon className="h-4 w-4"/>
                                        External Job Posting
                                    </a>
                                )}
                            </div>
                         </div>
                    )}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
