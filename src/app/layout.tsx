
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
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <CopilotContextProvider>
                {children}
                <Toaster />
                <FirebaseAnalytics />
              </CopilotContextProvider>
            </ThemeProvider>
          </AuthProvider>
          {process.env.NEXT_PUBLIC_COPILOT_ENABLED === 'true' && (
            <CopilotPopup
              instructions="You are an AI documentation assistant for SenseiSeek - a marketplace connecting fractional executives with startups. You have access to all project documentation. Keep your responses SHORT and CONCISE - 2-3 sentences max unless the user explicitly asks for details. Use bullet points for lists. Get straight to the point. If asked 'how does X work', give a brief 1-2 sentence answer, then ask if they want more details."
              labels={{
                title: "SenseiSeek Docs Assistant",
                initial: "Hi! 👋 Ask me about SenseiSeek's architecture, features, or tech stack.",
              }}
            />
          )}
        </CopilotKit>
      </body>
    </html>
  );
}
