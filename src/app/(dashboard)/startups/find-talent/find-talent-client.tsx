
"use client";

import { useEffect, useState, useMemo, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getAllExecutiveProfiles, toggleShortlistExecutive } from '@/lib/actions';
import type { ExecutiveProfile } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, User, Briefcase, ExternalLink, X, Clock, Star } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { allSkills } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination';
import { Progress } from '@/components/ui/progress';

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

const availabilityOptions = [
    "Part-time (10-20 hours/week)",
    "Full-time (40 hours/week)",
    "Project-based",
    "Advisory",
];

const locationOptions = [
    "Remote",
    "Hybrid",
    "On-site",
];

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

export function FindTalentClient() {
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [profiles, setProfiles] = useState<ExecutiveProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [availability, setAvailability] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('matchScore');

  useEffect(() => {
    if(loading) return;
    if(!user) {
        setIsLoading(false);
        return;
    }
    async function fetchProfiles() {
      try {
        setIsLoading(true);
        const result = await getAllExecutiveProfiles(user!.uid);
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
    fetchProfiles();
  }, [toast, user, loading]);

  const filteredProfiles = useMemo(() => {
    let sorted = [...profiles];

    if (sortBy === 'matchScore') {
        sorted.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    } else if (sortBy === 'newest') {
        sorted.sort((a,b) => {
            const dateA = new Date(a.updatedAt || a.createdAt!);
            const dateB = new Date(b.updatedAt || b.createdAt!);
            return dateB.getTime() - dateA.getTime();
        });
    }

    return sorted.filter(profile => {
      const searchMatch = searchTerm.length > 2 ? 
        (profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         profile.expertise?.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      const availabilityMatch = availability ? profile.availability === availability : true;
      const locationMatch = location ? profile.locationPreference === location : true;
      const skillsMatch = skills.length > 0 ? skills.every(skill => profile.industryExperience.includes(skill)) : true;

      return searchMatch && availabilityMatch && locationMatch && skillsMatch;
    });
  }, [profiles, searchTerm, availability, location, skills, sortBy]);

  const clearFilters = () => {
      setSearchTerm('');
      setAvailability('');
      setLocation('');
      setSkills([]);
      setCurrentPage(1);
  }

  const hasActiveFilters = searchTerm || availability || location || skills.length > 0;
  
  const totalPages = Math.ceil(filteredProfiles.length / CARDS_PER_PAGE);
  const paginatedProfiles = filteredProfiles.slice(
      (currentPage - 1) * CARDS_PER_PAGE,
      currentPage * CARDS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading talent pool...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-12">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Filter Executives</CardTitle>
                <CardDescription>Refine your search to find the perfect executive talent. Match score shows the best fit against all your open roles.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Keyword Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by name or expertise"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Availability</label>
                    <Select value={availability} onValueChange={setAvailability}>
                        <SelectTrigger><SelectValue placeholder="All Availabilities" /></SelectTrigger>
                        <SelectContent>
                            {availabilityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger><SelectValue placeholder="All Locations" /></SelectTrigger>
                        <SelectContent>
                             {locationOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Skills</label>
                    <Select onValueChange={(v) => !skills.includes(v) && setSkills([...skills, v])}>
                        <SelectTrigger><SelectValue placeholder="Select skills..." /></SelectTrigger>
                        <SelectContent>
                            {allSkills.filter(s => !skills.includes(s)).map(skill => (
                                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <div className="flex flex-wrap gap-1 pt-1">
                        {skills.map(skill => (
                            <Badge key={skill} variant="secondary">
                                {skill}
                                <button onClick={() => setSkills(skills.filter(s => s !== skill))} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <div>
                     {hasActiveFilters && (
                        <Button variant="ghost" onClick={clearFilters}>
                            <X className="mr-2 h-4 w-4" />
                            Clear Filters
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                     <label className="text-sm font-medium">Sort by</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="matchScore">Best Match</SelectItem>
                            <SelectItem value="newest">Newest</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardFooter>
        </Card>

        {filteredProfiles.length > 0 ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedProfiles.map((profile) => (
                        <Card key={profile.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className='flex items-start gap-4'>
                                        <Avatar className="w-16 h-16 rounded-md">
                                            <AvatarImage src={profile.photoUrl} />
                                            <AvatarFallback className="text-xl rounded-md">{getInitials(profile.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle>{profile.name}</CardTitle>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="whitespace-nowrap">
                                        <Clock className="w-3 h-3 mr-1.5" />
                                        {profile.updatedAt ? formatDistanceToNow(new Date(profile.updatedAt), { addSuffix: true }) : 'New'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-3">{profile.expertise}</p>
                                <MatchScoreIndicator score={profile.matchScore} />
                                <div className="flex flex-wrap gap-2">
                                    {profile.industryExperience?.slice(0, 4).map((skill: string) => (
                                        <Badge key={skill} variant="secondary">{skill}</Badge>
                                    ))}
                                    {profile.industryExperience?.length > 4 && <Badge variant="outline">+{profile.industryExperience.length - 4} more</Badge>}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <ShortlistButton startupId={user!.uid} executiveId={profile.id} isInitiallyShortlisted={profile.isShortlisted} />
                                <Button asChild className="w-full">
                                    <Link href={`/startups/candidates/${profile.id}?from=find-talent`}>
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
            </>
        ) : (
             <Card className="text-center py-12">
                <CardHeader>
                    <CardTitle>No Executives Found</CardTitle>
                    <CardDescription>
                        {hasActiveFilters 
                            ? "No executives match your current filters. Try adjusting your search."
                            : "There are currently no executives on the platform."
                        }
                    </CardDescription>
                </CardHeader>
                {hasActiveFilters && (
                    <CardContent>
                        <Button onClick={clearFilters}>
                           <X className="mr-2 h-4 w-4" />
                            Clear All Filters
                        </Button>
                    </CardContent>
                )}
            </Card>
        )}
    </div>
  );
}
