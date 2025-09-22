
import { SignupForm } from './signup-form';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export default function SignupPage() {
  return (
    <div className="flex flex-col min-h-screen theme-orange">
      <Header />
      <main className="flex-grow">
        <div className="mx-auto py-12 px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600" data-nosnippet>
                Join Sensei Seek
              </h1>
              <p className="mt-4 text-lg text-foreground/80">
                Create your account to get started. After signing up, you'll be guided to the next steps based on your role.
              </p>
            </div>
            <SignupForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
