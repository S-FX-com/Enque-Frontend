import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { getTickets } from '@/services/ticket';
import type { ITicket } from '@/typescript/ticket';

const LOAD_LIMIT = 20;
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

  return {
    allTicketsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingTickets,
    isTicketsError,
    ticketsError,
    queryClient,
  };
}
