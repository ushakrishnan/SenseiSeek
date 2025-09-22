
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from '@/components/ui/button';
import { LogOut, User, Mail, HelpCircle } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from './auth-provider';
import { auth } from '@/lib/firebase-client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { SidebarTrigger } from './ui/sidebar';
import Link from "next/link";
import type { ExecutiveProfile, StartupProfile } from "@/lib/types";
import { clearSessionCookie } from "@/lib/actions";

interface DashboardHeaderProps {
    title: string;
    tagline: string;
}

export function DashboardHeader({ title, tagline }: DashboardHeaderProps) {
  const { user, userDetails, unreadMessageCount } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    await clearSessionCookie();
    router.push('/');
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
  
  const role = userDetails?.role;
  let profileLink = '/';
  let inboxLink = '/';
  let helpLink = '/';

  if (role === 'admin') {
    profileLink = '/admin/dashboard';
    inboxLink = '/admin/inbox';
    helpLink = '/admin/help';
  } else if (role === 'executive') {
    profileLink = '/executives/profile/view';
    inboxLink = '/executives/inbox';
    helpLink = '/executives/help';
  } else if (role === 'startup') {
    profileLink = '/startups/profile/view';
    inboxLink = '/startups/inbox';
    helpLink = '/startups/help';
  }
  
  const displayName = userDetails?.name || user?.email || "";
  const photoUrl = userDetails?.role === 'executive' 
    ? (userDetails?.profile as Partial<ExecutiveProfile>)?.photoUrl
    : (userDetails?.profile as Partial<StartupProfile>)?.companyLogoUrl;


  return (
    <header className="flex h-24 items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
         <SidebarTrigger className="md:hidden" />
         <div className="hidden md:block">
            <h1 className="font-headline text-3xl font-bold text-primary">{title}</h1>
            <p className="text-muted-foreground">{tagline}</p>
         </div>
      </div>
      <div className="flex items-center space-x-2">
        <ThemeToggle />
        {user && userDetails && (
            <>
            <Button asChild variant="ghost" size="icon">
                <Link href={helpLink}>
                    <HelpCircle />
                </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="relative">
                <Link href={inboxLink}>
                    <Mail />
                    {unreadMessageCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {unreadMessageCount}
                        </span>
                    )}
                </Link>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="relative h-10 gap-2 justify-start px-2">
                        <Avatar className="h-8 w-8">
                             <AvatarImage src={photoUrl} className="object-cover"/>
                             <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-medium">{displayName}</span>
                            <span className="text-xs text-muted-foreground capitalize">{userDetails.role}</span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                           <Link href={profileLink}>
                                <User className="mr-2 h-4 w-4" />
                                <span>My Profile</span>
                           </Link>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </>
        )}
      </div>
    </header>
  );
}
