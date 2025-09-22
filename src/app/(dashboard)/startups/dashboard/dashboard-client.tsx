

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getStartupDashboardStats, updateApplicationStatus, toggleShortlistExecutive } from "@/lib/actions";
import type { StartupDashboardStats, ApplicationWithExecutive, ExecutiveProfile, ApplicationStatus, ConversationWithRecipient } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Users, Eye, ArrowRight, Info, Bookmark, Star, Clock, User, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

const statusOptions: ApplicationStatus[] = ['applied', 'in-review', 'hired', 'rejected'];

const StatusSelector = ({ applicationId, currentStatus }: { applicationId: string, currentStatus: ApplicationStatus }) => {
    const { toast } = useToast();
    const [status, setStatus] = useState(currentStatus);
    
    const handleStatusChange = async (newStatus: ApplicationStatus) => {
        const previousStatus = status;
        setStatus(newStatus);
        const result = await updateApplicationStatus({
          applicationId: applicationId,
          status: newStatus,
          sendMessage: false,
        });
        if (result.status === 'error') {
            setStatus(previousStatus);
            toast({ title: "Error", description: result.message, variant: "destructive" });
        } else {
             toast({ title: "Success", description: `Status updated to ${newStatus}.` });
        }
    }

    return (
        <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full text-xs h-9">
                <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
                {statusOptions.map(opt => <SelectItem key={opt} value={opt} className="capitalize text-xs">{opt.replace('-', ' ')}</SelectItem>)}
            </SelectContent>
        </Select>
    )
}

