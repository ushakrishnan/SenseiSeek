
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import FirebaseAnalytics from '@/components/firebase-analytics';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sensei Seek',
  description: 'Connecting Fractional Executives with Innovative Startups',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background">
        <CopilotKit publicApiKey={process.env.NEXT_PUBLIC_COPILOTKIT_PUBLIC_API_KEY || ''}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster />
              <FirebaseAnalytics />
              <CopilotPopup
                instructions="You are an AI assistant helping users with the Sensei Seek platform - a marketplace connecting fractional executives with startups. Help users navigate the platform, understand features, and answer questions about matching, profiles, and opportunities."
                labels={{
                  title: "Sensei Seek Assistant",
                  initial: "Hi! 👋 I'm your Sensei Seek assistant. How can I help you today?",
                }}
              />
            </ThemeProvider>
          </AuthProvider>
        </CopilotKit>
      </body>
    </html>
  );
}
