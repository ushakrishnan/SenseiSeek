
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { ApplicationWithDetails } from '@/lib/types';
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
import { getAdminAllApplications } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export function ApplicationsClient() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    getAdminAllApplications(user.uid)
      .then(result => {
        if (result.status === 'success' && result.applications) {
          setApplications(result.applications);
        } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
      })
      .finally(() => setIsLoading(false));
  }, [user, toast]);

  const filteredApplications = useMemo(() => {
    if (!searchTerm) return applications;
    return applications.filter(app => 
      app.executiveName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.startupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, applications]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Applications</CardTitle>
        <CardDescription>Browse and manage all applications across the platform.</CardDescription>
        <Input 
          placeholder="Filter by executive, role, startup, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      {isLoading ? (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Executive</TableHead>
              <TableHead>Role / Startup</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/users?search=${app.executiveName}`} className="text-primary hover:underline">
                    {app.executiveName}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{app.roleTitle}</div>
                  <div className="text-sm text-muted-foreground">{app.startupName}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{app.status.replace('-', ' ')}</Badge></TableCell>
                <TableCell>{format(new Date(app.appliedAt), 'PP')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
