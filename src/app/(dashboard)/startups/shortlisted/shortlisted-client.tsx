
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getShortlistedExecutivesForStartup } from '@/lib/actions';
import type { ExecutiveProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Info, User, Star, Clock, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { formatDistanceToNow } from 'date-fns';
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

const MatchScoreIndicator = ({ score }: { score: number | undefined }) => {
    if (score === undefined) return null;
    const scorePercentage = score * 100;
    let colorClass = 'bg-red-500';
    if (score > 0.75) colorClass = 'bg-green-500';
    else if (score > 0.5) colorClass = 'bg-yellow-500';
    
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Best Match Score</p>
            <div className="flex items-center gap-2">
                <Progress value={scorePercentage} indicatorClassName={colorClass} className="h-2" />
                <span className="text-sm font-semibold">{Math.round(scorePercentage)}%</span>
            </div>
        </div>
    )
}


export function ShortlistedClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ExecutiveProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    async function fetchShortlisted() {
      try {
        setIsLoading(true);
        const result = await getShortlistedExecutivesForStartup(user!.uid);
        if (result.status === 'success') {
          setProfiles(result.profiles);
        } else {
          setError(result.message);
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        toast({
            title: "Error",
            description: message,
            variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchShortlisted();
  }, [user, toast]);
  
  const totalPages = Math.ceil(profiles.length / CARDS_PER_PAGE);
  const paginatedProfiles = profiles.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );


  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your shortlisted candidates...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-12">Error: {error}</div>;
  }
  
  if (profiles.length === 0) {
    return (
        <Card className="text-center">
             <CardHeader>
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle>No Shortlisted Candidates Yet</CardTitle>
                <CardDescription>When you find executives you're interested in, shortlist them to see them here.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild variant="default">
                    <Link href="/startups/find-talent">
                        Find Talent
                    </Link>
                </Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProfiles.map((profile) => (
                <Card key={profile.id} className="flex flex-col">
                     <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className='flex items-start gap-4'>
                                <Avatar className="w-16 h-16 rounded-md">
                                    <AvatarImage src={profile.photoUrl} className="object-cover" />
                                    <AvatarFallback className="text-xl rounded-md">{getInitials(profile.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle>{profile.name}</CardTitle>
                                    {(profile as any).appliedToRoleTitle && (
                                        <Badge variant="outline" className="mt-2 text-xs border-green-500 text-green-700">
                                            <FileCheck className="mr-1.5 h-3 w-3" />
                                            Applied
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <Badge variant="outline" className="whitespace-nowrap">
                                <Star className="w-3 h-3 mr-1.5 fill-amber-400 text-amber-500" />
                                {profile.shortlistedAt ? formatDistanceToNow(new Date(profile.shortlistedAt), { addSuffix: true }) : 'Recently'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                         <p className="text-sm text-muted-foreground line-clamp-3">{profile.expertise}</p>
                         <MatchScoreIndicator score={profile.matchScore} />
                         {(profile as any).appliedToRoleTitle && (
                            <p className="text-xs text-muted-foreground">
                                Applied for: <span className="font-medium text-foreground">{(profile as any).appliedToRoleTitle}</span>
                            </p>
                         )}
                         <div className="flex flex-wrap gap-2">
                            {profile.industryExperience?.slice(0, 4).map((skill: string) => (
                                <Badge key={skill} variant="secondary">{skill}</Badge>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                         <Button asChild>
                            <Link href={`/startups/candidates/${profile.id}?from=shortlisted`}>
                                <User className="mr-2 h-4 w-4" />
                                View Profile
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
         {totalPages > 1 && (
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        )}
    </div>
  );
}
