/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Settings2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserIcon,
  UsersIcon,
  RefreshCw,
} from 'lucide-react';
import { MultiSelectFilter, type OptionType } from '@/components/filters/multi-select-filter';
import { useQuery, useQueryClient, type InfiniteData, useMutation } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { updateTicket, deleteTicket, mergeTickets } from '@/services/ticket';
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
import { getAgents } from '@/services/agent';
import { getTeams, getAgentTeams } from '@/services/team';
import { getUsers } from '@/services/user';
import { getCompanies } from '@/services/company';
import { getCategories } from '@/services/category';
import type { ITicket } from '@/typescript/ticket';
import type { Team } from '@/typescript/team';
import type { IUser } from '@/typescript/user';
import type { ICompany } from '@/typescript/company';
import type { ICategory } from '@/typescript/category';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTickets } from '@/hooks/use-global-tickets';
import { useAuth } from '@/hooks/use-auth';

import type { Agent } from '@/typescript/agent';
import { formatRelativeTime, cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ChevronUp, ChevronDown } from 'lucide-react';

type SortColumn = 'status' | 'priority' | 'lastUpdate' | 'created';
type SortDirection = 'asc' | 'desc';

function TicketsClientContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Get teamId from URL if present
  const teamIdFromQuery = searchParams.get('teamId');

  // State declarations MUST come before useMemo that depends on them
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [subjectInput, setSubjectInput] = useState('');
  const debouncedSubjectFilter = useDebounce(subjectInput, 300);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [isAssignToAgentDialogOpen, setIsAssignToAgentDialogOpen] = useState(false);
  const [isAssignToTeamDialogOpen, setIsAssignToTeamDialogOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [selectedTargetTicketId, setSelectedTargetTicketId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Build API filters from component state
  const apiFilters = useMemo(() => {
    const filters: {
      team_id?: number;
      subject?: string;
      statuses?: string;
      team_ids?: string;
      assignee_ids?: string;
      priorities?: string;
      user_ids?: string;
      company_ids?: string;
      category_ids?: string;
      sort_by?: 'status' | 'priority' | 'created_at' | 'updated_at' | 'last_update';
      order?: 'asc' | 'desc';
    } = {};

    // Team filter from URL
    if (teamIdFromQuery) {
      filters.team_id = parseInt(teamIdFromQuery, 10);
    }

    // Search filter
    if (debouncedSubjectFilter) {
      filters.subject = debouncedSubjectFilter;
    }

    // Multi-select filters - send as comma-separated strings
    if (selectedStatuses.length > 0) {
      filters.statuses = selectedStatuses.join(',');
    } else {
      // Por defecto, excluir tickets cerrados
      filters.statuses = 'Unread,Open,With User,In Progress';
    }

    if (selectedTeams.length > 0 && !teamIdFromQuery) {
      filters.team_ids = selectedTeams.join(',');
    }

    if (selectedAgents.length > 0) {
      filters.assignee_ids = selectedAgents.join(',');
    }

    if (selectedPriorities.length > 0) {
      filters.priorities = selectedPriorities.join(',');
    }

    if (selectedUsers.length > 0) {
      filters.user_ids = selectedUsers.join(',');
    }

    if (selectedCompanies.length > 0) {
      filters.company_ids = selectedCompanies.join(',');
    }

    if (selectedCategories.length > 0) {
      filters.category_ids = selectedCategories.join(',');
    }

    // Sorting
    if (sortColumn) {
      // Map frontend sort columns to backend sort_by values
      const sortByMap: Record<SortColumn, 'status' | 'priority' | 'created_at' | 'last_update'> = {
        status: 'status',
        priority: 'priority',
        lastUpdate: 'last_update',
        created: 'created_at',
      };
      filters.sort_by = sortByMap[sortColumn];
      filters.order = sortDirection;
    }

    return filters;
  }, [
    teamIdFromQuery,
    debouncedSubjectFilter,
    selectedStatuses,
    selectedTeams,
    selectedAgents,
    selectedPriorities,
    selectedUsers,
    selectedCompanies,
    selectedCategories,
    sortColumn,
    sortDirection,
  ]);

  // Create queryKey matching useTickets hook logic for mutations
  const hasFilters = Object.keys(apiFilters).length > 0;
  const baseKey = hasFilters ? 'filtered-tickets' : 'tickets';
  const ticketsQueryKey = useMemo(() => {
    return hasFilters
      ? [baseKey, JSON.stringify(apiFilters)] as const
      : [baseKey] as const;
  }, [baseKey, hasFilters, apiFilters]);

  // Use unified hook for all tickets with API filters
  const {
    allTicketsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingTickets,
    isTicketsError,
    ticketsError,
    invalidateRelatedQueries,
  } = useTickets(true, apiFilters);

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

  const { data: agentsData = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 1000 * 60 * 5,
  });

  const agentOptions: OptionType[] = useMemo(() => {
    return agentsData.map(agent => ({
      value: agent.id.toString(),
      label: agent.name,
    }));
  }, [agentsData]);

  const {
    data: teamsData = [],
    isLoading: isLoadingTeams,
    error: teamsError,
  } = useQuery<Team[]>({
    queryKey: user?.role === 'admin' ? ['teams'] : ['agentTeams', user?.id],
    queryFn: async () => {
      console.log('🔍 Loading teams for user:', user?.role, user?.id);
      if (user?.role === 'admin') {
        const teams = await getTeams();
        console.log('👨‍💼 Admin teams loaded:', teams);
        return teams;
      } else if (user?.id) {
        const teams = await getAgentTeams(user.id);
        console.log('👥 Agent teams loaded for user', user.id, ':', teams);
        return teams;
      }
      console.log('⚠️ No user or invalid role, returning empty array');
      return [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
  const teamOptions: OptionType[] = useMemo(() => {
    const options = teamsData.map(team => ({
      value: team.id.toString(),
      label: team.name,
    }));
    console.log('📝 Current selected teams:', selectedTeams);
    return options;
  }, [teamsData, selectedTeams]);

  const { data: usersData = [] } = useQuery<IUser[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 1000 * 60 * 5,
  });

  const userOptions: OptionType[] = useMemo(() => {
    return usersData
      .filter(user => user && user.id && user.name)
      .map(user => ({
        value: user.id.toString(),
        label: user.name!,
      }));
  }, [usersData]);

  const { data: companiesData = [] } = useQuery<ICompany[]>({
    queryKey: ['companies'],
    queryFn: () => getCompanies(),
    staleTime: 1000 * 60 * 5,
  });
  const companyOptions: OptionType[] = useMemo(() => {
    return companiesData
      .filter(company => company && company.id && company.name)
      .map(company => ({
        value: company.id.toString(),
        label: company.name!,
      }));
  }, [companiesData]);

  const { data: categoriesData = [] } = useQuery<ICategory[]>({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  const categoryOptions: OptionType[] = useMemo(() => {
    return categoriesData
      .filter(category => category && category.id && category.name)
      .map(category => ({
        value: category.id.toString(),
        label: category.name!,
      }));
  }, [categoriesData]);

  // ✅ OPTIMIZADO: No más filtrado client-side - el backend lo maneja todo
  const filteredTicketsData = allTicketsData; // Backend ya filtró

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // ✅ OPTIMIZADO: No más ordenación client-side - el backend lo maneja
  const displayedTickets = filteredTicketsData;

  // ✅ SIMPLIFICADO: Solo cargar más tickets del servidor cuando hay más disponibles
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold

    if (isNearBottom && !isFetchingNextPage) {
      handleLoadMore();
    }
  }, [handleLoadMore, isFetchingNextPage]);

  // ✅ SIMPLIFICADO: Verificar si todos los tickets disponibles en el servidor están cargados
  const allTicketsDisplayed = !hasNextPage;

  // Set up infinite scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const teamIdFromQuery = searchParams.get('teamId');

    if (pathname === '/tickets') {
      if (teamIdFromQuery) {
        // Con el nuevo sistema unificado, no necesitamos filtros client-side
        // cuando ya tenemos filtros de backend
        console.log('🔗 Loading team tickets from backend:', teamIdFromQuery);
        setSelectedTeams([]); // Clear client-side filters
        setSelectedStatuses([]); // Clear status filters to show ALL tickets including closed
      } else {
        // En "All Tickets", también limpiamos los filtros
        if (selectedTeams.length > 0) {
          console.log('🧹 Clearing team filter for "All Tickets"');
          setSelectedTeams([]);
        }
      }
    }
  }, [searchParams, pathname]);

  // ✅ ELIMINADO: Ya NO auto-cargamos 500 tickets
  // El infinite scroll cargará más tickets solo cuando el usuario haga scroll

  const agentIdToNameMap = React.useMemo(() => {
    return agentsData.reduce(
      (map, agent) => {
        map[agent.id] = agent.name;
        return map;
      },
      {} as Record<number, string>
    );
  }, [agentsData]);

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
        throw new Error(`Failed to delete: ${errorMessages}`);
      }
      return results;
    },
    onSuccess: () => {},
    onMutate: async ticketIdsToDelete => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>(
        ticketsQueryKey
      );

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(ticketsQueryKey, oldData => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map(page =>
          page.filter(ticket => !ticketIdsToDelete.includes(ticket.id))
        );
        return { ...oldData, pages: newPages };
      });

      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', user?.id]) || 0;

      const allTickets = previousTicketsData?.pages.flat() || [];
      const deletedTickets = allTickets.filter(ticket => ticketIdsToDelete.includes(ticket.id));
      const activeDeletedCount = deletedTickets.filter(ticket => ticket.status !== 'Closed').length;
      const myActiveDeletedCount = deletedTickets.filter(
        ticket => ticket.assignee_id === user?.id && ticket.status !== 'Closed'
      ).length;

      queryClient.setQueryData(
        ['ticketsCount', 'all'],
        Math.max(0, currentAllCount - activeDeletedCount)
      );
      if (user?.id) {
        queryClient.setQueryData(
          ['ticketsCount', 'my', user.id],
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
      console.error(`Error deleting tickets: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(ticketsQueryKey, context.previousTicketsData);
      }
      if (context?.previousAllCount !== undefined) {
        queryClient.setQueryData(['ticketsCount', 'all'], context.previousAllCount);
      }
      if (context?.previousMyCount !== undefined && user?.id) {
        queryClient.setQueryData(['ticketsCount', 'my', user.id], context.previousMyCount);
      }
    },
    onSettled: () => {
      // Solo invalidar contadores y queries relacionadas SIN refetch inmediato
      // Los optimistic updates en onMutate ya actualizaron la UI correctamente
      queryClient.invalidateQueries({
        queryKey: ['ticketsCount'],
        refetchType: 'none' // Marca como stale pero NO refetch inmediato
      });
      queryClient.invalidateQueries({
        queryKey: ['agentTeams'],
        refetchType: 'none'
      });
    },
  });
  const handleDeleteConfirm = () => {
    if (selectedTicketIds.size > 0) {
      deleteTicketsMutation.mutate(Array.from(selectedTicketIds));
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSubjectFilter) count++;
    count += selectedStatuses.length;
    count += selectedTeams.length;
    count += selectedAgents.length;
    count += selectedPriorities.length;
    count += selectedUsers.length;
    count += selectedCompanies.length;
    count += selectedCategories.length;
    return count;
  }, [
    debouncedSubjectFilter,
    selectedStatuses,
    selectedTeams,
    selectedAgents,
    selectedPriorities,
    selectedUsers,
    selectedCompanies,
    selectedCategories,
  ]);

  const clearAllFilters = useCallback(() => {
    setSubjectInput('');
    setSelectedStatuses([]);
    setSelectedTeams([]);
    setSelectedAgents([]);
    setSelectedPriorities([]);
    setSelectedUsers([]);
    setSelectedCompanies([]);
    setSelectedCategories([]);
  }, []);

  const handleOpenAssignToAgentDialog = () => {
    if (selectedTicketIds.size > 0) {
      const ticketsArray = allTicketsData.filter(ticket => selectedTicketIds.has(ticket.id));

      const firstTicket = ticketsArray[0];
      const allSameAgent = ticketsArray.every(
        ticket => ticket.assignee_id === firstTicket.assignee_id
      );

      if (allSameAgent && firstTicket.assignee_id !== undefined) {
        setSelectedAgentId(String(firstTicket.assignee_id));
      }
    }

    setIsAssignToAgentDialogOpen(true);
  };

  const handleOpenAssignToTeamDialog = () => {
    if (selectedTicketIds.size > 0) {
      const ticketsArray = allTicketsData.filter(ticket => selectedTicketIds.has(ticket.id));

      const firstTicket = ticketsArray[0];
      const allSameTeam = ticketsArray.every(ticket => ticket.team_id === firstTicket.team_id);

      if (allSameTeam && firstTicket.team_id !== undefined) {
        setSelectedTeamId(String(firstTicket.team_id));
      }
    }

    setIsAssignToTeamDialogOpen(true);
  };

  const bulkAssignToTeamMutation = useMutation({
    mutationFn: async (payload: { ticketIds: number[]; teamId: number | undefined }) => {
      const { ticketIds, teamId } = payload;
      const results = await Promise.allSettled(
        ticketIds.map(id => updateTicket(id, { team_id: teamId }))
      );

      const failedAssignments = results
        .map((result, index) => ({ result, id: ticketIds[index] }))
        .filter(item => item.result.status === 'rejected');

      if (failedAssignments.length > 0) {
        const errorMessages = failedAssignments
          .map(item => {
            const reason = (item.result as PromiseRejectedResult).reason;
            const message = (reason as { message?: string })?.message || `Ticket ID ${item.id}`;
            return message;
          })
          .join(', ');
        throw new Error(`Failed to assign: ${errorMessages}`);
      }

      return results;
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.ticketIds.length} ticket(s) assigned to team successfully.`);
      console.log(
        `${variables.ticketIds.length} ticket(s) assigned to team ${variables.teamId || 'none'}.`
      );
    },
    onMutate: async ({ ticketIds, teamId }) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>(
        ticketsQueryKey
      );

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(ticketsQueryKey, oldData => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map(page =>
          page.map(ticket => {
            if (ticketIds.includes(ticket.id)) {
              return {
                ...ticket,
                team_id: teamId,
              };
            }
            return ticket;
          })
        );

        return {
          pages: newPages,
          pageParams: oldData.pageParams,
        };
      });

      setSelectedTicketIds(new Set());
      setIsAssignToTeamDialogOpen(false);

      return { previousTicketsData };
    },
    onError: (
      err: Error,
      variables,
      context: { previousTicketsData?: InfiniteData<ITicket[], number> } | undefined
    ) => {
      toast.error(`Error assigning tickets to team: ${err.message}`);
      console.error(`Error assigning tickets to team: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(ticketsQueryKey, context.previousTicketsData);
      }
    },
    onSettled: () => {
      // Solo invalidar queries relacionadas SIN refetch inmediato
      // Los optimistic updates en onMutate ya actualizaron la UI correctamente
      queryClient.invalidateQueries({
        queryKey: ['agentTeams'],
        refetchType: 'none'
      });
    },
  });

  const bulkAssignToAgentMutation = useMutation({
    mutationFn: async (payload: { ticketIds: number[]; agentId: number | undefined }) => {
      const { ticketIds, agentId } = payload;
      const results = await Promise.allSettled(
        ticketIds.map(id => updateTicket(id, { assignee_id: agentId }))
      );

      const failedAssignments = results
        .map((result, index) => ({ result, id: ticketIds[index] }))
        .filter(item => item.result.status === 'rejected');

      if (failedAssignments.length > 0) {
        const errorMessages = failedAssignments
          .map(item => {
            const reason = (item.result as PromiseRejectedResult).reason;
            const message = (reason as { message?: string })?.message || `Ticket ID ${item.id}`;
            return message;
          })
          .join(', ');
        throw new Error(`Failed to assign: ${errorMessages}`);
      }

      return results;
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.ticketIds.length} ticket(s) assigned successfully.`);
      console.log(
        `${variables.ticketIds.length} ticket(s) assigned to agent ${variables.agentId || 'none'}.`
      );
    },
    onMutate: async ({ ticketIds, agentId }) => {
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>(
        ticketsQueryKey
      );

      // Get current tickets to calculate counter changes
      const allTickets = previousTicketsData?.pages.flat() || [];
      const affectedTickets = allTickets.filter(ticket => ticketIds.includes(ticket.id));

      // Update optimistically the tickets data
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(ticketsQueryKey, oldData => {
        if (!oldData) return oldData;

        const newPages = oldData.pages.map(page =>
          page.map(ticket => {
            if (ticketIds.includes(ticket.id)) {
              return {
                ...ticket,
                assignee_id: agentId,
              };
            }
            return ticket;
          })
        );

        return {
          pages: newPages,
          pageParams: oldData.pageParams,
        };
      });

      // Optimistically update "my tickets" counter if current user is affected
      if (user?.id) {
        const activeTicketsToUser = affectedTickets.filter(ticket => ticket.status !== 'Closed');

        // Count tickets that were assigned to current user that are now being reassigned
        const ticketsRemovedFromUser = activeTicketsToUser.filter(
          ticket => ticket.assignee_id === user.id && agentId !== user.id
        ).length;

        // Count tickets that were not assigned to current user that are now being assigned to them
        const ticketsAddedToUser = activeTicketsToUser.filter(
          ticket => ticket.assignee_id !== user.id && agentId === user.id
        ).length;

        if (ticketsRemovedFromUser > 0 || ticketsAddedToUser > 0) {
          const myTicketsCountKey = ['ticketsCount', 'my', user.id];
          const currentMyCount = queryClient.getQueryData<number>(myTicketsCountKey) || 0;
          const newCount = Math.max(
            0,
            currentMyCount - ticketsRemovedFromUser + ticketsAddedToUser
          );
          queryClient.setQueryData(myTicketsCountKey, newCount);

          // Optimistically update "my tickets" infinite query list
          const myTicketsQueryKey = ['tickets', 'my', user.id];
          queryClient.setQueryData(myTicketsQueryKey, (oldData: unknown) => {
            if (!oldData) return oldData;

            const typedData = oldData as { pages: ITicket[][]; pageParams: number[] };
            const newPages = typedData.pages.map((page: ITicket[]) => {
              // Remove tickets that were assigned to current user and are now assigned to someone else
              let updatedPage = page.filter(ticket => {
                return !(
                  ticketIds.includes(ticket.id) &&
                  ticket.assignee_id === user.id &&
                  agentId !== user.id
                );
              });

              // Add tickets that were not assigned to current user that are now assigned to them
              const ticketsToAdd = affectedTickets.filter(
                ticket =>
                  ticketIds.includes(ticket.id) &&
                  ticket.assignee_id !== user.id &&
                  agentId === user.id &&
                  !updatedPage.some(t => t.id === ticket.id)
              );

              if (ticketsToAdd.length > 0) {
                const optimisticTickets = ticketsToAdd.map(ticket => ({
                  ...ticket,
                  assignee_id: agentId,
                }));
                updatedPage = [...optimisticTickets, ...updatedPage];
              }

              // Update existing tickets in the list
              updatedPage = updatedPage.map(ticket => {
                if (ticketIds.includes(ticket.id)) {
                  return {
                    ...ticket,
                    assignee_id: agentId,
                  };
                }
                return ticket;
              });

              return updatedPage;
            });

            return {
              ...typedData,
              pages: newPages,
            };
          });
        }
      }

      setSelectedTicketIds(new Set());
      setIsAssignToAgentDialogOpen(false);

      return { previousTicketsData };
    },
    onError: (
      err: Error,
      variables,
      context: { previousTicketsData?: InfiniteData<ITicket[], number> } | undefined
    ) => {
      toast.error(`Error assigning tickets: ${err.message}`);
      console.error(`Error assigning tickets: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(ticketsQueryKey, context.previousTicketsData);
      }
    },
    onSettled: () => {
      // Solo invalidar contadores SIN refetch inmediato
      // Los optimistic updates en onMutate ya actualizaron la UI correctamente
      queryClient.invalidateQueries({
        queryKey: ['ticketsCount'],
        refetchType: 'none' // Marca como stale pero NO refetch inmediato
      });
      queryClient.invalidateQueries({
        queryKey: ['agentTeams'],
        refetchType: 'none'
      });
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
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>(
        ticketsQueryKey
      );

      // Get current tickets to calculate counter changes
      const allTickets = previousTicketsData?.pages.flat() || [];
      const affectedTickets = allTickets.filter(ticket => ticketIds.includes(ticket.id));

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(ticketsQueryKey, oldData => {
        if (!oldData) return oldData;

        // If "Closed" is NOT in the current filter, remove closed tickets from the list
        // If "Closed" IS in the filter, just update the status
        const shouldRemoveClosedTickets = !selectedStatuses.includes('Closed');

        const newPages = oldData.pages.map(page => {
          if (shouldRemoveClosedTickets) {
            // Remove closed tickets from the list (like delete does)
            return page.filter(ticket => !ticketIds.includes(ticket.id));
          } else {
            // Just update the status to 'Closed'
            return page.map(ticket => {
              if (ticketIds.includes(ticket.id)) {
                return {
                  ...ticket,
                  status: 'Closed' as any,
                };
              }
              return ticket;
            });
          }
        });

        return {
          pages: newPages,
          pageParams: oldData.pageParams,
        };
      });

      // Update counters - closed tickets reduce active count
      const activeTicketsToClose = affectedTickets.filter(ticket => ticket.status !== 'Closed');

      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', user?.id]) || 0;

      queryClient.setQueryData(
        ['ticketsCount', 'all'],
        Math.max(0, currentAllCount - activeTicketsToClose.length)
      );

      if (user?.id) {
        const myActiveTicketsToClose = activeTicketsToClose.filter(
          ticket => ticket.assignee_id === user.id
        );
        queryClient.setQueryData(
          ['ticketsCount', 'my', user.id],
          Math.max(0, currentMyCount - myActiveTicketsToClose.length)
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
        queryClient.setQueryData(ticketsQueryKey, context.previousTicketsData);
      }
    },
    onSettled: () => {
      // Solo invalidar contadores SIN refetch inmediato
      // Los optimistic updates en onMutate ya actualizaron la UI correctamente
      queryClient.invalidateQueries({
        queryKey: ['ticketsCount'],
        refetchType: 'none'
      });
    },
  });

  const handleCloseTicketsConfirm = () => {
    if (selectedTicketIds.size > 0) {
      bulkCloseTicketsMutation.mutate(Array.from(selectedTicketIds));
    }
  };

  const handleAssignToAgentConfirm = () => {
    if (selectedTicketIds.size > 0) {
      const agentId =
        selectedAgentId === 'null'
          ? undefined
          : selectedAgentId
            ? Number.parseInt(selectedAgentId, 10)
            : undefined;
      bulkAssignToAgentMutation.mutate({
        ticketIds: Array.from(selectedTicketIds),
        agentId,
      });
    }
  };

  const handleAssignToTeamConfirm = () => {
    if (selectedTicketIds.size > 0) {
      const teamId =
        selectedTeamId === 'null'
          ? undefined
          : selectedTeamId
            ? Number.parseInt(selectedTeamId, 10)
            : undefined;
      bulkAssignToTeamMutation.mutate({
        ticketIds: Array.from(selectedTicketIds),
        teamId,
      });
    }
  };

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
      await queryClient.cancelQueries({ queryKey: ticketsQueryKey });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>(
        ticketsQueryKey
      );

      // Remove merged tickets from the list (they get deleted after merge)
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(ticketsQueryKey, oldData => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map(page =>
          page.filter(ticket => !ticketIdsToMerge.includes(ticket.id))
        );
        return { ...oldData, pages: newPages };
      });

      // Update counters
      const allTickets = previousTicketsData?.pages.flat() || [];
      const mergedTickets = allTickets.filter(ticket => ticketIdsToMerge.includes(ticket.id));
      const activeMergedCount = mergedTickets.filter(ticket => ticket.status !== 'Closed').length;
      const myActiveMergedCount = mergedTickets.filter(
        ticket => ticket.assignee_id === user?.id && ticket.status !== 'Closed'
      ).length;

      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', user?.id]) || 0;

      queryClient.setQueryData(
        ['ticketsCount', 'all'],
        Math.max(0, currentAllCount - activeMergedCount)
      );
      if (user?.id) {
        queryClient.setQueryData(
          ['ticketsCount', 'my', user.id],
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
        queryClient.setQueryData(ticketsQueryKey, context.previousTicketsData);
      }
    },
    onSettled: () => {
      // Solo invalidar queries relacionadas SIN refetch inmediato
      // Los optimistic updates en onMutate ya actualizaron la UI correctamente
      queryClient.invalidateQueries({
        queryKey: ['agentTeams'],
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: ['ticketsCount'],
        refetchType: 'none'
      });
    },
  });

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 Starting refresh...', { teamId: teamIdFromQuery, hasTeamFilter: Boolean(teamIdFromQuery) });
    try {
      const startTime = Date.now();
      
      // Solo invalidar la query actual y contadores esenciales
      await Promise.all([
        invalidateRelatedQueries(), // Ya es específico para la query actual
        queryClient.invalidateQueries({ 
          queryKey: ['user-teams-tickets-count'], 
          refetchType: 'active',
          exact: true 
        }),
      ]);
      
      const elapsed = Date.now() - startTime;
      console.log(`⚡ Refresh completed in ${elapsed}ms`);
      
      // Solo agregar delay si fue muy rápido (menos de 200ms) para UX
      if (elapsed < 200) {
        await new Promise(resolve => setTimeout(resolve, 200 - elapsed));
      }
      
      toast.success('Tickets refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh tickets');
      console.error('Error refreshing tickets:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenMergeDialog = () => {
    if (selectedTicketIds.size > 1) {
      // Set the first selected ticket as default target
      const firstTicketId = Array.from(selectedTicketIds)[0];
      setSelectedTargetTicketId(firstTicketId.toString());
    }
    setIsMergeDialogOpen(true);
  };

  const SortableHeader = ({
    column,
    children,
    className,
  }: {
    column: SortColumn;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={`p-2 w-[150px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center justify-between">
        {children}
        <div className="flex flex-col ml-1">
          <ChevronUp
            className={`h-3 w-3 ${sortColumn === column && sortDirection === 'asc' ? 'text-blue-600' : 'text-slate-400'}`}
          />
          <ChevronDown
            className={`h-3 w-3 -mt-1 ${sortColumn === column && sortDirection === 'desc' ? 'text-blue-600' : 'text-slate-400'}`}
          />
        </div>
      </div>
    </TableHead>
  );

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col h-full">
        {selectedTicketIds.size > 0 && (
          <div className="flex items-center justify-between py-4 px-6 flex-shrink-0 border-b">
            <div className="flex items-center gap-2 ml-auto">
              <AlertDialog
                open={isAssignToAgentDialogOpen}
                onOpenChange={setIsAssignToAgentDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkAssignToAgentMutation.isPending}
                    className="bg-white hover:bg-white"
                    onClick={handleOpenAssignToAgentDialog}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    Assign to Agent ({selectedTicketIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Assign Tickets to Agent</AlertDialogTitle>
                    <AlertDialogDescription>
                      Select the agent to assign the {selectedTicketIds.size} selected ticket(s).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Select value={selectedAgentId || ''} onValueChange={setSelectedAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Unassigned</SelectItem>
                        {agentsData.map(agent => (
                          <SelectItem key={agent.id} value={String(agent.id)}>
                            {agent.name || agent.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={bulkAssignToAgentMutation.isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleAssignToAgentConfirm}
                      disabled={bulkAssignToAgentMutation.isPending || !selectedAgentId}
                    >
                      {bulkAssignToAgentMutation.isPending ? 'Assigning...' : 'Assign'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog
                open={isAssignToTeamDialogOpen}
                onOpenChange={setIsAssignToTeamDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkAssignToTeamMutation.isPending}
                    className="bg-white hover:bg-white"
                    onClick={handleOpenAssignToTeamDialog}
                  >
                    <UsersIcon className="mr-2 h-4 w-4" />
                    Assign to Team ({selectedTicketIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Assign Tickets to Team</AlertDialogTitle>
                    <AlertDialogDescription>
                      Select the team to assign the {selectedTicketIds.size} selected ticket(s).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Select value={selectedTeamId || ''} onValueChange={setSelectedTeamId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Unassigned</SelectItem>
                        {teamsData.map(team => (
                          <SelectItem key={team.id} value={String(team.id)}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={bulkAssignToTeamMutation.isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleAssignToTeamConfirm}
                      disabled={bulkAssignToTeamMutation.isPending || !selectedTeamId}
                    >
                      {bulkAssignToTeamMutation.isPending ? 'Assigning...' : 'Assign'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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
                  <AlertDialogContent className="bg-white">
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
                <AlertDialogContent className="bg-white">
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
              {displayedTickets.length} ticket{displayedTickets.length !== 1 ? 's' : ''}
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
                    <SortableHeader column="status">Status</SortableHeader>
                    <SortableHeader column="priority">Priority</SortableHeader>
                    <TableHead className="p-2 w-[150px]">Sent from</TableHead>
                    <TableHead className="p-2 w-[150px]">Assigned to</TableHead>
                    <SortableHeader column="lastUpdate">Last Update</SortableHeader>
                    <SortableHeader column="created">Created</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTickets && displayedTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Loading tickets...
                      </TableCell>
                    </TableRow>
                  ) : isTicketsError ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-red-500">
                        Error loading tickets: {ticketsError?.message || 'Unknown error'}
                      </TableCell>
                    </TableRow>
                  ) : displayedTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        {debouncedSubjectFilter
                          ? 'No tickets match your filter.'
                          : 'No tickets found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedTickets.map(ticket => {
                      return (
                        <TableRow
                          key={ticket.id}
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
                          <TableCell className="font-medium p-2 py-4">{ticket.id}</TableCell>
                          <TableCell className="max-w-xs md:max-w-sm truncate p-2 py-4">
                            {ticket.title}
                          </TableCell>
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
                                  'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                                ticket.priority === 'Medium' &&
                                  'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
                                ticket.priority === 'High' &&
                                  'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
                                ticket.priority === 'Critical' &&
                                  'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700'
                              )}
                            >
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2 py-4">
                            {getUserName(ticket.user_id as number, ticket)}
                          </TableCell>
                          <TableCell className="p-2 py-4">
                            {agentIdToNameMap[ticket.assignee_id as number] || '-'}
                          </TableCell>
                          <TableCell className="p-2 py-4">
                            {formatRelativeTime(ticket.last_update)}
                          </TableCell>
                          <TableCell className="p-2 py-4">
                            {formatRelativeTime(ticket.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {displayedTickets.length > 0 && allTicketsDisplayed && (
                <div className="flex justify-center py-6 border-t">
                  <div className="text-muted-foreground text-sm font-medium">
                    All Tickets Displayed ({displayedTickets.length} total)
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex-shrink-0 flex items-stretch h-full">
        <Collapsible
          open={filtersExpanded}
          onOpenChange={setFiltersExpanded}
          className="flex h-full"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="z-10 -mr-4 mt-6 shadow-md relative cursor-pointer rounded-full px-3 bg-transparent"
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
              <div className="flex items-center justify-between flex-shrink-0">
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
                <div>
                  <label htmlFor="subject-filter" className="text-sm font-medium">
                    Subject
                  </label>
                  <Input
                    id="subject-filter"
                    placeholder="Search subject..."
                    value={subjectInput}
                    onChange={e => setSubjectInput(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="status-filter" className="text-sm font-medium">
                    Statuses
                  </label>
                  <MultiSelectFilter
                    options={statusOptions}
                    selected={selectedStatuses}
                    onChange={setSelectedStatuses}
                    placeholder="Filter by status..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="team-filter" className="text-sm font-medium">
                    Teams {isLoadingTeams && '(Loading...)'} {teamsError && '(Error!)'}
                  </label>
                  <MultiSelectFilter
                    options={teamOptions}
                    selected={selectedTeams}
                    onChange={newSelection => {
                      console.log('🎯 Team filter onChange:', newSelection);
                      setSelectedTeams(newSelection);
                    }}
                    placeholder="Filter by team..."
                    className="mt-1"
                  />
                  {/* Debug info */}
                  {teamOptions.length === 0 && !isLoadingTeams && (
                    <div className="text-xs text-yellow-600 mt-1">
                      No teams available. Role: {user?.role}, ID: {user?.id}
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="agent-filter" className="text-sm font-medium">
                    Agents
                  </label>
                  <MultiSelectFilter
                    options={agentOptions}
                    selected={selectedAgents}
                    onChange={setSelectedAgents}
                    placeholder="Filter by agent..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="priority-filter" className="text-sm font-medium">
                    Priorities
                  </label>
                  <MultiSelectFilter
                    options={priorityOptions}
                    selected={selectedPriorities}
                    onChange={setSelectedPriorities}
                    placeholder="Filter by priority..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="company-filter" className="text-sm font-medium">
                    Companies
                  </label>
                  <MultiSelectFilter
                    options={companyOptions}
                    selected={selectedCompanies}
                    onChange={setSelectedCompanies}
                    placeholder="Filter by company..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="user-filter" className="text-sm font-medium">
                    Users
                  </label>
                  <MultiSelectFilter
                    options={userOptions}
                    selected={selectedUsers}
                    onChange={setSelectedUsers}
                    placeholder="Filter by user..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="category-filter" className="text-sm font-medium">
                    Categories
                  </label>
                  <MultiSelectFilter
                    options={categoryOptions}
                    selected={selectedCategories}
                    onChange={setSelectedCategories}
                    placeholder="Filter by category..."
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
export default function TicketsPage() {
  return (
    <Suspense
      fallback={<div className="flex items-center justify-center h-full">Loading page...</div>}
    >
      <TicketsClientContent />
    </Suspense>
  );
}
