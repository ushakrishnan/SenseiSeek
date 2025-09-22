

"use client";

import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  User,
  Briefcase,
  Search,
  Bookmark,
  Users,
  FileText,
  User as UserIcon,
  Star,
  Shield,
  AlertTriangle,
  Heart,
  FileCheck,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { DashboardHeader } from "@/components/dashboard-header";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import React, { useEffect, useTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { startOrGetAdminConversation } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const executiveSidebarNav = [
  { title: "Dashboard", href: "/executives/dashboard", icon: LayoutDashboard },
  { title: "My Profile", href: "/executives/profile/view", icon: User },
  { title: "Find Opportunities", href: "/executives/opportunities/find", icon: Search },
  { title: "Saved Opportunities", href: "/executives/saved", icon: Bookmark },
  { title: "Applications", href: "/executives/applications", icon: Briefcase },
  { title: "Inbox", href: "/executives/inbox", icon: MessageSquare },
];

const startupSidebarNav = [
  { title: "Dashboard", href: "/startups/dashboard", icon: LayoutDashboard },
  { title: "My Profile", href: "/startups/profile/view", icon: UserIcon },
  { title: "My Needs", href: "/startups/needs", icon: FileText },
  { title: "Find Talent", href: "/startups/find-talent", icon: Search },
  { title: "Applicants", href: "/startups/applicants", icon: Users },
  { title: "Shortlisted", href: "/startups/shortlisted", icon: Star },
  { title: "Inbox", href: "/startups/inbox", icon: MessageSquare },
];

const adminSidebarNav = [
  { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Opportunities", href: "/admin/opportunities", icon: Briefcase },
  { title: "Applications", href: "/admin/applications", icon: FileCheck },
  { title: "Shortlisted", href: "/admin/shortlisted", icon: Star },
  { title: "Saved", href: "/admin/saved", icon: Heart },
  { title: "Inbox", href: "/admin/inbox", icon: MessageSquare },
];

const headerInfo: Record<string, { title: string, tagline: string }> = {
    // Executive
    '/executives/dashboard': { title: "Executive Dashboard", tagline: "Your command center for high-impact fractional roles." },
    '/executives/profile': { title: "My Executive Profile", tagline: "The more details you provide, the better we can match you with the perfect role." },
    '/executives/profile/view': { title: "My Executive Profile", tagline: "This is how startups will see your profile." },
    '/executives/opportunities/find': { title: "Find Opportunities", tagline: "Discover your next high-impact fractional role." },
    '/executives/opportunities': { title: "Opportunity Details", tagline: "Review the specifics of this fractional role." },
    '/executives/saved': { title: "Saved Opportunities", tagline: "Review the roles you've saved for later." },
    '/executives/applications': { title: "My Applications", tagline: "Track the status of your submitted applications." },
    '/executives/inbox': { title: "Inbox", tagline: "Manage your conversations with startups." },
    '/executives/help': { title: "Help & Documentation", tagline: "Find answers and guides for using the platform." },
    // Startup
    '/startups/dashboard': { title: "Startup Dashboard", tagline: "Find the perfect executive talent for your needs." },
    '/startups/profile': { title: "My Startup Profile", tagline: "Keep your company information up-to-date." },
    '/startups/profile/view': { title: "My Startup Profile", tagline: "This is how executives will see your company." },
    '/startups/needs': { title: "My Executive Needs", tagline: "Manage your open roles and create new ones." },
    '/startups/needs/new': { title: "Define a New Executive Need", tagline: "The more detail you provide, the better we can match you with the perfect fractional executive." },
    '/startups/needs/edit': { title: "Edit Executive Need", tagline: "Update the details for this role below." },
    '/startups/find-talent': { title: "Find Talent", tagline: "Browse and discover all executives on the platform." },
    '/startups/applicants': { title: "Review Applicants", tagline: "Review and manage applicants for your open roles." },
    '/startups/shortlisted': { title: "Shortlisted Candidates", tagline: "Review your top candidates for your open roles." },
    '/startups/candidates': { title: "Applicant Profile", tagline: "Review the candidate's full profile." },
    '/startups/inbox': { title: "Inbox", tagline: "Manage your conversations with executives." },
    '/startups/help': { title: "Help & Documentation", tagline: "Find answers and guides for using the platform." },
    // Admin
    '/admin/dashboard': { title: "Admin Dashboard", tagline: "System overview and management." },
    '/admin/users': { title: "User Management", tagline: "View and manage all users on the platform." },
    '/admin/opportunities': { title: "Opportunity Management", tagline: "View and manage all opportunities." },
    '/admin/applications': { title: "Application Management", tagline: "View all applications submitted on the platform." },
    '/admin/shortlisted': { title: "Shortlist Management", tagline: "View all shortlisted candidates." },
    '/admin/saved': { title: "Saved Opportunity Management", tagline: "View all saved opportunities." },
    '/admin/inbox': { title: "Admin Inbox", tagline: "Manage platform-wide messages and user inquiries." },
    '/admin/help': { title: "Help & Documentation", tagline: "Find answers and guides for using the platform." },
};

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <Skeleton className="h-8 w-48 mt-4" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
  );
}

