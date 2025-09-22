
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { StartupNeeds } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { getAdminAllOpportunities } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export function OpportunitiesClient() {
  const { user } = useAuth();
  const [needs, setNeeds] = useState<StartupNeeds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    getAdminAllOpportunities(user.uid)
      .then(result => {
        if (result.status === 'success' && result.needs) {
          setNeeds(result.needs);
        } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
      })
      .finally(() => setIsLoading(false));
  }, [user, toast]);

  const filteredNeeds = useMemo(() => {
    if (!searchTerm) return needs;
    return needs.filter(need => 
      need.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      need.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      need.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, needs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Opportunities</CardTitle>
        <CardDescription>Browse and manage all needs posted by startups.</CardDescription>
         <Input 
          placeholder="Filter by role, company, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      {isLoading ? (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading opportunities...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNeeds.map((need) => (
              <TableRow key={need.id}>
                <TableCell className="font-medium">
                  <Link href={`/startups/needs/${need.id}`} className="text-primary hover:underline">
                      {need.roleTitle}
                  </Link>
                </TableCell>
                <TableCell>{need.companyName}</TableCell>
                <TableCell><Badge variant={need.status === 'active' ? 'default' : 'secondary'} className="capitalize">{need.status}</Badge></TableCell>
                <TableCell>{format(new Date(need.createdAt), 'PP')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
