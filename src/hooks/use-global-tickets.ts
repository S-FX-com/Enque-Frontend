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
      console.log(`Global: Fetching tickets with skip: ${pageParam}`);
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
    staleTime: 1000 * 60 * 2, // 2 minutos - datos frescos por más tiempo
    refetchInterval: enabled ? 30000 : false, // Refetch cada 30 segundos (menos agresivo)
    refetchIntervalInBackground: false, // No refetch en background para evitar lentitud
    // Configuración optimizada para navegación rápida
    refetchOnWindowFocus: false, // No refetch automático al hacer foco
    refetchOnMount: 'always', // Siempre refetch pero no bloquea UI
    refetchOnReconnect: enabled,
    enabled: enabled, // Controla si la query debe ejecutarse
    // Configuración para mostrar datos en caché inmediatamente
    networkMode: 'online',
    // Configuraciones para mejor UX
    placeholderData: (previousData) => previousData, // Mantener datos previos mientras carga
    gcTime: 1000 * 60 * 10, // 10 minutos en caché
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