
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { getApplications } from '@/lib/actions';
import type { Application } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Info, Briefcase, Building, Clock, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/pagination';

const CARDS_PER_PAGE = 12;

export function ApplicationsClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      getApplications(user.uid)
        .then((result) => {
          if (result.status === "success") {
            setApplications(result.applications);
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
  }, [user, toast]);

  const paginatedApplications = applications.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );
  const totalPages = Math.ceil(applications.length / CARDS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your applications...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive py-12">Error: {error}</div>;
  }
  
  if (applications.length === 0) {
      return (
        <Card className="text-center py-12">
            <CardHeader>
                <Info className="mx-auto h-12 w-12 text-muted-foreground" />
                <CardTitle>No Applications Yet</CardTitle>
                <CardDescription>You haven't applied to any roles. Find your next opportunity today.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/executives/opportunities/find">Find Opportunities</Link>
                </Button>
            </CardContent>
        </Card>
      )
  }

  const statusStyles: { [key: string]: string } = {
    applied: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800',
    'in-review': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800',
    hired: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800',
    rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-800',
  };

  return (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedApplications.map((app) => (
                <Card key={app.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{app.startupNeed.roleTitle}</CardTitle>
                                <CardDescription className="flex items-center gap-2 pt-1"><Building className="h-4 w-4"/> {app.startupNeed.companyName}</CardDescription>
                            </div>
                            <Badge className={cn("capitalize", statusStyles[app.status])}>
                                {app.status.replace('-', ' ')}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                         <p className="text-sm text-muted-foreground line-clamp-3">{app.startupNeed.roleSummary}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-secondary/30 py-3 px-4">
                        <div className="text-xs text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1.5"/>
                            Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                        </div>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/executives/opportunities/${app.startupNeed.id}`}>
                                <Eye className="h-4 w-4 mr-2"/>
                                View Role
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
