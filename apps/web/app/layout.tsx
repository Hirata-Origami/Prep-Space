import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'PrepSpace — Train Like It\'s Real. Land What You Deserve.',
  description: 'The AI-native interview prep platform that knows exactly where you are and trains you precisely for where you need to be. Powered by Gemini 2.5 Flash Live.',
  keywords: ['interview prep', 'AI interview', 'coding interview', 'system design', 'career readiness'],
  openGraph: {
    title: 'PrepSpace — AI Interview & Career Readiness Platform',
    description: 'Train like it\'s real. Land what you deserve.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
