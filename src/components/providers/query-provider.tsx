'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

// Crear el QueryClient con configuración personalizada
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // @ts-expect-error none
      onError: (error: unknown) => {
        if (error instanceof Error && error.message.toLowerCase().includes('timeout')) {
          console.error('Timeout error:', error);
        }
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setupPersistor = async () => {
      const asyncStoragePersister = createAsyncStoragePersister({
        storage: {
          getItem: async key => get(key),
          setItem: async (key, value) => set(key, value),
          removeItem: async key => del(key),
        },
      });

      persistQueryClient({
        queryClient,
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: query => query.state.status === 'success',
        },
      });

      setIsReady(true);
    };

    setupPersistor();
  }, []);

  if (!isReady) return null;

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
