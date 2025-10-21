import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getTickets } from '@/services/ticket';
import type { ITicket, IGetTicket } from '@/typescript/ticket';

const LOAD_LIMIT = 25;
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
      //console.log(tickets);
      return tickets;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < LOAD_LIMIT) {
        return undefined;
      }
      return allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 10, // ✅ AUMENTADO: 10 minutos - datos frescos por más tiempo
    refetchInterval: false, // ❌ REMOVIDO: Ya no hacemos polling - usamos Socket.IO
    refetchIntervalInBackground: false, // ❌ REMOVIDO: Sin refetch en background
    refetchOnWindowFocus: false, // ❌ REMOVIDO: Sin refetch automático al hacer foco
    refetchOnMount: false, // ❌ OPTIMIZADO: Solo refetch si los datos están obsoletos
    refetchOnReconnect: 'always', // ✅ CONSERVADO: Refetch al reconectar internet
    enabled: enabled, // Controla si la query debe ejecutarse
    networkMode: 'online',
    placeholderData: previousData => previousData, // Mantener datos previos mientras carga
    gcTime: 1000 * 60 * 30, // ✅ AUMENTADO: 30 minutos en caché para mayor persistencia
  });

  const allTicketsData = ticketsQueryData?.pages?.flat() ?? [];
  console.log(allTicketsData);
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
      console.log(`🎯 Loaded ${tickets.length} tickets with filters:`, filters, `(page ${pageParam})`);
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
    refetchOnWindowFocus: hasFilters, // Refetch en focus solo para filtros (teams)
    refetchOnMount: true, // Siempre refetch al montar para datos actualizados
    refetchOnReconnect: 'always',
    enabled: enabled,
    networkMode: 'online',
    gcTime: hasFilters ? 1000 * 60 * 5 : 1000 * 60 * 10, // Menos caché para filtros
  });

  const allTicketsData = ticketsQueryData?.pages?.flat() ?? [];
  
  // Función para invalidar tanto los datos globales como filtrados
  const invalidateRelatedQueries = useCallback(async () => {
    console.log(`🗑️ Smart refresh: removing stale data and refetching fresh:`, queryKey);
    
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
      
      console.log(`✅ Smart refresh completed - data removed, will fetch fresh:`, queryKey);
    } catch (error) {
      console.error('❌ Error during smart refresh:', error);
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
