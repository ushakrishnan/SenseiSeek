import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="theme-orange flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        {/* Page Header */}
        <section className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline">The Future of Executive Leadership</h1>
            <p className="mt-4 text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground">
              We believe that transformative expertise shouldn't be a luxury. We're on a mission to democratize strategic leadership for the next generation of innovators.
            </p>
        </section>

        {/* Our Story Section */}
        <section className="pb-16 md:pb-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold font-headline mb-4 text-primary">The Gap We Saw</h2>
                <div className="space-y-4 text-lg text-muted-foreground">
                    <p>
                    In today's hyper-competitive landscape, startups are expected to scale faster than ever. They need world-class strategic guidance in marketing, operations, and technology to navigate critical growth phases. However, the traditional C-suite hiring model is often too slow and too costly for early-stage companies.
                    </p>
                    <p>
                    On the other side, we saw a wealth of seasoned, successful executives—leaders who had built and scaled companies—seeking more flexible, high-impact ways to apply their wisdom without the constraints of a full-time role. A vast reservoir of talent was looking for its next great challenge.
                    </p>
                </div>
              </div>
              <div>
                <Image 
                  src="/assets/about1.jpg" 
                  alt="Team brainstorming session"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* The Solution Section */}
        <section className="py-16 md:py-24 bg-secondary/50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
               <div className="order-2 md:order-1">
                 <Image 
                  src="/assets/about2.jpg" 
                  alt="Connecting puzzle pieces"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg"
                />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl font-bold font-headline mb-4 text-primary">Building The Bridge</h2>
                 <div className="space-y-4 text-lg text-muted-foreground">
                    <p>
                    Sensei Seek was born from this realization. We built a curated ecosystem to be the bridge between these two worlds. Our platform uses intelligent matchmaking to connect elite fractional executives with the innovative startups that need them most.
                    </p>
                    <p>
                    We facilitate partnerships that are more than just filling a role—they're about forging strategic alliances that drive real, measurable results. For startups, we unlock a talent pool that was once inaccessible. For executives, we offer the freedom to do meaningful work on their own terms.
                    </p>
                     <p className="font-semibold text-foreground">
                        Welcome to the future of executive leadership. Welcome to Sensei Seek.
                    </p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
