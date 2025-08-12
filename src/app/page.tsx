

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Rocket, Briefcase, Zap, Video, CheckCircle } from 'lucide-react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function HomePage() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'CEO at Innovate Inc.',
      avatar: 'https://placehold.co/100x100.png',
      dataAiHint: 'woman portrait professional',
      quote:
        "Sensei Seek connected us with a world-class fractional CMO who transformed our go-to-market strategy. We saw a 200% increase in qualified leads within three months. Game-changing.",
    },
    {
      name: 'David Lee',
      role: 'Fractional CTO',
      avatar: 'https://placehold.co/100x100.png',
      dataAiHint: 'man portrait corporate',
      quote:
        'The quality of opportunities on Sensei Seek is unparalleled. I get to work on impactful projects with high-growth startups without the grind of a full-time role. It’s the future of executive work.',
    },
  ];

  return (
    <div className="theme-orange">
      <Header />
      <main className="flex-grow">
        <div className="w-full">
          {/* Hero Section */}
          <section className="relative h-[60vh] md:h-[60vh] flex items-center justify-center text-white overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50 z-10"></div>
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 object-cover z-0"
            >
              <source src="/assets/homevideo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            <div className="relative z-20 container mx-auto text-center px-4">
              <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter">
                Where Expertise Meets Opportunity.
              </h1>
              <p className="mt-4 max-w-3xl mx-auto text-lg text-white/80">
                The premier platform connecting elite fractional executives with innovative startups poised for explosive growth. Find your strategic match and build the future, together.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                    <Link href="/startups">I'm a Startup Looking to Hire</Link>
                </Button>
                <span className="text-white/60 mx-4 hidden sm:block">or</span>
                 <Button size="lg" className="w-full sm:w-auto bg-[hsl(var(--exec-blue))] hover:bg-[hsl(var(--exec-blue))]/90 text-primary-foreground" asChild>
                    <Link href="/executives">I'm an Executive Looking for a Role</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* For Startups / For Executives Section */}
          <section className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* For Startups */}
                <div className="flex flex-col items-center text-center p-8 border rounded-lg bg-card/50">
                    <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <Rocket className="h-10 w-10 text-primary" />
                    </div>
                  <h2 className="font-headline text-3xl font-bold mb-4">For Startups</h2>
                  <p className="text-foreground/70 mb-6 max-w-md">
                    Stop compromising on leadership. Access the strategic brilliance of a C-suite executive on a flexible, cost-effective basis.
                  </p>
                  <ul className="space-y-3 text-left mb-8 text-foreground/80">
                    <li className="flex items-start"><CheckCircle className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" /><span>Gain C-suite expertise without the full-time cost.</span></li>
                    <li className="flex items-start"><CheckCircle className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" /><span>Accelerate growth by bypassing common scaling pitfalls.</span></li>
                    <li className="flex items-start"><CheckCircle className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" /><span>Find the perfect leader for your specific challenge and stage.</span></li>
                  </ul>
                  <Button asChild>
                    <Link href="/startups">Explore the Talent Pool</Link>
                  </Button>
                </div>
                {/* For Executives */}
                 <div className="flex flex-col items-center text-center p-8 border rounded-lg bg-card/50">
                    <div className="p-4 bg-blue-500/10 rounded-full mb-4">
                        <Briefcase className="h-10 w-10 text-blue-500" />
                    </div>
                  <h2 className="font-headline text-3xl font-bold mb-4">For Executives</h2>
                  <p className="text-foreground/70 mb-6 max-w-md">
                    Leverage your hard-won expertise on your own terms. Engage with exciting, high-impact projects that fit your lifestyle.
                  </p>
                   <ul className="space-y-3 text-left mb-8 text-foreground/80">
                    <li className="flex items-start"><CheckCircle className="h-5 w-5 mr-3 mt-1 text-blue-500 flex-shrink-0" /><span>Choose high-impact, curated fractional roles.</span></li>
                    <li className="flex items-start"><CheckCircle className="h-5 w-5 mr-3 mt-1 text-blue-500 flex-shrink-0" /><span>Define your own work-life balance and schedule.</span></li>
                    <li className="flex items-start"><CheckCircle className="h-5 w-5 mr-3 mt-1 text-blue-500 flex-shrink-0" /><span>Command premium compensation for your specialized skills.</span></li>
                  </ul>
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/executives">View Available Roles</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
          
          {/* Testimonials Section */}
          <section className="py-20 md:py-28 bg-secondary/50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">Trusted by the Best</h2>
                <p className="mt-2 text-lg text-foreground/70">See what our users are saying about Sensei Seek.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {testimonials.map((testimonial, index) => (
                  <Card key={index} className="bg-background">
                    <CardContent className="pt-6">
                      <p className="mb-4 text-foreground/80 italic">"{testimonial.quote}"</p>
                    </CardContent>
                    <CardHeader className="flex flex-row items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={testimonial.avatar} data-ai-hint={testimonial.dataAiHint} />
                        <AvatarFallback>{testimonial.name.substring(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-24 md:py-32 bg-background">
            <div className="container mx-auto text-center px-4 max-w-3xl">
              <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">Ready to Find Your Perfect Match?</h2>
              <p className="mt-4 text-lg text-foreground/80">
                Join a community of innovators and leaders who are shaping the future of business. Your next big opportunity is just a click away.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started Now</Link>
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
