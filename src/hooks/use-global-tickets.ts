import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getTickets } from '@/services/ticket';
import type { ITicket, IGetTicket } from '@/typescript/ticket';
import { devLog } from '@/lib/dev-logger';

const LOAD_LIMIT = 50; // ✅ AUMENTADO: De 25 a 50 para cargar más tickets inicialmente
type TicketPage = ITicket[];

export function useGlobalTickets(enabled: boolean = true) {
  const queryClient = useQueryClient();

  const {
    data: ticketsQueryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    error: ticketsError,
    refetch,
  } = useInfiniteQuery<
    TicketPage,
    Error,
    InfiniteData<TicketPage, number>,
    readonly [string, ...unknown[]],
    number
  >({
    queryKey: ['tickets'],
    queryFn: async ({ pageParam = 0 }) => {
      const tickets = await getTickets({ skip: pageParam, limit: LOAD_LIMIT });
      return tickets;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < LOAD_LIMIT) {
        return undefined;
      }
      return allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2, // ⚡ OPTIMIZADO: 2 minutos (era 10) - Socket.IO mantiene datos frescos
    refetchInterval: false, // ❌ REMOVIDO: Ya no hacemos polling - usamos Socket.IO
    refetchIntervalInBackground: false, // ❌ REMOVIDO: Sin refetch en background
    refetchOnWindowFocus: false, // ❌ REMOVIDO: Sin refetch automático al hacer foco
    refetchOnMount: false, // ❌ OPTIMIZADO: Solo refetch si los datos están obsoletos
    refetchOnReconnect: 'always', // ✅ CONSERVADO: Refetch al reconectar internet
    enabled: enabled, // Controla si la query debe ejecutarse
    networkMode: 'online',
    placeholderData: previousData => previousData, // Mantener datos previos mientras carga
    gcTime: 1000 * 60 * 5, // ⚡ OPTIMIZADO: 5 minutos (era 30) - Limpieza más frecuente
  });

  const allTicketsData = ticketsQueryData?.pages?.flat() ?? [];
  return {
    allTicketsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingTickets,
    isTicketsError,
    ticketsError,
    queryClient,
    refetch,
  };
}

// Hook unificado para tickets con filtros opcionales
export function useTickets(enabled: boolean = true, filters: IGetTicket = {}) {
  const queryClient = useQueryClient();
  
  // Crear un key único basado en los filtros para evitar conflictos de caché
  const hasFilters = Object.keys(filters).length > 0;
  const baseKey = hasFilters ? 'filtered-tickets' : 'tickets';
  
  // Memoizar queryKey para evitar recalculaciones en cada render
  const queryKey = useMemo(() => {
    return hasFilters 
      ? [baseKey, JSON.stringify(filters)] as const
      : [baseKey] as const;
  }, [baseKey, hasFilters, filters]);

  const {
    data: ticketsQueryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    error: ticketsError,
    refetch,
  } = useInfiniteQuery<
    TicketPage,
    Error,
    InfiniteData<TicketPage, number>,
    readonly [string, ...unknown[]],
    number
  >({
    queryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const tickets = await getTickets({
        skip: pageParam,
        limit: LOAD_LIMIT,
        ...filters
      });
      devLog.log(`🎯 Loaded ${tickets.length} tickets with filters:`, filters, `(page ${pageParam})`);
      return tickets;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < LOAD_LIMIT) {
        return undefined;
      }
      return allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: hasFilters ? 1000 * 30 : 1000 * 60 * 2, // 30 segundos para filtros, 2 minutos para "All"
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false, // ❌ DESACTIVADO: Evita refetch al cambiar de tab
    refetchOnMount: false, // ❌ DESACTIVADO: Solo carga datos si no hay caché o están stale
    refetchOnReconnect: true, // ✅ CONSERVADO: Refetch solo al reconectar internet
    enabled: enabled,
    networkMode: 'online',
    gcTime: 1000 * 60 * 5, // ⚡ OPTIMIZADO: 5 minutos para todos (era 10 para "All")
  });

  const allTicketsData = ticketsQueryData?.pages?.flat() ?? [];
  
  // Función para invalidar tanto los datos globales como filtrados
  const invalidateRelatedQueries = useCallback(async () => {
    devLog.log(`🗑️ Smart refresh: removing stale data and refetching fresh:`, queryKey);

    try {
      // Estrategia híbrida: cancelar queries en curso, remover data, y refetch fresh
      await queryClient.cancelQueries({ queryKey, exact: true });

      // Remover los datos cached para forzar un fresh fetch
      queryClient.removeQueries({ queryKey, exact: true });

      // Invalidar contadores
      await queryClient.invalidateQueries({
        queryKey: ['user-teams-tickets-count'],
        refetchType: 'active',
        exact: true
      });

      devLog.log(`✅ Smart refresh completed - data removed, will fetch fresh:`, queryKey);
    } catch (error) {
      devLog.error('❌ Error during smart refresh:', error);
      throw error;
    }
  }, [queryClient, queryKey]);

  return {
    allTicketsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingTickets,
    isTicketsError,
    ticketsError,
    queryClient,
    refetch,
    invalidateRelatedQueries,
  };
}
