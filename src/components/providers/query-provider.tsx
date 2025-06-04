'use client';

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            gcTime: 1000 * 60 * 60 * 24,
          },
        },
      })
  );

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
  }, [queryClient]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const backgroundRefresh = () => {
        // Buscar todas las queries activas de tickets que realmente tienen datos
        const hasActiveTicketsQuery = queryClient.getQueryCache().findAll({
          queryKey: ['tickets'],
          predicate: query => query.state.status === 'success',
        });
        
        const hasActiveMyTicketsQuery = queryClient.getQueryCache().findAll({
          predicate: query => 
            Array.isArray(query.queryKey) && 
            query.queryKey.length >= 2 && 
            query.queryKey[0] === 'tickets' && 
            query.queryKey[1] === 'my' &&
            query.state.status === 'success',
        });

        // Buscar todas las queries de comentarios activas
        const activeCommentsQueries = queryClient.getQueryCache().findAll({
          predicate: query => 
            Array.isArray(query.queryKey) && 
            query.queryKey[0] === 'comments' &&
            query.state.status === 'success',
        });

        if (hasActiveTicketsQuery.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        }

        if (hasActiveMyTicketsQuery.length > 0) {
          queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] });
        }

        // Refrescar todos los comentarios abiertos
        activeCommentsQueries.forEach((query) => {
          queryClient.invalidateQueries({ queryKey: query.queryKey });
        });
      };

      const intervalId = setInterval(backgroundRefresh, 10000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
