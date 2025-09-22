
"use client";

import { useState, useMemo, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { UserListItem } from '@/lib/types';
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
import { Button } from '@/components/ui/button';
import { getAdminAllUsers, adminStartConversationWithUser } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';


export function UsersClient({ initialSearch }: { initialSearch?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  const { toast } = useToast();
  const [isContacting, startContacting] = useTransition();
  const [contactingUserId, setContactingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getAdminAllUsers(user.uid)
      .then(result => {
        if (result.status === 'success' && result.users) {
          setUsers(result.users);
        } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
      })
      .finally(() => setIsLoading(false));
  }, [user, toast]);
  
  const handleContactUser = (targetUserId: string) => {
    if (!user) return;
    setContactingUserId(targetUserId);
    startContacting(async () => {
        const result = await adminStartConversationWithUser(user.uid, targetUserId);
        if (result.status === 'success' && result.conversationId) {
            router.push(`/admin/inbox?conversationId=${result.conversationId}`);
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        setContactingUserId(null);
    })
  }

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user => 
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.role && user.role.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, users]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Users</CardTitle>
        <CardDescription>Browse and manage all registered users.</CardDescription>
        <Input 
          placeholder="Filter by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      {isLoading ? (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((tableUser) => (
              <TableRow key={tableUser.uid}>
                <TableCell className="font-medium">{tableUser.name}</TableCell>
                <TableCell>{tableUser.email}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{tableUser.role || 'N/A'}</Badge></TableCell>
                <TableCell>{format(new Date(tableUser.createdAt), 'PP')}</TableCell>
                <TableCell className="text-right">
                   {tableUser.uid !== user?.uid && tableUser.role !== 'admin' && (
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleContactUser(tableUser.uid)}
                        disabled={isContacting}
                    >
                         {isContacting && contactingUserId === tableUser.uid ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                         ) : (
                            <MessageSquare className="mr-2 h-4 w-4" />
                         )}
                        Contact
                     </Button>
                   )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
