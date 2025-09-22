
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import FirebaseAnalytics from '@/components/firebase-analytics';
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
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