function AccessDeniedMessage({ userRole }: { userRole: string | null }) {
    if (!userRole) return null;
    const homePath = `/${userRole === 'admin' ? 'admin' : userRole + 's'}/dashboard`;
    return (
        <div className="flex h-full w-full items-center justify-center bg-background p-4">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>
                        You do not have permission to view this page. Your role is <span className="font-bold capitalize">{userRole}</span>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Click the button below to go to your correct dashboard. You may want to update your bookmarks.
                    </p>
                    <Button asChild>
                        <Link href={homePath}>Go to Your Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function SupportButton() {
    const { user, userDetails } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleSupportClick = () => {
        if (!user) return;
        startTransition(async () => {
            const result = await startOrGetAdminConversation(user.uid);
            if (result.status === 'success') {
                const inboxUrl = `/${userDetails?.role}s/inbox?conversationId=${result.conversationId}`;
                router.push(inboxUrl);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    }

    return (
        <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleSupportClick}
            disabled={isPending}
        >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
            Help & Support
        </Button>
    )
}


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userDetails, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user || !userDetails || !userDetails.role) {
    return <LoadingState />;
  }

  const rolePath = pathname.split('/')[1];
  const userRole = userDetails.role;
  const isAccessDenied = rolePath !== `${userRole}s` && rolePath !== userRole;
  
  const isExecutive = userDetails?.role === 'executive';
  const isStartup = userDetails?.role === 'startup';
  const isAdmin = userDetails?.role === 'admin';

  let navItems = startupSidebarNav;
  if (isExecutive) navItems = executiveSidebarNav;
  if (isAdmin) navItems = adminSidebarNav;
  
  const themeClass = isExecutive ? 'theme-blue' : isAdmin ? 'theme-gray' : 'theme-orange';

  const getActiveState = (href: string) => {
    if (href.endsWith('/view') || href.endsWith('/find')) {
        return pathname.startsWith(href.split('/').slice(0, -1).join('/'));
    }
    if (href.includes('/opportunities/') || href.includes('/candidates/') || href.includes('/applicants') || href.includes('/inbox')) {
        return pathname.startsWith(href);
    }
    return pathname === href;
  };
  
  const currentHeader = Object.entries(headerInfo).find(([path,]) => {
      if (pathname.match(/\/startups\/(needs|applicants|candidates|shortlisted|profile|inbox)\/edit\/(.+)/) || pathname.match(/\/executives\/(opportunities|inbox)\/(.+)/) || pathname.match(/\/startups\/candidates\/(.+)/) || pathname.match(/\/admin\/(inbox)\/(.+)/)) {
        const pathSegments = path.split('/');
        const pathnameSegments = pathname.split('/');
        if (pathSegments.length < pathnameSegments.length && path.split(/[\/\[]/)[2] === pathname.split(/[\/\[]/)[2] ) {
            return true;
        }
      }
      return pathname === path;
  })?.[1]
    || { title: 'Dashboard', tagline: 'Welcome' };


  return (
      <div className={`${themeClass} h-full flex flex-col`}>
            <SidebarProvider>
                {!isAccessDenied && (
                    <Sidebar>
                        <SidebarHeader className="h-24 flex items-center p-4 border-b">
                        <Link href="/">
                            <Logo />
                        </Link>
                        </SidebarHeader>
                        <SidebarContent className="p-2 mt-8">
                            {navItems.map((item) => (
                            <Button
                                key={item.title}
                                variant={getActiveState(item.href) ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                asChild
                            >
                                <Link href={item.href}>
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.title}
                                </Link>
                            </Button>
                            ))}
                        </SidebarContent>
                        <SidebarFooter>
                        <Separator className="my-2" />
                        {!isAdmin && <SupportButton />}
                        </SidebarFooter>
                    </Sidebar>
                )}
                <SidebarInset className="flex flex-col">
                    <DashboardHeader
                        title={isAccessDenied ? "Access Denied" : currentHeader.title}
                        tagline={isAccessDenied ? "You do not have permission to view this page." : currentHeader.tagline}
                    />
                    <main className="flex-1 overflow-auto bg-secondary">
                        {isAccessDenied ? (
                            <AccessDeniedMessage userRole={userRole} />
                        ) : (
                             <div className="p-4 md:p-8">
                                 {children}
                            </div>
                        )}
                    </main>
                </SidebarInset>
            </SidebarProvider>
      </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </AuthProvider>
    )
}
