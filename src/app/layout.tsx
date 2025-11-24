
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import FirebaseAnalytics from '@/components/firebase-analytics';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotContextProvider } from '@/components/copilot-context-provider';
import { CopilotPopupWrapper } from '@/components/copilot-popup-wrapper';
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
            <CopilotPopupWrapper />
          )}
        </CopilotKit>
      </body>
    </html>
  );
}
