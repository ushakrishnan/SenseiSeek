
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Briefcase, Zap, Clock, TrendingUp } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';


export default function ExecutiveLandingPage() {
  const featuredRoles = [
    {
      title: 'Fractional CMO',
      company: 'Fintech Innovators Inc.',
      location: 'Remote',
      expertise: 'B2B SaaS, Growth Marketing',
      compensation: '$12,000/month',
    },
    {
      title: 'Interim COO',
      company: 'HealthTech Pioneers',
      location: 'Remote (US)',
      expertise: 'Operations Scaling, Series B+',
      compensation: '$18,000/month',
    },
    {
      title: 'Fractional CTO',
      company: 'AI Start-up',
      location: 'Remote (Global)',
      expertise: 'AI/ML, Team Leadership',
      compensation: 'Equity + Stipend',
    },
  ];

  return (
    <div className="theme-blue">
      <Header />
      <main className="flex-grow">
        <div className="w-full">
          {/* Hero Section */}
          <section className="relative py-24 md:py-32 bg-gradient-to-br from-primary via-primary to-blue-800 text-primary-foreground">
            <div className="container mx-auto text-center px-4">
              <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter">Define Your Own Success.</h1>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/80">
                Leverage your expertise on your terms. Join a curated community of elite executives and engage with innovative startups on impactful, flexible projects.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/executives/profile/view">Create Your Profile</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-primary" asChild>
                  <Link href="/executives/dashboard">View Opportunities</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">The New Paradigm of Executive Work</h2>
                <p className="mt-2 text-lg text-foreground/70">More impact, more flexibility, more control.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <Clock className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">Ultimate Flexibility</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">Choose your projects, set your hours, and work from anywhere.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">High-Impact Work</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">Apply your skills to solve critical challenges for high-growth startups.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <DollarSign className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">Lucrative Compensation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">Earn top-tier rates for your expertise without the commitment of a full-time role.</p>
                  </CardContent>
                </Card>
                <Card className="text-center bg-card/50 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="font-headline mt-4">Curated Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80">We bring vetted, exciting opportunities directly to you, saving you time.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Featured Roles Section */}
          <section className="py-20 md:py-28 bg-secondary/50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">Featured Fractional Roles</h2>
                <p className="mt-2 text-lg text-foreground/70">Explore some of the exciting opportunities available now.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredRoles.map((role, index) => (
                  <Card key={index} className="flex flex-col justify-between">
                    <CardHeader>
                      <CardTitle className="font-headline text-xl">{role.title}</CardTitle>
                      <p className="text-muted-foreground">{role.company}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="secondary">{role.location}</Badge>
                        <Badge variant="secondary">{role.expertise}</Badge>
                      </div>
                      <div className="flex items-center text-lg font-semibold">
                        <DollarSign className="h-5 w-5 mr-2 text-primary" />
                        <span>{role.compensation}</span>
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
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">Ready to Shape the Future of Work?</h2>
              <p className="mt-4 text-lg text-foreground/80">
                Your next great challenge awaits. Join Sensei Seek to unlock a world of high-impact, flexible executive opportunities and connect with the startups that are changing the world.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/executives/profile/view">Build Your Executive Profile</Link>
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
