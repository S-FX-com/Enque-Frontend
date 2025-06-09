'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

// Crear un QueryClient con configuraciones optimizadas
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos por defecto
      gcTime: 1000 * 60 * 10, // 10 minutos en cache
      refetchOnWindowFocus: false, // ❌ Sin refetch al hacer foco
      refetchOnMount: false, // ❌ Solo refetch si datos obsoletos
      refetchInterval: false, // ❌ Sin polling automático - usamos Socket.IO
      refetchIntervalInBackground: false, // ❌ Sin polling en background
      retry: 2, // Reintentar 2 veces antes de fallar
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Reintentar mutaciones 1 vez
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
      });
    }
  }, []); // ✅ Removida dependencia innecesaria de queryClient

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
