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
        // Buscar todas las queries de tickets
        const hasTicketsQuery = queryClient.getQueryCache().findAll({
          queryKey: ['tickets'],
        });
        const hasMyTicketsQuery = queryClient.getQueryCache().findAll({
          queryKey: ['tickets', 'my'],
        });

        // Buscar todas las queries de comentarios
        const commentsQueries = queryClient.getQueryCache().findAll({
          predicate: query => Array.isArray(query.queryKey) && query.queryKey[0] === 'comments',
        });

        if (hasTicketsQuery.length > 0) {
          console.log('Background refresh: Refreshing All Tickets');
          queryClient.refetchQueries({
            queryKey: ['tickets'],
            type: 'all',
            exact: false,
          });
        }

        if (hasMyTicketsQuery.length > 0) {
          console.log('Background refresh: Refreshing My Tickets');
          queryClient.refetchQueries({
            queryKey: ['tickets', 'my'],
            type: 'all',
            exact: true,
          });
        }

        // Refrescar todos los comentarios abiertos
        if (commentsQueries.length > 0) {
          console.log(`Background refresh: Refreshing ${commentsQueries.length} comment threads`);
          commentsQueries.forEach(query => {
            queryClient.refetchQueries({
              queryKey: query.queryKey,
              type: 'all',
              exact: true,
            });
          });
        }
      };

      // Intervalo global de actualización - 30 segundos es suficiente ya que los componentes
      // individuales tienen sus propios intervalos de actualización también
      const intervalId = setInterval(backgroundRefresh, 30000);

      return () => {
        clearInterval(intervalId);
      };
    }
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
