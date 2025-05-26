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
    staleTime: 0,
    refetchInterval: enabled ? 3000 : false, // Solo refetch si está habilitado
    refetchIntervalInBackground: enabled,
    // Estas opciones mantienen la query activa incluso cuando no está visible
    refetchOnWindowFocus: enabled,
    refetchOnMount: enabled,
    refetchOnReconnect: enabled,
    enabled: enabled, // Controla si la query debe ejecutarse
    // Evita que se pause cuando la página no es visible
    networkMode: 'always',
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