
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="theme-orange flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline">Terms of Service</h1>
            <p className="mt-4 text-lg text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </section>

        <section className="pb-16 md:pb-24">
            <div className="container mx-auto px-4 max-w-4xl">
                 <div className="space-y-12">
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">1. Agreement to Terms</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                            By accessing or using the Sensei Seek platform, websites, and services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you do not have permission to access the Service.
                            </p>
                        </div>
                    </div>
                     <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">2. Description of Service</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                            Sensei Seek provides a marketplace platform to connect individuals or entities seeking fractional executive services ("Startups") with skilled professionals providing such services ("Executives"). We act as a neutral facilitator and are not a party to any direct agreement or engagement formed between a Startup and an Executive. We do not employ Executives and are not an employment agency. Our responsibilities are limited to facilitating the availability of the Service.
                            </p>
                        </div>
                    </div>
                     <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">3. User Accounts</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                            When you create an account with us, you guarantee that you are above the age of 18 and that the information you provide us is accurate, complete, and current at all times. Inaccurate, incomplete, or obsolete information may result in the immediate termination of your account on the Service. You are responsible for maintaining the confidentiality of your account and password, and you agree to accept responsibility for all activities that occur under your account.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">4. User Conduct and Responsibilities</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                            You agree not to use the Service to:
                            </p>
                            <ul className="list-disc list-inside space-y-2">
                                <li>Post any information that is false, misleading, fraudulent, or inaccurate.</li>
                                <li>Engage in any activity that is illegal, defamatory, obscene, or discriminatory.</li>
                                <li>Violate the intellectual property rights of others.</li>
                                <li>Attempt to circumvent any fee or payment structures of the Service.</li>
                                <li>Distribute spam, chain letters, or other unsolicited communications.</li>
                            </ul>
                            <p>
                                Startups and Executives are solely responsible for any contracts, agreements, or engagements they enter into with each other. Sensei Seek is not responsible for the performance or conduct of any user.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">5. Intellectual Property</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                            The Service and its original content, features, and functionality are and will remain the exclusive property of Sensei Seek and its licensors. You retain all rights to the content you submit or post on the platform ("User Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute such User Content in connection with operating and promoting the Service.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">6. Termination</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including but not limited to a breach of the Terms.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">7. Limitation of Liability</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                                To the maximum extent permitted by applicable law, in no event shall Sensei Seek, its affiliates, directors, or employees, be liable for any indirect, punitive, incidental, special, consequential, or exemplary damages, including without limitation damages for loss of profits, goodwill, use, data, or other intangible losses, arising out of or relating to the use of, or inability to use, the Service.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">8. Governing Law</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                                These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which our company is established, without regard to its conflict of law provisions.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">9. Changes to Terms</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days' notice before any new terms taking effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold font-headline mb-4 text-primary">10. Contact Us</h2>
                        <div className="space-y-4 text-lg text-muted-foreground">
                            <p>
                                If you have any questions about these Terms, please contact us via our <Link href="/contact" className="text-primary hover:underline">contact page</Link>.
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