const ShortlistButton = ({ startupId, executiveId, isInitiallyShortlisted }: { startupId: string, executiveId: string, isInitiallyShortlisted: boolean | undefined }) => {
    const { toast } = useToast();
    const [isShortlisting, startTransition] = useTransition();
    const [isShortlisted, setIsShortlisted] = useState(isInitiallyShortlisted);

    const handleShortlistToggle = () => {
        if (!startupId) return;
        startTransition(async () => {
            const result = await toggleShortlistExecutive(startupId, executiveId, !!isShortlisted);
            if (result.status === 'success') {
                setIsShortlisted(result.newState === 'shortlisted');
                toast({ title: result.message });
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <Button variant="outline" size="icon" onClick={handleShortlistToggle} disabled={isShortlisting}>
            {isShortlisting ? <Loader2 className="animate-spin" /> : <Star className={cn("h-4 w-4", isShortlisted && "fill-primary text-primary")} />}
        </Button>
    )
}


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

const StatCard = ({ title, value, icon: Icon, link, linkText }: { title: string, value: string | number, icon: React.ElementType, link?: string, linkText?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {link && (
         <p className="text-xs text-muted-foreground mt-1">
            <Link href={link} className="hover:underline flex items-center">
                {linkText} <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
         </p>
      )}
    </CardContent>
  </Card>
);

export function DashboardClient() {
  const { user, userDetails } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<StartupDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && userDetails?.role === 'startup') {
      const hasProfile = !!(userDetails?.profile as any)?.companyName;
      if (!hasProfile) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      getStartupDashboardStats(user.uid)
        .then((result) => {
          if (result.status === "success" && result.stats) {
            setStats(result.stats);
          } else {
            setError(result.message);
             toast({
              title: "Error fetching dashboard data",
              description: result.message,
              variant: "destructive",
            });
          }
        })
        .catch((err) => {
            const msg = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(msg);
             toast({
              title: "Error",
              description: msg,
              variant: "destructive",
            });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!user) {
        setIsLoading(false);
    }
  }, [user, userDetails, toast]);
  
  const hasProfile = !!(userDetails?.profile as any)?.companyName;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center text-destructive py-12">Error: {error}</div>;
  }
  
  if (!hasProfile) {
    return (
      <Card>
        <CardHeader>
            <Info className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="text-center">Welcome to Sensei Seek!</CardTitle>
            <CardDescription className="text-center">
                To get started, please complete your startup's profile. This will allow you to post needs and attract top executive talent.
            </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <Button asChild>
                <Link href="/startups/profile">Create Your Profile</Link>
            </Button>
        </CardContent>
    </Card>
    )
  }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
                <StatCard title="Open Roles" value={stats?.openNeedsCount ?? 0} icon={FileText} link="/startups/needs" linkText="Manage Needs" />
                <StatCard title="Total Applicants" value={stats?.totalApplicants ?? 0} icon={Users} link="/startups/applicants" linkText="View Applicants" />
                <StatCard title="Saved by Executives" value={stats?.opportunitiesSavedCount ?? 0} icon={Bookmark} />
                <StatCard title="Shortlisted Talent" value={stats?.timesShortlisted ?? 0} icon={Star} link="/startups/shortlisted" linkText="View Shortlist" />
            </div>
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Inbox</CardTitle>
                        <CardDescription>Your most recent conversations.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats && Array.isArray(stats.recentConversations) && stats.recentConversations.length > 0 ? (
                            <div className="space-y-4">
                                {stats.recentConversations.slice(0, 3).map((convo: ConversationWithRecipient) => (
                                    <Link key={convo.id} href="/startups/inbox" className="flex items-center gap-4 p-2 -m-2 rounded-lg hover:bg-accent">
                                        <Avatar>
                                            <AvatarImage src={convo.recipientAvatarUrl} className="object-cover" />
                                            <AvatarFallback>{getInitials(convo.recipientName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 truncate">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-semibold text-sm">{convo.recipientName}</h4>
                                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: true })}</p>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">{convo.lastMessageText}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">You have no messages yet.</p>
                            </div>
                        )}
                    </CardContent>
                    {stats && Array.isArray(stats.recentConversations) && stats.recentConversations.length > 0 && (
                        <CardFooter>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href="/startups/inbox">View All Messages</Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Recent Applicants</CardTitle>
                <CardDescription>The latest executives who have applied to your open roles.</CardDescription>
            </CardHeader>
            <CardContent>
                {stats && Array.isArray(stats.recentApplicants) && stats.recentApplicants.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.recentApplicants.map((app: ApplicationWithExecutive) => {
                            const profile = app.executive as ExecutiveProfile;
                            return (
                                <Card key={app.id} className="flex flex-col">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className='flex items-start gap-4'>
                                                <Avatar className="w-16 h-16 rounded-md">
                                                    <AvatarImage src={profile.photoUrl} className="object-cover" />
                                                    <AvatarFallback className="text-xl rounded-md">{getInitials(profile.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <CardTitle>{profile.name}</CardTitle>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="whitespace-nowrap">
                                                <Clock className="w-3 h-3 mr-1.5" />
                                                Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                        <p className="text-sm text-muted-foreground">Applying for: <span className="font-medium text-foreground">{app.startupNeed.roleTitle}</span></p>
                                        <p className="text-sm text-muted-foreground line-clamp-3">{profile.expertise}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.isArray(profile.industryExperience) && profile.industryExperience.slice(0, 4).map((skill: string) => (
                                                <Badge key={skill} variant="secondary">{skill}</Badge>
                                            ))}
                                            {Array.isArray(profile.industryExperience) && profile.industryExperience.length > 4 && <Badge variant="outline">+{profile.industryExperience.length - 4} more</Badge>}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-2">
                                        <div className="w-full">
                                            <StatusSelector applicationId={app.id} currentStatus={app.status} />
                                        </div>
                                        <div className="flex w-full justify-end gap-2">
                                            <ShortlistButton startupId={user!.uid} executiveId={profile.id} isInitiallyShortlisted={profile.isShortlisted} />
                                            <Button asChild className="w-full">
                                                <Link href={`/startups/candidates/${profile.id}?from=applicants`}>
                                                    <User className="mr-2 h-4 w-4" />
                                                    View Profile
                                                </Link>
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">You have no applicants yet.</p>
                        <Button variant="link" asChild className="mt-2">
                            <Link href="/startups/needs/new">Post a new role to attract talent</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
