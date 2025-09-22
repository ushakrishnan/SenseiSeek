
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function PrivacyPolicyPage() {
  return (
    <div className="theme-orange flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-headline">Privacy Policy</h1>
            <p className="mt-4 text-lg text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </section>

        <section className="pb-16 md:pb-24">
            <div className="container mx-auto px-4 max-w-4xl">
                 <div className="prose prose-lg dark:prose-invert max-w-none mx-auto">
                    <p>
                    Welcome to Sensei Seek ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services (collectively, the "Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
                    </p>

                    <h2>1. Information We Collect</h2>
                    <p>
                    We may collect information about you in a variety of ways. The information we may collect on the Service includes:
                    </p>
                    <ul>
                    <li>
                        <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Service or when you choose to participate in various activities related to the Service.
                    </li>
                    <li>
                        <strong>Professional Data:</strong> For executives, we collect information related to your professional background, including your resume, work history, skills, expertise, availability, and compensation expectations. For startups, we collect details about your company, its needs, project scope, and budget.
                    </li>
                    <li>
                        <strong>Derivative Data:</strong> Information our servers automatically collect when you access the Service, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Service.
                    </li>
                    </ul>

                    <h2>2. How We Use Your Information</h2>
                    <p>
                    Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:
                    </p>
                    <ul>
                    <li>Create and manage your account.</li>
                    <li>Facilitate the core matchmaking process between executives and startups.</li>
                    <li>Email you regarding your account or order.</li>
                    <li>Enable user-to-user communications.</li>
                    <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Service.</li>
                    <li>Generate a personal profile about you to make future visits to the Service more personalized.</li>
                    <li>Monitor and analyze usage and trends to improve your experience with the Service.</li>
                    <li>Notify you of updates to the Service.</li>
                    <li>Request feedback and contact you about your use of the Service.</li>
                    </ul>

                    <h2>3. Disclosure of Your Information</h2>
                    <p>
                    We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                    </p>
                    <ul>
                        <li>
                            <strong>To Other Users:</strong> To facilitate our matchmaking service, your profile information (for both executives and startups) will be shared with other users of the platform. Startup profiles are visible to executives, and executive profiles are visible to startups.
                        </li>
                        <li>
                            <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
                        </li>
                        <li>
                            <strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including data analysis, hosting services, customer service, and marketing assistance.
                        </li>
                    </ul>

                    <h2>4. Security of Your Information</h2>
                    <p>
                    We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                    </p>

                    <h2>5. Your Rights and Options</h2>
                    <p>
                    You have the right to access, update, or delete the information we have on you. You can review and change your information at any time by logging into your account and visiting your profile page. If you wish to terminate your account, you may do so through your account settings or by contacting us.
                    </p>

                    <h2>6. Contact Us</h2>
                    <p>
                        If you have questions or comments about this Privacy Policy, please contact us through our <a href="/contact">contact page</a>.
                    </p>
                </div>
            </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
