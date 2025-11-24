
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import FirebaseAnalytics from '@/components/firebase-analytics';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotPopup } from '@copilotkit/react-ui';
import { CopilotContextProvider } from '@/components/copilot-context-provider';
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
          <CopilotContextProvider>
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
                  instructions="You are an AI documentation assistant for SenseiSeek - a marketplace connecting fractional executives with startups. You have access to all project documentation including the README, architecture docs, matching implementation details, API specs, and feature descriptions. Help users understand how the platform works, its architecture, matching algorithm, tech stack, and how to use or extend the system. Provide detailed, accurate answers based on the documentation provided to you."
                  labels={{
                    title: "SenseiSeek Docs Assistant",
                    initial: "Hi! 👋 I'm your SenseiSeek documentation assistant. I have access to all the project docs and can help you understand the platform architecture, features, matching system, and more. What would you like to know?",
                  }}
                />
              </ThemeProvider>
            </AuthProvider>
          </CopilotContextProvider>
        </CopilotKit>
      </body>
    </html>
  );
}
