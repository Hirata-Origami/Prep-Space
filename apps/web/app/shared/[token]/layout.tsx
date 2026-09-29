import type { Metadata } from 'next';

// A shared report is private to whoever holds the link, so keep it out of search results.
export const metadata: Metadata = {
  title: 'Shared interview report',
  robots: { index: false, follow: false },
};

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return children;
}
