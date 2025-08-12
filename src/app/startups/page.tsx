

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Rocket, Zap, Users, BrainCircuit } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getExecutiveProfileById } from '@/lib/actions';
import { ExecutiveProfile } from '@/lib/types';

// Dummy data for featured executives - this can be replaced with a fetch from your database
const featuredExecutives: Partial<ExecutiveProfile>[] = [
    {
        id: 'exec-1',
        name: 'Eleanor Vance',
        expertise: 'Fractional CMO with 15+ years in B2B SaaS growth...',
        industryExperience: ['SaaS', 'Fintech', 'B2B Marketing'],
        photoUrl: 'https://placehold.co/100x100.png',
        dataAiHint: 'woman portrait professional',
    },
    {
        id: 'exec-2',
        name: 'Marcus Thorne',
        expertise: 'Interim COO skilled in scaling operations for Series A/B startups...',
        industryExperience: ['E-commerce', 'Logistics', 'Operations Management'],
        photoUrl: 'https://placehold.co/100x100.png',
        dataAiHint: 'man portrait corporate',
    },
    {
        id: 'exec-3',
        name: 'Jian Li',
        expertise: 'Fractional CTO with a background in AI/ML and data infrastructure...',
        industryExperience: ['AI/ML', 'Big Data', 'Technical Strategy'],
        photoUrl: 'https://placehold.co/100x100.png',
        dataAiHint: 'asian woman portrait',
    }
];


export default function StartupLandingPage() {
 

  return (
    <div className="theme-orange">
      <Header />
      <main className="flex-grow">
        <div className="w-full">
          {/* Hero Section */}
          <section className="relative py-24 md:py-32 bg-gradient-to-br from-primary via-primary to-orange-700 text-primary-foreground">
            <div className="container mx-auto text-center px-4">
              <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter">Supercharge Your Growth.</h1>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/80">
                Access the C-suite expertise you need, exactly when you need it. Connect with world-class fractional executives ready to tackle your biggest challenges.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/startups/needs/new">Post Your Need</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-primary" asChild>
                  <Link href="/startups/dashboard">Browse Talent</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">The Unfair Advantage</h2>
                <p className="mt-2 text-lg text-foreground/70">Gain strategic firepower without the full-time overhead.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <Rocket className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">Accelerate Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">Embed seasoned leaders to navigate critical growth phases and bypass common pitfalls.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <BrainCircuit className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">On-Demand Expertise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">Access specialized skills in marketing, finance, operations, or tech for specific projects.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">Capital Efficient</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">Get the benefits of a C-suite executive at a fraction of the cost of a full-time hire.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">Vetted Talent Pool</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">Our network consists of experienced executives with proven track records in scaling companies.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Featured Executives Section */}
          <section className="py-20 md:py-28 bg-secondary/50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">Meet Some of Our Executives</h2>
                <p className="mt-2 text-lg text-foreground/70">A sample of the elite talent available on our platform.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredExecutives.map((exec) => (
                  <Card key={exec.id} className="flex flex-col">
                     <CardHeader className="flex-row items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={exec.photoUrl} data-ai-hint={exec.dataAiHint} className="object-cover" />
                        <AvatarFallback>{exec.name ? exec.name.substring(0, 2) : '??'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="font-headline text-xl">{exec.name}</CardTitle>
                        <CardDescription>{exec.expertise?.split('with')[0]}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {exec.expertise}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(exec.industryExperience) && exec.industryExperience.map((exp) => (
                          <Badge key={exp} variant="secondary">{exp.trim()}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
          
          {/* Final CTA */}
          <section className="py-24 md:py-32 bg-background">
            <div className="container mx-auto text-center px-4 max-w-3xl">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">Ready to Find Your Next Leader?</h2>
              <p className="mt-4 text-lg text-foreground/80">
                Post your project or executive need and let our AI-powered matching engine connect you with the perfect candidate to drive your business forward.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/startups/needs/new">Define Your Need for Free</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
