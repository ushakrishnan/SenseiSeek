
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogOut } from 'lucide-react';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from './auth-provider';
import { auth } from '@/lib/firebase-client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { clearSessionCookie } from '@/lib/actions';

export function Header() {
  const { user, userDetails } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    await clearSessionCookie();
    router.push('/');
  };
  
  const navItems = [
    { name: 'For Startups', href: '/startups' },
    { name: 'For Executives', href: '/executives' },
  ];
  
  let dashboardLink = '/login';
  if (user && userDetails?.role) {
    if (userDetails.role === 'admin') {
      dashboardLink = '/admin/dashboard';
    } else {
      dashboardLink = `/${userDetails.role}s/dashboard`;
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {item.name}
              </Link>
            ))}
             <Link
                href={dashboardLink}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Dashboard
              </Link>
          </nav>
        </div>

        {/* Mobile Nav */}
        <div className="flex items-center md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0 pt-12">
              <nav className="flex flex-col gap-6 text-lg font-medium">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.name}>
                    <Link
                      href={item.href}
                      className="transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                      {item.name}
                    </Link>
                  </SheetClose>
                ))}
                 <SheetClose asChild>
                    <Link
                      href={dashboardLink}
                      className="transition-colors hover:text-foreground/80 text-foreground/60"
                    >
                      Dashboard
                    </Link>
                  </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="ml-4">
            <Link href="/">
              <Logo />
            </Link>
          </div>
        </div>
        
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="default">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
