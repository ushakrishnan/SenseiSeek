
"use client";

import { useEffect, useState, useMemo, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { findMatchesForExecutive, toggleSaveOpportunity } from '@/lib/actions';
import type { MatchResult, StartupNeeds, ApplicationStatus } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Link as LinkIcon, Briefcase, DollarSign, Bookmark, X, Clock, MapPin, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';
import { PaginationControls } from '@/components/ui/pagination';

const CARDS_PER_PAGE = 12;

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
const locationOptions = ["Remote", "Hybrid", "On-site"];

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

const statusStyles: { [key in ApplicationStatus]: string } = {
    applied: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800',
    'in-review': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800',
    hired: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800',
    rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800',
};

export const SaveButton = ({ needId, isInitiallySaved }: { needId: string, isInitiallySaved: boolean | undefined }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, startSaving] = useTransition();
    const [isSaved, setIsSaved] = useState(isInitiallySaved);

    const handleSave = () => {
        if (!user) {
            toast({ title: 'Error', description: 'You must be logged in to save an opportunity.', variant: 'destructive' });
            return;
        }
        startSaving(async () => {
            const result = await toggleSaveOpportunity(user.uid, needId, !!isSaved);
            if (result.status === 'success') {
                const newStateIsSaved = result.newState === 'saved';
                setIsSaved(newStateIsSaved);
                if (analytics) {
                    logEvent(analytics, 'add_to_wishlist', {
                        value: newStateIsSaved ? 1 : -1, // 1 for save, -1 for unsave
                        item_id: needId,
                        content_type: 'opportunity',
                    });
                }
                toast({ title: result.message });
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <Button variant="outline" onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bookmark className={cn("h-4 w-4 mr-2", isSaved && "fill-primary text-primary")} />}
            {isSaved ? 'Saved' : 'Save'}
        </Button>
    )
}

export function FindOpportunitiesClient() {
  const { user, userDetails } = useAuth();
  const { toast } = useToast();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [engagement, setEngagement] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [sortBy, setSortBy] = useState('matchScore');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user && userDetails?.role === 'executive') {
       const hasProfile = !!(userDetails?.profile as any)?.name;
       if (!hasProfile) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      findMatchesForExecutive(user.uid)
        .then((result) => {
          if (result.status === "success") {
            setMatches(result.matches);
          } else {
            setError(result.message);
            toast({ title: "Error", description: result.message, variant: "destructive" });
          }
        })
        .catch((err) => {
            const msg = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(msg);
            toast({ title: "Error", description: msg, variant: "destructive" });
        })
        .finally(() => setIsLoading(false));
    }
  }, [user, userDetails, toast]);
  
  const hasProfile = !!(userDetails?.profile as any)?.name;

  const filteredMatches = useMemo(() => {
    let sorted = [...matches];

    if (sortBy === 'matchScore') {
        sorted.sort((a, b) => b.matchScore - a.matchScore);
    } else if (sortBy === 'newest') {
        sorted.sort((a,b) => {
            const dateA = new Date((a as StartupNeeds).updatedAt || (a as StartupNeeds).createdAt);
            const dateB = new Date((b as StartupNeeds).updatedAt || (b as StartupNeeds).createdAt);
            return dateB.getTime() - dateA.getTime();
        });
    }


    return sorted.filter(match => {
      const need = match as StartupNeeds;
      const searchMatch = searchTerm.length > 2 
        ? (need.roleTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           need.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           need.projectScope?.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      
      const engagementMatch = engagement ? need.engagementLength === engagement : true;
      const budgetMatch = budget ? need.budget === budget : true;
      const locationMatch = location ? need.locationPreference === location : true;

      return searchMatch && engagementMatch && budgetMatch && locationMatch;
    });
  }, [matches, searchTerm, engagement, budget, location, sortBy]);
  
  const clearFilters = () => {
      setSearchTerm('');
      setEngagement('');
      setBudget('');
      setLocation('');
      setCurrentPage(1);
  }

  const handleSearch = () => {
      if (analytics && searchTerm.length > 2) {
          logEvent(analytics, 'search', {
              search_term: searchTerm,
          });
      }
      setCurrentPage(1);
  }

  const hasActiveFilters = searchTerm || engagement || budget || location;

  const totalPages = Math.ceil(filteredMatches.length / CARDS_PER_PAGE);
  const paginatedMatches = filteredMatches.slice(
      (currentPage - 1) * CARDS_PER_PAGE,
      currentPage * CARDS_PER_PAGE
  );


  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Finding opportunities for you...</p>
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
            <CardTitle className="text-center">Complete Your Profile</CardTitle>
            <CardDescription className="text-center">
                To find the best opportunities, please complete your executive profile first.
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
        <Card>
            <CardHeader>
                <CardTitle>Filter Opportunities</CardTitle>
                <CardDescription>Refine your search to find the perfect role.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Keyword Search</label>
                    <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search by role, company, or scope"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </form>
                </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Engagement</label>
                    <Select value={engagement} onValueChange={setEngagement}>
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                            {engagementOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Budget</label>
                    <Select value={budget} onValueChange={setBudget}>
                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                            {budgetOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                    </Select>
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

        {filteredMatches.length > 0 ? (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedMatches.map((match) => {
                        const need = match as StartupNeeds;
                        return (
                            <Card key={need.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <CardTitle className="text-lg">{need.roleTitle}</CardTitle>
                                            <CardDescription>{need.companyName}</CardDescription>
                                        </div>
                                        <div className='flex flex-col items-end gap-2'>
                                            <Badge variant="outline" className="whitespace-nowrap">
                                                <Clock className="w-3 h-3 mr-1.5" />
                                                {formatDistanceToNow(new Date(need.updatedAt || need.createdAt), { addSuffix: true })}
                                            </Badge>
                                            {need.isApplied && need.applicationStatus && (
                                                <Badge className={cn("capitalize", statusStyles[need.applicationStatus])}>
                                                    {need.applicationStatus.replace('-', ' ')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                    <p className="text-sm text-muted-foreground line-clamp-3">{need.projectScope}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="secondary" className="flex items-center"><MapPin className="mr-1.5 h-3 w-3"/>{need.locationPreference}</Badge>
                                        <Badge variant="secondary" className="flex items-center"><DollarSign className="mr-1.5 h-3 w-3"/>{need.budget}</Badge>
                                        <Badge variant="secondary" className="flex items-center"><Briefcase className="mr-1.5 h-3 w-3"/>{need.engagementLength}</Badge>
                                    </div>
                                    <MatchScoreIndicator score={match.matchScore} />
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
                    <CardTitle>No Opportunities Found</CardTitle>
                    <CardDescription>
                        {hasActiveFilters 
                            ? "No opportunities match your current filters. Try adjusting your search."
                            : "There are currently no open roles. Check back soon!"
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

// Add this to your `components/ui/progress.tsx` or where it's defined
// to allow custom indicator color
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number
  }
}
