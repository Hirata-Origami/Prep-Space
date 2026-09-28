'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { SWRConfig } from 'swr';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      themes={['light', 'dark']}
      storageKey="prepspace_theme"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SWRConfig
        value={{
          fetcher: (url: string) => fetch(url).then(res => res.json()),
          provider: () => {
            if (typeof window === 'undefined') return new Map();
            const map = new Map(JSON.parse(localStorage.getItem('app-cache') || '[]'));
            window.addEventListener('beforeunload', () => {
              const appCache = JSON.stringify(Array.from(map.entries()));
              localStorage.setItem('app-cache', appCache);
            });
            return map;
          },
          revalidateOnFocus: false,
          revalidateIfStale: true,
        }}
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
              style: {
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-hover)',
                borderRadius: 'var(--radius-panel)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                boxShadow: 'var(--shadow-float)',
              },
            }}
          />
        </QueryClientProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
