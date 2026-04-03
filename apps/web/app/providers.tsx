'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
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
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
            },
          }}
        />
      </QueryClientProvider>
    </SWRConfig>
  );
}
