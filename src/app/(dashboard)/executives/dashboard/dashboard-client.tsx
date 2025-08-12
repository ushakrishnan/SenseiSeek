
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getExecutiveDashboardStats } from "@/lib/actions";
import type { ExecutiveDashboardStats, MatchResult, StartupNeeds, ConversationWithRecipient } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Briefcase, FileText, BarChart, ArrowRight, Info, AlertTriangle, MapPin, DollarSign, Clock, Bookmark, Star, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import { SaveButton } from "../opportunities/find/find-opportunities-client";

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
  const [stats, setStats] = useState<ExecutiveDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && userDetails?.role === 'executive') {
      const hasProfile = !!(userDetails?.profile as any)?.name;
      if (!hasProfile) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      getExecutiveDashboardStats(user.uid)
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
  
  const hasProfile = !!(userDetails?.profile as any)?.name;

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
                To get started, please complete your executive profile. This will allow startups to find you and for us to match you with the best opportunities.
            </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <Button asChild>
                <Link href="/executives/profile">Create Your Profile</Link>
            </Button>
        </CardContent>
    </Card>
    )
  }

  return (
    <div className="space-y-6">
        {stats?.isProfileStale && (
            <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="flex flex-row items-start gap-4">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-1" />
                    <div>
                        <CardTitle className="text-amber-900">Update Your Profile</CardTitle>
                        <CardDescription className="text-amber-700">
                            Your profile hasn't been updated in over 30 days. Keeping it fresh helps you stand out and get better matches.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardFooter>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/executives/profile">Update Profile</Link>
                    </Button>
                </CardFooter>
            </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
                <StatCard title="Matched Opportunities" value={stats?.matchedOpportunities ?? 0} icon={Search} link="/executives/opportunities/find" linkText="Find Opportunities" />
                <StatCard title="Total Applications" value={stats?.totalApplications ?? 0} icon={FileText} link="/executives/applications" linkText="View Applications"/>
                <StatCard title="Awaiting Response" value={stats?.awaitingResponse ?? 0} icon={Briefcase} link="/executives/applications" linkText="View Applications"/>
                <StatCard title="Times Shortlisted" value={stats?.timesShortlisted ?? 0} icon={Star} />
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
                                    <Link key={convo.id} href="/executives/inbox" className="flex items-center gap-4 p-2 -m-2 rounded-lg hover:bg-accent">
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
                                <Link href="/executives/inbox">View All Messages</Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Recent & Recommended Opportunities</CardTitle>
                <CardDescription>Roles posted or updated in the last 7 days that could be a great fit for you.</CardDescription>
            </CardHeader>
            <CardContent>
                {stats && Array.isArray(stats.recentOpportunities) && stats.recentOpportunities.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stats.recentOpportunities.map((match) => {
                        const need = match as StartupNeeds;
                        return (
                            <Card key={need.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <CardTitle className="text-lg">{need.roleTitle}</CardTitle>
                                            <CardDescription>{need.companyName}</CardDescription>
                                        </div>
                                        <Badge variant="outline" className="whitespace-nowrap">
                                            <Clock className="w-3 h-3 mr-1.5" />
                                            {formatDistanceToNow(new Date(need.updatedAt || need.createdAt), { addSuffix: true })}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">{need.projectScope}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="flex items-center"><MapPin className="mr-1.5 h-3 w-3"/>{need.locationPreference}</Badge>
                                        <Badge variant="secondary" className="flex items-center"><DollarSign className="mr-1.5 h-3 w-3"/>{need.budget}</Badge>
                                        <Badge variant="secondary" className="flex items-center"><Briefcase className="mr-1.5 h-3 w-3"/>{need.engagementLength}</Badge>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    <SaveButton needId={need.id} isInitiallySaved={need.isSaved} />
                                    <Button asChild className="w-full">
                                        <Link href={`/executives/opportunities/${need.id}`}>
                                            {need.isApplied ? 'View Application' : 'View Details'}
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">No new opportunities posted in the last 7 days.</p>
                        <Button variant="link" asChild className="mt-2">
                            <Link href="/executives/opportunities/find">Browse all opportunities</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
