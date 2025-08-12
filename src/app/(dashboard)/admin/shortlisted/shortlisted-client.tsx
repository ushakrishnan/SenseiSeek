
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { ShortlistedItem } from '@/lib/types';
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
import Link from 'next/link';
import { getAdminAllShortlisted } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export function ShortlistedClient() {
  const { user } = useAuth();
  const [data, setData] = useState<ShortlistedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    getAdminAllShortlisted(user.uid)
      .then(result => {
        if (result.status === 'success' && result.shortlistedItems) {
          setData(result.shortlistedItems);
        } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
      })
      .finally(() => setIsLoading(false));
  }, [user, toast]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(item => 
      item.executiveName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.startupName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Shortlisted Candidates</CardTitle>
        <CardDescription>Executives shortlisted by startups.</CardDescription>
        <Input 
          placeholder="Filter by executive or startup..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      {isLoading ? (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading shortlisted candidates...</p>
        </div>
      ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Executive</TableHead>
            <TableHead>Shortlisted By (Startup)</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                 <Link href={`/admin/users?search=${item.executiveName}`} className="text-primary hover:underline">
                    {item.executiveName}
                 </Link>
              </TableCell>
              <TableCell>
                <Link href={`/admin/users?search=${item.startupName}`} className="text-primary hover:underline">
                    {item.startupName}
                </Link>
              </TableCell>
              <TableCell>{format(new Date(item.shortlistedAt), 'PP')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      )}
    </Card>
  );
}
