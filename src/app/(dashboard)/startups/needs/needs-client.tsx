

"use client";

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getStartupNeeds, deleteStartupNeed } from '@/lib/actions';
import type { StartupNeeds } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Pencil, Users, Briefcase, DollarSign, Clock, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusToggle } from '@/components/status-toggle';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/components/auth-provider';
import { PaginationControls } from '@/components/ui/pagination';

const CARDS_PER_PAGE = 12;

export function NeedsClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [needs, setNeeds] = useState<StartupNeeds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setIsLoading(false);
        return;
    }
    
    getStartupNeeds(user.uid).then(result => {
        if (result.status === 'success') {
            setNeeds(result.needs);
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    });
  }, [user, authLoading]);

  const handleDelete = async (id: string) => {
    const originalNeeds = [...needs];
    setNeeds(needs.filter(need => need.id !== id));

    const result = await deleteStartupNeed(id);
    if (result.status === 'error') {
      setNeeds(originalNeeds);
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive"
      });
    } else {
       toast({
        title: "Success",
        description: "Need deleted successfully."
      });
    }
  };
  
  const totalPages = Math.ceil(needs.length / CARDS_PER_PAGE);
  const paginatedNeeds = needs.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your needs...</p>
      </div>
    );
  }

  if (error && !needs.length) {
    return <div className="text-center text-destructive py-12">Error: {error}</div>;
  }
  
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <div>
                {/* This title was removed in the prompt, but it's good UX to have it. */}
                {/* <h1 className="text-2xl font-bold">My Executive Needs</h1>
                <p className="text-muted-foreground">Manage your open roles and view their status.</p> */}
            </div>
            <Button asChild>
                <Link href="/startups/needs/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Define a New Need
                </Link>
            </Button>
        </div>

        {needs.length === 0 ? (
            <Card className="text-center py-12">
                <CardHeader>
                    <CardTitle>No Needs Defined Yet</CardTitle>
                    <CardDescription>You haven't posted any open fractional executive roles. Get started by defining your first need.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/startups/needs/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Define a New Need
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        ) : (
             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedNeeds.map((need) => (
                        <Card key={need.id} className="flex flex-col">
                            <CardHeader className="relative">
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <StatusToggle needId={need.id} initialStatus={need.status} />
                                </div>
                                <CardTitle className="hover:text-primary pr-12">
                                    <Link href={`/startups/needs/${need.id}`}>
                                        {need.roleTitle}
                                    </Link>
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Last updated {formatDistanceToNow(new Date(need.updatedAt || need.createdAt), { addSuffix: true })}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <p className="text-sm text-muted-foreground line-clamp-3">{need.roleSummary}</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>{need.engagementLength}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <DollarSign className="w-4 h-4" />
                                        <span>{need.budget}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center bg-secondary/30 py-3 px-4">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/startups/applicants?need=${need.id}`}>
                                        <Users className="mr-2 h-4 w-4" />
                                        View Applicants
                                    </Link>
                                </Button>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/startups/needs/${need.id}`}>
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" asChild>
                                        <Link href={`/startups/needs/edit/${need.id}`}>
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this need
                                                and remove it from our servers.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(need.id)} className="bg-destructive hover:bg-destructive/90">
                                                Continue
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
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
        )}
    </div>
  );
}
