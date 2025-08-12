
"use client";

import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getSavedOpportunities, toggleSaveOpportunity } from '@/lib/actions';
import type { MatchResult, StartupNeeds } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2, Search, Briefcase, DollarSign, Bookmark, X, Clock, MapPin, Info } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { PaginationControls } from '@/components/ui/pagination';

const CARDS_PER_PAGE = 12;

const SaveButton = ({ needId, isInitiallySaved, onUnsave }: { needId: string, isInitiallySaved: boolean | undefined, onUnsave: (id: string) => void }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, startSaving] = useTransition();

    const handleSave = () => {
        if (!user) return;
        startSaving(async () => {
            const result = await toggleSaveOpportunity(user.uid, needId, true); // Always unsaving from this page
            if (result.status === 'success') {
                onUnsave(needId);
                toast({ title: result.message });
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <Button variant="outline" size="icon" onClick={handleSave} disabled={isSaving}>
            <Bookmark className={cn("h-4 w-4", "fill-primary text-primary")} />
        </Button>
    )
}

export function SavedOpportunitiesClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getSavedOpportunities(user.uid)
        .then((result) => {
          if (result.status === "success") {
            setOpportunities(result.matches);
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
    } else {
        setIsLoading(false);
    }
  }, [user, toast]);

  const handleUnsave = (id: string) => {
      setOpportunities(prev => prev.filter(opp => (opp as StartupNeeds).id !== id));
  }
  
  const totalPages = Math.ceil(opportunities.length / CARDS_PER_PAGE);
  const paginatedOpportunities = opportunities.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your saved opportunities...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-12">Error: {error}</div>;
  }
  
  if (opportunities.length === 0) {
      return (
        <Card className="text-center py-12">
            <CardHeader>
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle>No Saved Opportunities</CardTitle>
                <CardDescription>You haven't saved any opportunities yet. Browse roles and save them for later.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/executives/opportunities/find">Find Opportunities</Link>
                </Button>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedOpportunities.map((match) => {
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
                            <SaveButton needId={need.id} isInitiallySaved={need.isSaved} onUnsave={handleUnsave} />
                            {need.isApplied ? (
                                <Button className="w-full" disabled>Applied</Button>
                            ) : (
                                <Button asChild className="w-full">
                                    <Link href={`/executives/opportunities/${need.id}`}>
                                        View & Apply
                                    </Link>
                                </Button>
                            )}
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
    </div>
  );
}
