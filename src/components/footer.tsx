import { Logo } from './logo';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 inline-block">
              <Logo />
            </Link>
            <p className="text-sm text-muted-foreground">
              Connecting Fractional Executives with Innovative Startups.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 md:col-span-3 gap-8">
            <div>
              <h4 className="font-headline text-sm font-semibold mb-2">For Startups</h4>
              <ul className="space-y-2">
                <li><Link href="/startups/needs/new" className="text-sm text-muted-foreground hover:text-primary transition-colors">Post a Need</Link></li>
                <li><Link href="/startups/find-talent" className="text-sm text-muted-foreground hover:text-primary transition-colors">Find Talent</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-headline text-sm font-semibold mb-2">For Executives</h4>
              <ul className="space-y-2">
                <li><Link href="/executives/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">Create Profile</Link></li>
                <li><Link href="/executives/opportunities/find" className="text-sm text-muted-foreground hover:text-primary transition-colors">Find Opportunities</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-headline text-sm font-semibold mb-2">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
                <li><Link href="/privacypolicy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="/tos" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Sensei Seek. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            {/* Social icons can be added here */}
          </div>
        </div>
      </div>
    </footer>
  );
}
