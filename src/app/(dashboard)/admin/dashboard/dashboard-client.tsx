
"use client";

import { useActionState, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, Briefcase, Building, FileText, UserPlus, PlusCircle, MessageSquare, ArrowRight, Send } from "lucide-react";
import type { AdminDashboardStats, ConversationWithRecipient } from "@/lib/types";
import { promoteUserToAdminByEmail, getAdminDashboardStats, broadcastMessageToAllUsers } from "@/lib/actions";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, note }: { title: string, value: string | number, icon: React.ElementType, note?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </CardContent>
  </Card>
);

const initialFormState = {
    status: 'idle' as const,
    message: '',
};

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

export function AdminDashboardClient() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const promoteActionWithId = promoteUserToAdminByEmail.bind(null, user?.uid || '');
  const [promoteFormState, promoteFormAction, isPromotePending] = useActionState(promoteActionWithId, initialFormState);

  const broadcastActionWithId = broadcastMessageToAllUsers.bind(null, user?.uid || '');
  const [broadcastFormState, broadcastFormAction, isBroadcastPending] = useActionState(broadcastActionWithId, initialFormState);
  
  useEffect(() => {
    if (!user) return;
    getAdminDashboardStats(user.uid)
      .then(result => {
        if (result.status === 'success' && result.stats) {
          setStats(result.stats);
        } else {
          toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
      })
      .finally(() => setIsLoading(false));
  }, [user, toast]);
  
  useEffect(() => {
    if (promoteFormState.status === 'success') {
        toast({ title: "Success!", description: promoteFormState.message });
        setEmail('');
    } else if (promoteFormState.status === 'error') {
         toast({ title: "Error", description: promoteFormState.message, variant: 'destructive' });
    }
  }, [promoteFormState, toast]);
  
  useEffect(() => {
    if (broadcastFormState.status === 'success') {
        toast({ title: "Broadcast Sent!", description: broadcastFormState.message });
        setBroadcastMessage('');
    } else if (broadcastFormState.status === 'error') {
         toast({ title: "Broadcast Failed", description: broadcastFormState.message, variant: 'destructive' });
    }
  }, [broadcastFormState, toast]);

  return (
    <div className="space-y-6">
       {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading dashboard stats...</p>
          </div>
       ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <StatCard title="Total Users" value={stats?.totalUsers ?? 0} icon={Users} />
                <StatCard title="Total Startups" value={stats?.totalStartups ?? 0} icon={Building} />
                <StatCard title="Total Executives" value={stats?.totalExecutives ?? 0} icon={Briefcase} />
                <StatCard title="New Startups" value={stats?.newStartups ?? 0} icon={UserPlus} note="In the last 7 days"/>
                <StatCard title="New Executives" value={stats?.newExecutives ?? 0} icon={UserPlus} note="In the last 7 days"/>
                <StatCard title="New Opportunities" value={stats?.newOpportunities ?? 0} icon={PlusCircle} note="In the last 7 days"/>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Promote a User to Admin</CardTitle>
                    <CardDescription>Enter the email address of the user you want to grant admin privileges to.</CardDescription>
                </CardHeader>
                <form action={promoteFormAction}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">User Email</Label>
                            <Input 
                                id="email"
                                name="email"
                                type="email"
                                placeholder="user@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={isPromotePending || !user}>
                            {isPromotePending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Promote User
                        </Button>
                    </CardContent>
                </form>
              </Card>
          </div>

          <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Inbox</CardTitle>
                    <CardDescription>Recent platform-wide messages.</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats && stats.recentConversations && stats.recentConversations.length > 0 ? (
                        <div className="space-y-4">
                            {stats.recentConversations.map((convo: ConversationWithRecipient) => (
                                <Link key={convo.id} href="/admin/inbox" className="flex items-center gap-4 p-2 -m-2 rounded-lg hover:bg-accent">
                                    <Avatar>
                                        <AvatarImage src={convo.recipientAvatarUrl} className="object-cover" />
                                        <AvatarFallback>{getInitials(convo.recipientName)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 truncate">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-semibold text-sm">{convo.recipientName}</h4>
                                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: true })}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">{convo.lastMessageText}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">The inbox is empty.</p>
                        </div>
                    )}
                </CardContent>
                {stats && stats.recentConversations && stats.recentConversations.length > 0 && (
                    <CardFooter>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/admin/inbox">View All Messages</Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Broadcast Message</CardTitle>
                    <CardDescription>Send a one-way message to all startups and executives.</CardDescription>
                </CardHeader>
                <form action={broadcastFormAction}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="broadcastMessage">Message</Label>
                            <Textarea 
                                id="broadcastMessage"
                                name="message"
                                placeholder="Your announcement..."
                                rows={5}
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" disabled={isBroadcastPending || !user || !broadcastMessage.trim()}>
                            {isBroadcastPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                            Send Broadcast to All Users
                        </Button>
                    </CardContent>
                </form>
              </Card>
          </div>
        </div>
       )}
    </div>
  );
}
