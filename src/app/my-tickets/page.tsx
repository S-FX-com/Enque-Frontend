'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MultiSelectFilter, type OptionType } from '@/components/filters/multi-select-filter';
import { Settings2, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
  useQuery,
  useQueryClient,
  useMutation,
  type InfiniteData,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { deleteTicket, mergeTickets, updateTicket } from '@/services/ticket';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDebounce } from '@/hooks/use-debounce';
import { motion } from 'framer-motion';
import type { ITicket, TicketStatus } from '@/typescript/ticket';
import type { IUser } from '@/typescript/user';
import { getUsers } from '@/services/user';
import { formatRelativeTime, cn } from '@/lib/utils';
import { getCurrentUser, type UserSession } from '@/lib/auth';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getTickets } from '@/services/ticket';
import { ICompany } from '@/typescript/company';
import { getCompanies } from '@/services/company';

function MyTicketsClientContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [subjectInput, setSubjectInput] = useState('');
  const debouncedSubjectFilter = useDebounce(subjectInput, 300);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false); // Changed to false
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [selectedTargetTicketId, setSelectedTargetTicketId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ CORREGIDO: Usar query específica para My Tickets en lugar de filtrar cache global
  const {
    data: myTicketsQueryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    error: ticketsError,
  } = useInfiniteQuery<
    ITicket[],
    Error,
    InfiniteData<ITicket[], number>,
    readonly [string, string, number],
    number
  >({
    queryKey: ['tickets', 'my', currentUser?.id || 0],
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentUser?.id) return [];
      const tickets = await getTickets(
        { skip: pageParam, limit: 50 },
        `/v1/tasks/assignee/${currentUser.id}`
      );
      return tickets;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < 50) {
        return undefined;
      }
      return allPages.flat().length;
    },
    initialPageParam: 0,
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: previousData => previousData,
    gcTime: 1000 * 60 * 30,
  });

  const allTicketsData = useMemo(() => {
    return myTicketsQueryData?.pages?.flat() ?? [];
  }, [myTicketsQueryData]);

  const statusOptions: OptionType[] = [
    { value: 'Unread', label: 'Unread' },
    { value: 'Open', label: 'Open' },
    { value: 'With User', label: 'With User' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Closed', label: 'Closed' },
  ];

  const priorityOptions: OptionType[] = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Critical', label: 'Critical' },
  ];

  const { data: usersData = [] } = useQuery<IUser[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const userOptions: OptionType[] = useMemo(() => {
    return usersData
      .filter((user: IUser) => user && user.id && user.name)
      .map((user: IUser) => ({
        value: user.id.toString(),
        label: user.name!,
      }));
  }, [usersData]);

  const { data: companiesData = [] } = useQuery<ICompany[]>({
    queryKey: ['companies'],
    queryFn: () => getCompanies(),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    getCurrentUser().then(setUser => setCurrentUser(setUser));
  }, []);

  useEffect(() => {
    const ticketIdToOpen = searchParams.get('openTicket');

    if (pathname === '/my-tickets') {
      if (selectedTeams && selectedTeams.length > 0) {
        setSelectedTeams([]);
      }

      if (window.location.href.includes('teamId=')) {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('teamId');
        newSearchParams.delete('teamName');
        if (ticketIdToOpen) {
          newSearchParams.set('openTicket', ticketIdToOpen);
        }
        router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allTicketsData, router, pathname]);

  const filteredTicketsData = useMemo(() => {
    let tickets = allTicketsData;

    if (selectedStatuses.length === 0) {
      tickets = tickets.filter(ticket => ticket.status !== 'Closed');
    }

    if (debouncedSubjectFilter) {
      const filter = debouncedSubjectFilter.toLowerCase();
      tickets = tickets.filter(ticket => ticket.title.toLowerCase().includes(filter));
    }

    if (selectedTeams.length > 0) {
      const teamIds = selectedTeams.map(id => Number.parseInt(id, 10));
      tickets = tickets.filter(ticket => ticket.team_id && teamIds.includes(ticket.team_id));
    }

    if (selectedUsers.length > 0) {
      const userIds = selectedUsers.map(id => Number.parseInt(id, 10));
      tickets = tickets.filter(ticket => ticket.user_id && userIds.includes(ticket.user_id));
    }

    if (selectedStatuses.length > 0) {
      tickets = tickets.filter(ticket => selectedStatuses.includes(ticket.status));
    }

    if (selectedPriorities.length > 0) {
      tickets = tickets.filter(ticket => selectedPriorities.includes(ticket.priority));
    }

    return tickets;
  }, [
    allTicketsData,
    debouncedSubjectFilter,
    selectedUsers,
    selectedStatuses,
    selectedPriorities,
    selectedTeams,
  ]);

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedTicketIds(new Set(allTicketsData.map(ticket => ticket.id)));
    } else {
      setSelectedTicketIds(new Set());
    }
  };

  const handleRowSelectChange = (ticketId: number, checked: boolean | 'indeterminate') => {
    setSelectedTicketIds(prev => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(ticketId);
      } else {
        next.delete(ticketId);
      }
      return next;
    });
  };

  const isAllSelected =
    allTicketsData.length > 0 && selectedTicketIds.size === allTicketsData.length;
  const isIndeterminate =
    selectedTicketIds.size > 0 && selectedTicketIds.size < allTicketsData.length;

  const headerCheckboxState = isAllSelected ? true : isIndeterminate ? 'indeterminate' : false;
  const deleteTicketsMutation = useMutation({
    mutationFn: async (ticketIds: number[]) => {
      const results = await Promise.allSettled(ticketIds.map(id => deleteTicket(id)));
      const failedDeletions = results
        .map((result, index) => ({ result, id: ticketIds[index] }))
        .filter(item => item.result.status === 'rejected');

      if (failedDeletions.length > 0) {
        const errorMessages = failedDeletions
          .map(item => {
            const reason = (item.result as PromiseRejectedResult).reason;
            const message = (reason as { message?: string })?.message || `Ticket ID ${item.id}`;
            return message;
          })
          .join(', ');
        console.error(`Failed to delete some tickets: ${errorMessages}`);
        throw new Error(`Failed to delete: ${errorMessages}`);
      }

      const nonSuccessResponses = results
        .map((result, index) => ({ result, id: ticketIds[index] }))
        .filter(item => {
          if (item.result.status === 'fulfilled') {
            const value = (
              item.result as PromiseFulfilledResult<{ success: boolean; message?: string }>
            ).value;
            return !value.success;
          }
          return false;
        });

      if (nonSuccessResponses.length > 0) {
        const errorMessages = nonSuccessResponses
          .map(item => {
            const response = (
              item.result as PromiseFulfilledResult<{ success: boolean; message?: string }>
            ).value;
            return response.message || `Ticket ID ${item.id}`;
          })
          .join(', ');
        console.error(`API reported failure for some tickets: ${errorMessages}`);
        throw new Error(`API reported failure for some tickets: ${errorMessages}`);
      }
      return results;
    },
    onSuccess: () => {},
    onMutate: async ticketIdsToDelete => {
      await queryClient.cancelQueries({ queryKey: ['tickets', 'my', currentUser?.id] });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
        'my',
        currentUser?.id,
      ]);

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets', 'my', currentUser?.id],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.filter((ticket: ITicket) => !ticketIdsToDelete.includes(ticket.id))
          );
          return { ...oldData, pages: newPages };
        }
      );

      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser?.id]) || 0;

      const allTickets = previousTicketsData?.pages.flat() || [];
      const deletedTickets = allTickets.filter(ticket => ticketIdsToDelete.includes(ticket.id));
      const activeDeletedCount = deletedTickets.filter(
        ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
      ).length;
      const myActiveDeletedCount = deletedTickets.filter(
        ticket =>
          ticket.assignee_id === currentUser?.id &&
          ticket.status !== 'Closed' &&
          ticket.status !== 'Resolved'
      ).length;

      queryClient.setQueryData(
        ['ticketsCount', 'all'],
        Math.max(0, currentAllCount - activeDeletedCount)
      );
      if (currentUser?.id) {
        queryClient.setQueryData(
          ['ticketsCount', 'my', currentUser.id],
          Math.max(0, currentMyCount - myActiveDeletedCount)
        );
      }

      setSelectedTicketIds(new Set());
      setIsDeleteDialogOpen(false);
      return {
        previousTicketsData,
        previousAllCount: currentAllCount,
        previousMyCount: currentMyCount,
      };
    },
    onError: (
      err: Error,
      ticketIdsToDelete: number[],
      context:
        | {
            previousTicketsData?: InfiniteData<ITicket[], number>;
            previousAllCount?: number;
            previousMyCount?: number;
          }
        | undefined
    ) => {
      toast.error(`Error deleting tickets: ${err.message}`);
      console.error(`Error deleting tickets mutation: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(['tickets', 'my', currentUser?.id], context.previousTicketsData);
      }
      // Revert counter updates on error
      if (context?.previousAllCount !== undefined) {
        queryClient.setQueryData(['ticketsCount', 'all'], context.previousAllCount);
      }
      if (context?.previousMyCount !== undefined && currentUser?.id) {
        queryClient.setQueryData(['ticketsCount', 'my', currentUser.id], context.previousMyCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
    },
  });

  const bulkCloseTicketsMutation = useMutation({
    mutationFn: async (ticketIds: number[]) => {
      const results = await Promise.allSettled(
        ticketIds.map(id => updateTicket(id, { status: 'Closed' }))
      );

      const failedUpdates = results
        .map((result, index) => ({ result, id: ticketIds[index] }))
        .filter(item => item.result.status === 'rejected');

      if (failedUpdates.length > 0) {
        const errorMessages = failedUpdates
          .map(item => {
            const reason = (item.result as PromiseRejectedResult).reason;
            const message = (reason as { message?: string })?.message || `Ticket ID ${item.id}`;
            return message;
          })
          .join(', ');
        throw new Error(`Failed to close: ${errorMessages}`);
      }

      return results;
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.length} ticket(s) closed successfully.`);
    },
    onMutate: async ticketIds => {
      await queryClient.cancelQueries({ queryKey: ['tickets', 'my', currentUser?.id] });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
        'my',
        currentUser?.id,
      ]);

      // Get current tickets to calculate counter changes
      const allTickets = previousTicketsData?.pages.flat() || [];
      const affectedTickets = allTickets.filter(ticket => ticketIds.includes(ticket.id));

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets', 'my', currentUser?.id],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((ticket: ITicket) => {
              if (ticketIds.includes(ticket.id)) {
                return {
                  ...ticket,
                  status: 'Closed' as TicketStatus,
                };
              }
              return ticket;
            })
          );
          return { ...oldData, pages: newPages };
        }
      );

      // Update counters - closed tickets reduce active count
      const activeTicketsToClose = affectedTickets.filter(
        ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
      );

      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser?.id]) || 0;

      queryClient.setQueryData(
        ['ticketsCount', 'all'],
        Math.max(0, currentAllCount - activeTicketsToClose.length)
      );

      if (currentUser?.id) {
        queryClient.setQueryData(
          ['ticketsCount', 'my', currentUser.id],
          Math.max(0, currentMyCount - activeTicketsToClose.length)
        );
      }

      setSelectedTicketIds(new Set());

      return { previousTicketsData };
    },
    onError: (
      err: Error,
      variables,
      context: { previousTicketsData?: InfiniteData<ITicket[], number> } | undefined
    ) => {
      toast.error(`Error closing tickets: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(['tickets', 'my', currentUser?.id], context.previousTicketsData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
    },
  });

  const bulkResolveTicketsMutation = useMutation({
    mutationFn: async (ticketIds: number[]) => {
      const results = await Promise.allSettled(
        ticketIds.map(id => updateTicket(id, { status: 'Closed' }))
      );

      const failedUpdates = results
        .map((result, index) => ({ result, id: ticketIds[index] }))
        .filter(item => item.result.status === 'rejected');

      if (failedUpdates.length > 0) {
        const errorMessages = failedUpdates
          .map(item => {
            const reason = (item.result as PromiseRejectedResult).reason;
            const message = (reason as { message?: string })?.message || `Ticket ID ${item.id}`;
            return message;
          })
          .join(', ');
        throw new Error(`Failed to resolve: ${errorMessages}`);
      }

      return results;
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.length} ticket(s) resolved successfully.`);
    },
    onMutate: async ticketIds => {
      await queryClient.cancelQueries({ queryKey: ['tickets', 'my', currentUser?.id] });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
        'my',
        currentUser?.id,
      ]);

      // Get current tickets to calculate counter changes
      const allTickets = previousTicketsData?.pages.flat() || [];
      const affectedTickets = allTickets.filter(ticket => ticketIds.includes(ticket.id));

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets', 'my', currentUser?.id],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((ticket: ITicket) => {
              if (ticketIds.includes(ticket.id)) {
                return {
                  ...ticket,
                  status: 'Closed' as TicketStatus,
                };
              }
              return ticket;
            })
          );
          return { ...oldData, pages: newPages };
        }
      );

      // Update counters - resolved tickets reduce active count
      const activeTicketsToResolve = affectedTickets.filter(
        ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
      );

      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser?.id]) || 0;

      queryClient.setQueryData(
        ['ticketsCount', 'all'],
        Math.max(0, currentAllCount - activeTicketsToResolve.length)
      );

      if (currentUser?.id) {
        queryClient.setQueryData(
          ['ticketsCount', 'my', currentUser.id],
          Math.max(0, currentMyCount - activeTicketsToResolve.length)
        );
      }

      setSelectedTicketIds(new Set());

      return { previousTicketsData };
    },
    onError: (
      err: Error,
      variables,
      context: { previousTicketsData?: InfiniteData<ITicket[], number> } | undefined
    ) => {
      toast.error(`Error resolving tickets: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(['tickets', 'my', currentUser?.id], context.previousTicketsData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
    },
  });

  const getUserName = (user_id: number, ticket?: ITicket) => {
    // First try to get user info from the ticket itself (if available)
    if (ticket?.user && ticket.user.id === user_id) {
      const user = ticket.user;
      if (user.company_id) {
        const company = companiesData.find(company => company.id === user.company_id);
        if (company) {
          return `${user.name} (${company.name})`;
        }
      }
      return user.name || '-';
    }

    // Fallback to usersData
    const users = usersData.filter(user => user.id === user_id);
    const user = users[0];
    if (!user) return '-';

    const companies = companiesData.filter(company => company.id === user.company_id);
    const company = companies[0];
    if (!company) return user.name;

    return `${user.name} (${company.name})`;
  };

  const mergeTicketsMutation = useMutation({
    mutationFn: async (payload: { targetTicketId: number; ticketIdsToMerge: number[] }) => {
      const { targetTicketId, ticketIdsToMerge } = payload;
      return mergeTickets(targetTicketId, ticketIdsToMerge);
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.ticketIdsToMerge.length} ticket(s) merged successfully.`);
      console.log(
        `Tickets ${variables.ticketIdsToMerge.join(', ')} merged into ticket ${variables.targetTicketId}.`
      );
    },
    onMutate: async ({ ticketIdsToMerge }) => {
      await queryClient.cancelQueries({ queryKey: ['tickets', 'my', currentUser?.id] });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
        'my',
        currentUser?.id,
      ]);

      // Remove merged tickets from the list
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets', 'my', currentUser?.id],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;
          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.filter((ticket: ITicket) => !ticketIdsToMerge.includes(ticket.id))
          );
          return { ...oldData, pages: newPages };
        }
      );

      // Update counters
      const allTickets = previousTicketsData?.pages.flat() || [];
      const mergedTickets = allTickets.filter(ticket => ticketIdsToMerge.includes(ticket.id));
      const activeMergedCount = mergedTickets.filter(
        ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
      ).length;
      const myActiveMergedCount = mergedTickets.filter(
        ticket =>
          ticket.assignee_id === currentUser?.id &&
          ticket.status !== 'Closed' &&
          ticket.status !== 'Resolved'
      ).length;

      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser?.id]) || 0;

      queryClient.setQueryData(
        ['ticketsCount', 'all'],
        Math.max(0, currentAllCount - activeMergedCount)
      );
      if (currentUser?.id) {
        queryClient.setQueryData(
          ['ticketsCount', 'my', currentUser.id],
          Math.max(0, currentMyCount - myActiveMergedCount)
        );
      }

      setSelectedTicketIds(new Set());
      setIsMergeDialogOpen(false);

      return { previousTicketsData };
    },
    onError: (
      err: Error,
      variables,
      context: { previousTicketsData?: InfiniteData<ITicket[], number> } | undefined
    ) => {
      toast.error(`Error merging tickets: ${err.message}`);
      console.error(`Error merging tickets: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(['tickets', 'my', currentUser?.id], context.previousTicketsData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
    },
  });

  const handleCloseTicketsConfirm = () => {
    if (selectedTicketIds.size > 0) {
      bulkCloseTicketsMutation.mutate(Array.from(selectedTicketIds));
    }
  };

  const handleResolveTicketsConfirm = () => {
    if (selectedTicketIds.size > 0) {
      bulkResolveTicketsMutation.mutate(Array.from(selectedTicketIds));
    }
  };

  const handleMergeConfirm = () => {
    if (selectedTicketIds.size > 1 && selectedTargetTicketId) {
      const targetId = Number.parseInt(selectedTargetTicketId, 10);
      const ticketIdsArray = Array.from(selectedTicketIds);
      const ticketIdsToMerge = ticketIdsArray.filter(id => id !== targetId);

      mergeTicketsMutation.mutate({
        targetTicketId: targetId,
        ticketIdsToMerge: ticketIdsToMerge,
      });
    }
  };

  const handleOpenMergeDialog = () => {
    if (selectedTicketIds.size > 1) {
      const firstTicketId = Array.from(selectedTicketIds)[0];
      setSelectedTargetTicketId(firstTicketId.toString());
    }
    setIsMergeDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedTicketIds.size > 0) {
      deleteTicketsMutation.mutate(Array.from(selectedTicketIds));
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };
    if (container) container.addEventListener('scroll', handleScroll);
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Calculate active filters count for the badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSubjectFilter) count++;
    count += selectedStatuses.length;
    count += selectedUsers.length;
    count += selectedPriorities.length;
    count += selectedTeams.length;
    return count;
  }, [debouncedSubjectFilter, selectedStatuses, selectedUsers, selectedPriorities, selectedTeams]);

  const clearAllFilters = useCallback(() => {
    setSubjectInput('');
    setSelectedStatuses([]);
    setSelectedUsers([]);
    setSelectedPriorities([]);
    setSelectedTeams([]);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch the my tickets query
      await queryClient.refetchQueries({
        queryKey: ['tickets', 'my', currentUser?.id],
      });
      // Also invalidate related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
      toast.success('Your tickets refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh tickets');
      console.error('Error refreshing tickets:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col h-full">
        {selectedTicketIds.size > 0 && (
          <div className="flex items-center justify-between py-4 px-6 flex-shrink-0 border-b">
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={bulkCloseTicketsMutation.isPending}
                className="bg-white hover:bg-white"
                onClick={handleCloseTicketsConfirm}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Close ({selectedTicketIds.size})
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={bulkResolveTicketsMutation.isPending}
                className="bg-white hover:bg-white"
                onClick={handleResolveTicketsConfirm}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Resolve ({selectedTicketIds.size})
              </Button>
              {selectedTicketIds.size > 1 && (
                <AlertDialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={mergeTicketsMutation.isPending}
                      className="bg-white hover:bg-white"
                      onClick={handleOpenMergeDialog}
                    >
                      <Settings2 className="mr-2 h-4 w-4" />
                      Merge ({selectedTicketIds.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Merge Tickets</AlertDialogTitle>
                      <AlertDialogDescription>
                        Select the main ticket to merge the other {selectedTicketIds.size - 1}{' '}
                        selected ticket(s) into. The other tickets will be deleted after merging.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Select
                        value={selectedTargetTicketId || ''}
                        onValueChange={setSelectedTargetTicketId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select main ticket" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(selectedTicketIds).map(ticketId => {
                            const ticket = allTicketsData.find(t => t.id === ticketId);
                            return (
                              <SelectItem key={ticketId} value={ticketId.toString()}>
                                #{ticketId} - {ticket?.title || 'Unknown'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={mergeTicketsMutation.isPending}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleMergeConfirm}
                        disabled={mergeTicketsMutation.isPending || !selectedTargetTicketId}
                      >
                        {mergeTicketsMutation.isPending ? 'Merging...' : 'Merge Tickets'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleteTicketsMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedTicketIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the selected
                      {selectedTicketIds.size === 1 ? ' ticket' : ' tickets'}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteTicketsMutation.isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteConfirm}
                      disabled={deleteTicketsMutation.isPending}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {deleteTicketsMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between py-2 px-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoadingTickets}
              className="bg-white hover:bg-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {filteredTicketsData.length} ticket{filteredTicketsData.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <Card className="shadow-none border-0 flex-1 flex flex-col overflow-hidden m-0">
          <CardContent className="flex-1 overflow-hidden p-0">
            <div ref={scrollContainerRef} className="h-full overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="w-[50px] px-4">
                      <Checkbox
                        checked={headerCheckboxState}
                        onCheckedChange={handleSelectAllChange}
                        aria-label="Select all rows"
                        disabled={isLoadingTickets || filteredTicketsData.length === 0}
                      />
                    </TableHead>
                    <TableHead className="w-[100px] p-2">ID</TableHead>
                    <TableHead className="p-2 max-w-xs md:max-w-sm">Subject</TableHead>
                    <TableHead className="p-2 w-[150px]">Status</TableHead>
                    <TableHead className="p-2 w-[150px]">Priority</TableHead>
                    <TableHead className="p-2 w-[150px]">Sent from</TableHead>
                    <TableHead className="p-2 w-[150px]">Last Update</TableHead>
                    <TableHead className="p-2 w-[150px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTickets && allTicketsData.length === 0 ? ( // Check allTicketsData for initial loading
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Loading your tickets...
                      </TableCell>
                    </TableRow>
                  ) : isTicketsError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-red-500">
                        Error loading tickets: {ticketsError?.message || 'Unknown error'}
                      </TableCell>
                    </TableRow>
                  ) : filteredTicketsData.length === 0 ? ( // Check filtered data length
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        {debouncedSubjectFilter
                          ? 'No tickets match your filter.'
                          : 'No tickets assigned to you.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTicketsData.map(ticket => (
                      <motion.tr
                        key={ticket.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={cn(
                          'border-0 h-14 cursor-pointer hover:bg-muted/50',
                          ticket.status === 'Unread' &&
                            'font-semibold bg-slate-50 dark:bg-slate-800/50'
                        )}
                        data-state={selectedTicketIds.has(ticket.id) ? 'selected' : ''}
                        onClick={e => {
                          if (e.metaKey || e.ctrlKey) {
                            window.open(`/tickets/${ticket.id}`, '_blank');
                          } else {
                            router.push(`/tickets/${ticket.id}`);
                          }
                        }}
                      >
                        <TableCell className="px-4">
                          <Checkbox
                            checked={selectedTicketIds.has(ticket.id)}
                            onCheckedChange={checked => handleRowSelectChange(ticket.id, checked)}
                            aria-label={`Select ticket ${ticket.id}`}
                            onClick={e => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium p-2 py-4">{ticket.id}</TableCell>{' '}
                        {/* Removed onClick and cursor-pointer */}
                        <TableCell className="max-w-xs md:max-w-sm truncate p-2 py-4">
                          {ticket.title}
                        </TableCell>{' '}
                        {/* Removed onClick and cursor-pointer */}
                        <TableCell className="p-2 py-4">
                          <div className="flex items-center gap-2">
                            <div className="relative flex h-2 w-2">
                              <span
                                className={cn(
                                  'absolute inline-flex h-full w-full rounded-full',
                                  ticket.status === 'Open' && 'bg-green-500',
                                  ticket.status === 'Closed' && 'bg-slate-500',
                                  ticket.status === 'Unread' && 'bg-blue-500',
                                  ticket.status === 'With User' && 'bg-purple-500',
                                  ticket.status === 'In Progress' && 'bg-orange-500'
                                )}
                              ></span>
                              {ticket.status === 'Unread' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              )}
                            </div>
                            <span
                              className={cn(
                                'text-foreground capitalize',
                                ticket.status === 'Unread' && 'font-semibold'
                              )}
                            >
                              {ticket.status}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              'whitespace-nowrap capitalize',
                              ticket.priority === 'Low' &&
                                'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', // Gray
                              ticket.priority === 'Medium' &&
                                'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700', // Green
                              ticket.priority === 'High' &&
                                'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700', // Yellow
                              ticket.priority === 'Critical' &&
                                'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700' // Red
                            )}
                          >
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2 py-4">
                          {getUserName(ticket.user_id as number, ticket)}
                        </TableCell>
                        <TableCell className="p-2 py-4">
                          {formatRelativeTime(ticket.last_update)}
                        </TableCell>
                        <TableCell className="p-2 py-4">
                          {formatRelativeTime(ticket.created_at)}
                        </TableCell>
                      </motion.tr> // Close motion.tr
                    ))
                  )}
                  {isFetchingNextPage && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-4 text-center text-muted-foreground">
                        Loading more tickets...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-shrink-0 flex items-stretch">
        {' '}
        {/* Changed items-start to items-stretch */}
        <Collapsible
          open={filtersExpanded}
          onOpenChange={setFiltersExpanded}
          className="flex h-full"
        >
          {' '}
          {/* Added h-full to Collapsible */}
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="z-10 -mr-4 mt-6 shadow-md relative cursor-pointer rounded-full px-3"
            >
              {filtersExpanded ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  Filters <ChevronLeft className="h-4 w-4 ml-1 inline" />
                </>
              )}
              {activeFiltersCount > 0 && !filtersExpanded && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
          {filtersExpanded && (
            <aside className="w-80 border-l p-6 space-y-6 bg-card text-card-foreground rounded-lg transition-all duration-300 flex flex-col h-full">
              {' '}
              {/* Added flex flex-col h-full */}
              <div className="flex items-center justify-between flex-shrink-0">
                {' '}
                {/* Added flex-shrink-0 */}
                <h2 className="text-lg font-semibold">
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </h2>
                <div className="flex gap-2">
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      Clear all
                    </Button>
                  )}
                  <Button variant="ghost" size="icon">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4 overflow-y-auto flex-grow">
                {' '}
                {/* Added overflow-y-auto and flex-grow */}
                <div>
                  <Label htmlFor="subject-filter" className="text-sm font-medium">
                    Subject
                  </Label>
                  <Input
                    id="subject-filter"
                    placeholder="Search subject..."
                    value={subjectInput}
                    onChange={e => setSubjectInput(e.target.value)} // Connect input to state
                  />
                </div>
                <div>
                  <Label htmlFor="status-filter" className="text-sm font-medium">
                    Statuses
                  </Label>
                  <MultiSelectFilter
                    options={statusOptions}
                    selected={selectedStatuses}
                    onChange={setSelectedStatuses}
                    placeholder="Filter by status..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="user-filter" className="text-sm font-medium">
                    Users
                  </Label>
                  <MultiSelectFilter
                    options={userOptions}
                    selected={selectedUsers}
                    onChange={setSelectedUsers}
                    placeholder="Filter by user..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="priority-filter" className="text-sm font-medium">
                    Priorities
                  </Label>
                  <MultiSelectFilter
                    options={priorityOptions}
                    selected={selectedPriorities}
                    onChange={setSelectedPriorities}
                    placeholder="Filter by priority..."
                    className="mt-1"
                  />
                </div>
              </div>
            </aside>
          )}
        </Collapsible>
      </div>
    </div>
  );
}

export default function MyTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">Loading your tickets...</div>
      }
    >
      <MyTicketsClientContent />
    </Suspense>
  );
}