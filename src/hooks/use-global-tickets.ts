import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { getTickets } from '@/services/ticket';
import type { ITicket } from '@/typescript/ticket';

const LOAD_LIMIT = 20;
const STALE_TIME = 1000 * 60 * 5; // 5 minutes
const GC_TIME = 1000 * 60 * 10; // 10 minutes
type TicketPage = ITicket[];

export function useGlobalTickets(enabled: boolean = true) {
  const queryClient = useQueryClient();

  const queryOptions = {
    queryKey: ['tickets'] as const,
    queryFn: async ({ pageParam = 0 }: { pageParam: number }) => {
      const tickets = await getTickets({ skip: pageParam, limit: LOAD_LIMIT });
      return tickets;
    },
    getNextPageParam: (lastPage: TicketPage, allPages: TicketPage[]) => {
      return lastPage.length < LOAD_LIMIT ? undefined : allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: STALE_TIME,
    refetchOnReconnect: true,
    enabled,
    networkMode: 'online' as const,
    placeholderData: (previousData: InfiniteData<TicketPage> | undefined) => previousData,
    gcTime: GC_TIME,
  };

  const {
    data: ticketsQueryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    error: ticketsError,
  } = useInfiniteQuery(queryOptions);

  const allTicketsData = ticketsQueryData?.pages.flat() ?? [];

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
