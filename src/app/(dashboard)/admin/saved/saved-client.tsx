
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { SavedItem } from '@/lib/types';
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
import { getAdminAllSaved } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export function SavedClient() {
  const { user } = useAuth();
  const [data, setData] = useState<SavedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    getAdminAllSaved(user.uid)
      .then(result => {
        if (result.status === 'success' && result.savedItems) {
          setData(result.savedItems);
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
      item.roleTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Saved Opportunities</CardTitle>
        <CardDescription>Opportunities saved by executives.</CardDescription>
        <Input 
          placeholder="Filter by executive or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      {isLoading ? (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading saved opportunities...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Executive</TableHead>
              <TableHead>Saved Opportunity</TableHead>
              <TableHead>Saved Date</TableHead>
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
                  <Link href={`/startups/needs/${item.needId}`} className="text-primary hover:underline">
                    {item.roleTitle}
                  </Link>
                </TableCell>
                <TableCell>{format(new Date(item.savedAt), 'PP')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
