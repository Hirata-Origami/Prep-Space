import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--ff-display',
  display: 'swap',
});

const body = Geist({
  subsets: ['latin'],
  variable: '--ff-body',
  display: 'swap',
});

const mono = Geist_Mono({
  subsets: ['latin'],
  variable: '--ff-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0e1a' },
    { media: '(prefers-color-scheme: light)', color: '#f5f6fb' },
  ],
};

export const metadata: Metadata = {
  title: 'PrepSpace — Train Like It\'s Real. Land What You Deserve.',
  description: 'The AI-native interview prep platform that knows exactly where you are and trains you precisely for where you need to be.',
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
    <html
      lang="en"
      data-theme="dark"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
