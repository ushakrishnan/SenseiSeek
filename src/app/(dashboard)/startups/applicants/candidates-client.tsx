

"use client";

import { useEffect, useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getApplicantsForStartup, updateApplicationStatus, generateStatusChangeMessage, toggleShortlistExecutive } from '@/lib/actions';
import type { ApplicationWithExecutive, StartupNeeds, ApplicationStatus, ExecutiveProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Star, Clock, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { Progress } from '@/components/ui/progress';
import { PaginationControls } from '@/components/ui/pagination';

const CARDS_PER_PAGE = 12;

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

const statusOptions: ApplicationStatus[] = ['applied', 'in-review', 'hired', 'rejected'];

const MatchScoreIndicator = ({ score }: { score: number }) => {
    const scorePercentage = score * 100;
    let colorClass = 'bg-red-500';
    if (score > 0.75) colorClass = 'bg-green-500';
    else if (score > 0.5) colorClass = 'bg-yellow-500';
    
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Match Score</p>
            <div className="flex items-center gap-2">
                <Progress value={scorePercentage} indicatorClassName={colorClass} className="h-2" />
                <span className="text-sm font-semibold">{Math.round(scorePercentage)}%</span>
            </div>
        </div>
    )
}

const ShortlistButton = ({ startupId, executiveId, isInitiallyShortlisted, onToggle }: { startupId: string, executiveId: string, isInitiallyShortlisted: boolean | undefined, onToggle: (id: string, newState: boolean) => void }) => {
    const { toast } = useToast();
    const [isShortlisting, startTransition] = useTransition();
    const [isShortlisted, setIsShortlisted] = useState(isInitiallyShortlisted);

    const handleShortlistToggle = () => {
        if (!startupId) return;
        startTransition(async () => {
            const result = await toggleShortlistExecutive(startupId, executiveId, !!isShortlisted);
            if (result.status === 'success') {
                const newState = result.newState === 'shortlisted'
                setIsShortlisted(newState);
                onToggle(executiveId, newState);
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

export function CandidatesClient({ initialNeeds }: { initialNeeds: StartupNeeds[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationWithExecutive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNeed, setSelectedNeed] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // State for the inline status change form
  const [editingStatusForAppId, setEditingStatusForAppId] = useState<string | null>(null);
  const [isSubmittingStatus, startSubmittingStatus] = useTransition();
  const [isGeneratingMessage, startGeneratingMessage] = useTransition();
  const [messageContent, setMessageContent] = useState('');
  const [nextStatus, setNextStatus] = useState<ApplicationStatus | null>(null);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getApplicantsForStartup(user.uid).then(result => {
        if (result.status === 'success') {
          setApplications(result.applications);
        } else {
          setError(result.message);
          toast({ title: "Error", description: result.message, variant: 'destructive' });
        }
        setIsLoading(false);
      });
    }
  }, [user, toast]);
  
  const handleLocalStatusChange = (applicationId: string, newStatus: ApplicationStatus) => {
    setApplications(apps => apps.map(app => app.id === applicationId ? { ...app, status: newStatus } : app));
  }
  
  const handleSelectStatus = (app: ApplicationWithExecutive, newStatus: ApplicationStatus) => {
      if (newStatus === app.status || newStatus === 'applied') return;

      setEditingStatusForAppId(app.id);
      setNextStatus(newStatus);
      setMessageContent('');
      
      startGeneratingMessage(async () => {
          const result = await generateStatusChangeMessage({
              executiveId: app.executive.id,
              startupId: user!.uid,
              roleTitle: app.startupNeed.roleTitle,
              newStatus: newStatus as 'in-review' | 'hired' | 'rejected',
          });
          if (result.status === 'success' && result.message) {
              setMessageContent(result.message);
          } else {
              toast({ title: "AI Error", description: result.message, variant: 'destructive' });
          }
      });
  }

  const cancelStatusChange = (app: ApplicationWithExecutive) => {
      setEditingStatusForAppId(null);
      setMessageContent('');
      setNextStatus(null);
  }

  const submitStatusChange = (app: ApplicationWithExecutive, sendMessage: boolean) => {
    if (!nextStatus || !user) return;
    
    startSubmittingStatus(async () => {
        const result = await updateApplicationStatus({
            applicationId: app.id,
            status: nextStatus!,
            sendMessage: sendMessage,
            messageContent: messageContent,
            startupId: user.uid,
            executiveId: app.executive.id
        });

        if (result.status === 'success') {
            handleLocalStatusChange(app.id, nextStatus!);
            toast({ title: "Success", description: `Status updated to ${nextStatus!.replace('-', ' ')}.` });
        } else {
            toast({ title: "Error", description: result.message, variant: 'destructive' });
        }
        setEditingStatusForAppId(null);
        setMessageContent('');
        setNextStatus(null);
    });
  }

  const handleShortlistToggle = (executiveId: string, newState: boolean) => {
      setApplications(apps => apps.map(app => app.executive.id === executiveId ? { ...app, executive: {...app.executive, isShortlisted: newState }} : app));
  }

  const filteredApplications = useMemo(() => {
    if (selectedNeed === 'all') {
      return applications;
    }
    return applications.filter(app => app.startupNeed.id === selectedNeed);
  }, [applications, selectedNeed]);

  const totalPages = Math.ceil(filteredApplications.length / CARDS_PER_PAGE);
  const paginatedApplications = filteredApplications.slice(
      (currentPage - 1) * CARDS_PER_PAGE,
      currentPage * CARDS_PER_PAGE
  );

  if (isLoading) {
    return (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your applicants...</p>
        </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-12">Error: {error}</div>;
  }
  
  if (applications.length === 0) {
    return (
        <Card className="text-center">
             <CardHeader>
                <CardTitle>No Applicants Yet</CardTitle>
                <CardDescription>When executives apply to your open roles, they will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild variant="default">
                    <Link href="/startups/needs/new">
                        Post a New Need
                    </Link>
                </Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Filter by Role</CardTitle>
                <CardDescription>Select one of your open roles to see its specific applicants.</CardDescription>
            </CardHeader>
            <CardContent>
                <Select value={selectedNeed} onValueChange={setSelectedNeed}>
                    <SelectTrigger className="w-full md:w-[300px]">
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {initialNeeds.map(need => (
                            <SelectItem key={need.id} value={need.id}>{need.roleTitle}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

        {filteredApplications.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedApplications.map((app) => {
                    const profile = app.executive as ExecutiveProfile;
                    const isEditingCurrent = editingStatusForAppId === app.id;
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
                                 {app.matchScore !== undefined && <MatchScoreIndicator score={app.matchScore} />}
                                <div className="flex flex-wrap gap-2">
                                    {profile.industryExperience?.slice(0, 4).map((skill: string) => (
                                        <Badge key={skill} variant="secondary">{skill}</Badge>
                                    ))}
                                    {profile.industryExperience?.length > 4 && <Badge variant="outline">+{profile.industryExperience.length - 4} more</Badge>}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-2">
                                <div className="w-full">
                                    <Select 
                                        value={app.status} 
                                        onValueChange={(newStatus) => handleSelectStatus(app, newStatus as ApplicationStatus)}
                                        disabled={isEditingCurrent}
                                    >
                                        <SelectTrigger className="w-full text-xs h-9">
                                            <SelectValue placeholder="Set status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map(opt => <SelectItem key={opt} value={opt} className="capitalize text-xs">{opt.replace('-', ' ')}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {isEditingCurrent && (
                                    <div className="w-full space-y-4 pt-4 border-t">
                                        <Label>Send a message to {profile.name}</Label>
                                        {isGeneratingMessage ? (
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <p>Generating message...</p>
                                            </div>
                                        ) : (
                                            <Textarea
                                                value={messageContent}
                                                onChange={(e) => setMessageContent(e.target.value)}
                                                rows={5}
                                                placeholder="Your message to the candidate..."
                                            />
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => cancelStatusChange(app)} disabled={isSubmittingStatus}>Cancel</Button>
                                            <Button variant="outline" size="sm" onClick={() => submitStatusChange(app, false)} disabled={isSubmittingStatus}>
                                                {isSubmittingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Update Only
                                            </Button>
                                            <Button size="sm" onClick={() => submitStatusChange(app, true)} disabled={isSubmittingStatus || isGeneratingMessage || !messageContent}>
                                                {isSubmittingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Send & Update
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex w-full justify-end gap-2 pt-2">
                                    <ShortlistButton startupId={user!.uid} executiveId={profile.id} isInitiallyShortlisted={profile.isShortlisted} onToggle={handleShortlistToggle} />
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
             {totalPages > 1 && (
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}
            </>
        ) : (
             <Card className="text-center py-12">
                <CardHeader>
                    <CardTitle>No Applicants Found</CardTitle>
                    <CardDescription>
                       No one has applied for this role yet.
                    </CardDescription>
                </CardHeader>
            </Card>
        )}
    </div>
  );
}
