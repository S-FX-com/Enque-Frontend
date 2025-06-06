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
import { Settings2, Trash2, ChevronLeft, ChevronRight, UserIcon, UsersIcon } from 'lucide-react';
import { MultiSelectFilter, type OptionType } from '@/components/filters/multi-select-filter';
import { useQuery, useQueryClient, type InfiniteData, useMutation } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { updateTicket, deleteTicket } from '@/services/ticket';
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
import { getAgents } from '@/services/agent';
import { getTeams } from '@/services/team';
import { getUsers } from '@/services/user';
import { getCompanies } from '@/services/company';
import { getCategories } from '@/services/category';
import type { ITicket } from '@/typescript/ticket';
import type { Team } from '@/typescript/team';
import type { IUser } from '@/typescript/user';
import type { ICompany } from '@/typescript/company';
import type { ICategory } from '@/typescript/category';
import { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useGlobalTicketsContext } from '@/providers/global-tickets-provider';
import { useAuth } from '@/hooks/use-auth';
import type { Agent } from '@/typescript/agent';
import { formatRelativeTime, cn } from '@/lib/utils';
import { TicketDetail } from './ticket-details';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Constants for filter options
const STATUS_OPTIONS: OptionType[] = [
  { value: 'Unread', label: 'Unread' },
  { value: 'Open', label: 'Open' },
  { value: 'With User', label: 'With User' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Closed', label: 'Closed' },
];

const PRIORITY_OPTIONS: OptionType[] = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
];

function TicketsClientContent() {
  // Context and hooks
  const { user } = useAuth();
  const {
    allTicketsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoadingTickets,
    isTicketsError,
    ticketsError,
  } = useGlobalTicketsContext();

  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // State management
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [subjectInput, setSubjectInput] = useState('');
  const debouncedSubjectFilter = useDebounce(subjectInput, 300);
  const [selectedFilters, setSelectedFilters] = useState({
    statuses: [] as string[],
    teams: [] as string[],
    agents: [] as string[],
    priorities: [] as string[],
    users: [] as string[],
    companies: [] as string[],
    categories: [] as string[],
  });
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set());
  const [dialogStates, setDialogStates] = useState({
    delete: false,
    assignToAgent: false,
    assignToTeam: false,
    filtersExpanded: false,
  });
  const [selectedAssignments, setSelectedAssignments] = useState({
    agentId: null as string | null,
    teamId: null as string | null,
  });

  // Data fetching
  const { data: agentsData = [] } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 1000 * 60 * 5,
  });

  const { data: teamsData = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });

  const { data: usersData = [] } = useQuery<IUser[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 1000 * 60 * 5,
  });

  const { data: companiesData = [] } = useQuery<ICompany[]>({
    queryKey: ['companies'],
    queryFn: getCompanies,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categoriesData = [] } = useQuery<ICategory[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5,
  });

  // Memoized derived data
  const agentOptions = useMemo(
    () =>
      agentsData.map(agent => ({
        value: agent.id.toString(),
        label: agent.name,
      })),
    [agentsData]
  );

  const teamOptions = useMemo(
    () =>
      teamsData.map(team => ({
        value: team.id.toString(),
        label: team.name,
      })),
    [teamsData]
  );

  const userOptions = useMemo(
    () =>
      usersData
        .filter(user => user?.id && user.name)
        .map(user => ({
          value: user.id.toString(),
          label: user.name!,
        })),
    [usersData]
  );

  const companyOptions = useMemo(
    () =>
      companiesData
        .filter(company => company?.id && company.name)
        .map(company => ({
          value: company.id.toString(),
          label: company.name!,
        })),
    [companiesData]
  );

  const categoryOptions = useMemo(
    () =>
      categoriesData
        .filter(category => category?.id && category.name)
        .map(category => ({
          value: category.id.toString(),
          label: category.name!,
        })),
    [categoriesData]
  );

  const agentIdToNameMap = useMemo(
    () =>
      agentsData.reduce(
        (map, agent) => {
          map[agent.id] = agent.name;
          return map;
        },
        {} as Record<number, string>
      ),
    [agentsData]
  );

  // Filtered tickets
  const filteredTicketsData = useMemo(() => {
    let tickets = allTicketsData;

    if (selectedFilters.statuses.length === 0) {
      tickets = tickets.filter(ticket => ticket.status !== 'Closed');
    }

    if (debouncedSubjectFilter) {
      const lowerCaseFilter = debouncedSubjectFilter.toLowerCase();
      tickets = tickets.filter(ticket => ticket.title.toLowerCase().includes(lowerCaseFilter));
    }

    if (selectedFilters.statuses.length > 0) {
      tickets = tickets.filter(ticket => selectedFilters.statuses.includes(ticket.status));
    }

    if (selectedFilters.teams.length > 0) {
      const selectedTeamIds = selectedFilters.teams.map(id => parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.team_id && selectedTeamIds.includes(ticket.team_id)
      );
    }

    if (selectedFilters.agents.length > 0) {
      const selectedAgentIds = selectedFilters.agents.map(id => parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.assignee_id && selectedAgentIds.includes(ticket.assignee_id)
      );
    }

    if (selectedFilters.priorities.length > 0) {
      tickets = tickets.filter(ticket => selectedFilters.priorities.includes(ticket.priority));
    }

    if (selectedFilters.users.length > 0) {
      const selectedUserIds = selectedFilters.users.map(id => parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.user_id && selectedUserIds.includes(ticket.user_id)
      );
    }

    if (selectedFilters.companies.length > 0) {
      const selectedCompanyIds = selectedFilters.companies.map(id => parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.user?.company_id && selectedCompanyIds.includes(ticket.user.company_id)
      );
    }

    if (selectedFilters.categories.length > 0) {
      const selectedCategoryIds = selectedFilters.categories.map(id => parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.category_id && selectedCategoryIds.includes(ticket.category_id)
      );
    }

    return tickets;
  }, [allTicketsData, debouncedSubjectFilter, selectedFilters]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (debouncedSubjectFilter) count++;
    count += selectedFilters.statuses.length;
    count += selectedFilters.teams.length;
    count += selectedFilters.agents.length;
    count += selectedFilters.priorities.length;
    count += selectedFilters.users.length;
    count += selectedFilters.companies.length;
    count += selectedFilters.categories.length;
    return count;
  }, [debouncedSubjectFilter, selectedFilters]);

  // Effects
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

  useEffect(() => {
    const ticketIdToOpen = searchParams.get('openTicket');
    const teamIdFromQuery = searchParams.get('teamId');

    if (pathname === '/tickets') {
      if (teamIdFromQuery) {
        if (!selectedFilters.teams.includes(teamIdFromQuery)) {
          setSelectedFilters(prev => ({
            ...prev,
            teams: [teamIdFromQuery],
          }));
        }
      } else if (selectedFilters.teams.length > 0) {
        setSelectedFilters(prev => ({
          ...prev,
          teams: [],
        }));
      }
    }

    if (ticketIdToOpen && allTicketsData.length > 0) {
      const ticket = allTicketsData.find(t => t.id === parseInt(ticketIdToOpen, 10));
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  }, [searchParams, allTicketsData, router, pathname, selectedFilters.teams]);

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (ticket: ITicket) => {
      return updateTicket(ticket.id, { status: 'Open' });
    },
    onMutate: async ticket => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
      ]);

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page =>
            page.map(t => (t.id === ticket.id ? { ...t, status: 'Open' as const } : t))
          ),
        };
      });

      return { previousTicketsData };
    },
    onError: (err, ticket, context) => {
      console.error(`Failed to update ticket ${ticket.id} status to Open:`, err);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(['tickets'], context.previousTicketsData);
      }
    },
    onSuccess: (updatedTicket, ticket) => {
      if (selectedTicket?.id === ticket.id) {
        setSelectedTicket({ ...ticket, status: 'Open' as const });
      }
    },
  });

  const deleteTicketsMutation = useMutation({
    mutationFn: async (ticketIds: number[]) => {
      const results = await Promise.allSettled(ticketIds.map(id => deleteTicket(id)));
      const failedDeletions = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result, index) => ({ reason: result.reason, id: ticketIds[index] }));

      if (failedDeletions.length > 0) {
        const errorMessages = failedDeletions
          .map(({ reason, id }) => (reason as { message?: string })?.message || `Ticket ID ${id}`)
          .join(', ');
        throw new Error(`Failed to delete: ${errorMessages}`);
      }

      return results;
    },
    onMutate: async ticketIdsToDelete => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
      ]);

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page =>
            page.filter(ticket => !ticketIdsToDelete.includes(ticket.id))
          ),
        };
      });

      // Optimistic updates for counters
      const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
      const currentMyCount =
        queryClient.getQueryData<number>(['ticketsCount', 'my', user?.id]) || 0;

      const allTickets = previousTicketsData?.pages.flat() || [];
      const deletedTickets = allTickets.filter(ticket => ticketIdsToDelete.includes(ticket.id));
      const activeDeletedCount = deletedTickets.filter(
        ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
      ).length;
      const myActiveDeletedCount = deletedTickets.filter(
        ticket =>
          ticket.assignee_id === user?.id &&
          ticket.status !== 'Closed' &&
          ticket.status !== 'Resolved'
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
      setDialogStates(prev => ({ ...prev, delete: false }));

      return {
        previousTicketsData,
        previousAllCount: currentAllCount,
        previousMyCount: currentMyCount,
      };
    },
    onError: (err, _, context) => {
      toast.error(`Error deleting tickets: ${err.message}`);
      if (context?.previousTicketsData) {
        queryClient.setQueryData(['tickets'], context.previousTicketsData);
      }
      if (context?.previousAllCount !== undefined) {
        queryClient.setQueryData(['ticketsCount', 'all'], context.previousAllCount);
      }
      if (context?.previousMyCount !== undefined && user?.id) {
        queryClient.setQueryData(['ticketsCount', 'my', user.id], context.previousMyCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
    },
  });

  const bulkAssignToAgentMutation = useMutation({
    mutationFn: async (payload: { ticketIds: number[]; agentId: number | undefined }) => {
      const { ticketIds, agentId } = payload;
      const results = await Promise.allSettled(
        ticketIds.map(id => updateTicket(id, { assignee_id: agentId }))
      );

      const failedAssignments = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result, index) => ({ reason: result.reason, id: ticketIds[index] }));

      if (failedAssignments.length > 0) {
        const errorMessages = failedAssignments
          .map(({ reason, id }) => (reason as { message?: string })?.message || `Ticket ID ${id}`)
          .join(', ');
        throw new Error(`Failed to assign: ${errorMessages}`);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.ticketIds.length} ticket(s) assigned successfully.`);
    },
    onMutate: async ({ ticketIds, agentId }) => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
      ]);

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page =>
            page.map(ticket =>
              ticketIds.includes(ticket.id) ? { ...ticket, assignee_id: agentId } : ticket
            )
          ),
        };
      });

      setSelectedTicketIds(new Set());
      setDialogStates(prev => ({ ...prev, assignToAgent: false }));

      return { previousTicketsData };
    },
    onError: (err: Error) => {
      toast.error(`Error assigning tickets: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'my', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
    },
  });

  const bulkAssignToTeamMutation = useMutation({
    mutationFn: async (payload: { ticketIds: number[]; teamId: number | undefined }) => {
      const { ticketIds, teamId } = payload;
      const results = await Promise.allSettled(
        ticketIds.map(id => updateTicket(id, { team_id: teamId }))
      );

      const failedAssignments = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result, index) => ({ reason: result.reason, id: ticketIds[index] }));

      if (failedAssignments.length > 0) {
        const errorMessages = failedAssignments
          .map(({ reason, id }) => (reason as { message?: string })?.message || `Ticket ID ${id}`)
          .join(', ');
        throw new Error(`Failed to assign: ${errorMessages}`);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.ticketIds.length} ticket(s) assigned to team successfully.`);
    },
    onMutate: async ({ ticketIds, teamId }) => {
      await queryClient.cancelQueries({ queryKey: ['tickets'] });
      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
      ]);

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map(page =>
            page.map(ticket =>
              ticketIds.includes(ticket.id) ? { ...ticket, team_id: teamId } : ticket
            )
          ),
        };
      });

      setSelectedTicketIds(new Set());
      setDialogStates(prev => ({ ...prev, assignToTeam: false }));

      return { previousTicketsData };
    },
    onError: (err: Error) => {
      toast.error(`Error assigning tickets to team: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
    },
  });

  // Handlers
  const handleTicketUpdate = useCallback(
    (updatedTicket: ITicket) => {
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map((page: ITicket[]) =>
          page.map(t => (t.id === updatedTicket.id ? updatedTicket : t))
        );
        return { ...oldData, pages: newPages };
      });

      if (selectedTicket?.id === updatedTicket.id) {
        setSelectedTicket(updatedTicket);
      }
    },
    [selectedTicket, queryClient]
  );

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

  const clearAllFilters = useCallback(() => {
    setSubjectInput('');
    setSelectedFilters({
      statuses: [],
      teams: [],
      agents: [],
      priorities: [],
      users: [],
      companies: [],
      categories: [],
    });
  }, []);

  const handleTicketClick = useCallback(
    async (ticket: ITicket) => {
      setSelectedTicket(ticket);
      if (ticket.status === 'Unread') {
        markAsReadMutation.mutate(ticket);
      }
    },
    [markAsReadMutation]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedTicket(null);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('openTicket');
    router.push(`${window.location.pathname}?${newSearchParams.toString()}`);
  }, [searchParams, router]);

  // Derived state
  const isAllSelected =
    allTicketsData.length > 0 && selectedTicketIds.size === allTicketsData.length;
  const isIndeterminate =
    selectedTicketIds.size > 0 && selectedTicketIds.size < allTicketsData.length;
  const headerCheckboxState = isAllSelected ? true : isIndeterminate ? 'indeterminate' : false;

  // Dialog handlers
  const handleDeleteConfirm = () => {
    if (selectedTicketIds.size > 0) {
      deleteTicketsMutation.mutate(Array.from(selectedTicketIds));
    }
  };

  const handleOpenAssignToAgentDialog = () => {
    if (selectedTicketIds.size > 0) {
      const ticketsArray = allTicketsData.filter(ticket => selectedTicketIds.has(ticket.id));
      const firstTicket = ticketsArray[0];
      const allSameAgent = ticketsArray.every(
        ticket => ticket.assignee_id === firstTicket.assignee_id
      );

      setSelectedAssignments(prev => ({
        ...prev,
        agentId:
          allSameAgent && firstTicket.assignee_id !== undefined
            ? String(firstTicket.assignee_id)
            : null,
      }));
    }
    setDialogStates(prev => ({ ...prev, assignToAgent: true }));
  };

  const handleOpenAssignToTeamDialog = () => {
    if (selectedTicketIds.size > 0) {
      const ticketsArray = allTicketsData.filter(ticket => selectedTicketIds.has(ticket.id));
      const firstTicket = ticketsArray[0];
      const allSameTeam = ticketsArray.every(ticket => ticket.team_id === firstTicket.team_id);

      setSelectedAssignments(prev => ({
        ...prev,
        teamId:
          allSameTeam && firstTicket.team_id !== undefined ? String(firstTicket.team_id) : null,
      }));
    }
    setDialogStates(prev => ({ ...prev, assignToTeam: true }));
  };

  const handleAssignToAgentConfirm = () => {
    if (selectedTicketIds.size > 0) {
      const agentId =
        selectedAssignments.agentId === 'null'
          ? undefined
          : selectedAssignments.agentId
            ? parseInt(selectedAssignments.agentId, 10)
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
        selectedAssignments.teamId === 'null'
          ? undefined
          : selectedAssignments.teamId
            ? parseInt(selectedAssignments.teamId, 10)
            : undefined;
      bulkAssignToTeamMutation.mutate({
        ticketIds: Array.from(selectedTicketIds),
        teamId,
      });
    }
  };

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 flex flex-col h-full">
        {selectedTicketIds.size > 0 && (
          <div className="flex items-center justify-between py-4 px-6 flex-shrink-0 border-b">
            <div className="flex items-center gap-2 ml-auto">
              <AlertDialog
                open={dialogStates.assignToAgent}
                onOpenChange={open => setDialogStates(prev => ({ ...prev, assignToAgent: open }))}
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
                    <Select
                      value={selectedAssignments.agentId || ''}
                      onValueChange={value =>
                        setSelectedAssignments(prev => ({ ...prev, agentId: value }))
                      }
                    >
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
                      disabled={bulkAssignToAgentMutation.isPending || !selectedAssignments.agentId}
                    >
                      {bulkAssignToAgentMutation.isPending ? 'Assigning...' : 'Assign'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog
                open={dialogStates.assignToTeam}
                onOpenChange={open => setDialogStates(prev => ({ ...prev, assignToTeam: open }))}
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
                    <Select
                      value={selectedAssignments.teamId || ''}
                      onValueChange={value =>
                        setSelectedAssignments(prev => ({ ...prev, teamId: value }))
                      }
                    >
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
                      disabled={bulkAssignToTeamMutation.isPending || !selectedAssignments.teamId}
                    >
                      {bulkAssignToTeamMutation.isPending ? 'Assigning...' : 'Assign'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog
                open={dialogStates.delete}
                onOpenChange={open => setDialogStates(prev => ({ ...prev, delete: open }))}
              >
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
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteTicketsMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
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
                    <TableHead className="p-2 w-[150px]">Assigned to</TableHead>
                    <TableHead className="p-2 w-[150px]">Last Update</TableHead>
                    <TableHead className="p-2 w-[150px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTickets && allTicketsData.length === 0 ? (
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
                  ) : filteredTicketsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        {debouncedSubjectFilter
                          ? 'No tickets match your filter.'
                          : 'No tickets found.'}
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
                        onClick={() => handleTicketClick(ticket)}
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
                          {ticket.user?.name || ticket.email_info?.email_sender || '-'}
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
                      </motion.tr>
                    ))
                  )}
                  {isFetchingNextPage && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-4 text-center text-muted-foreground">
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
      <div className="flex-shrink-0 flex items-stretch h-full">
        <Collapsible
          open={dialogStates.filtersExpanded}
          onOpenChange={open => setDialogStates(prev => ({ ...prev, filtersExpanded: open }))}
          className="flex h-full"
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="z-10 -mr-4 mt-6 shadow-md relative cursor-pointer rounded-full px-3"
            >
              {dialogStates.filtersExpanded ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  Filters <ChevronLeft className="h-4 w-4 ml-1 inline" />
                </>
              )}
              {activeFiltersCount > 0 && !dialogStates.filtersExpanded && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </CollapsibleTrigger>
          {dialogStates.filtersExpanded && (
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
                    options={STATUS_OPTIONS}
                    selected={selectedFilters.statuses}
                    onChange={statuses => setSelectedFilters(prev => ({ ...prev, statuses }))}
                    placeholder="Filter by status..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="team-filter" className="text-sm font-medium">
                    Teams
                  </label>
                  <MultiSelectFilter
                    options={teamOptions}
                    selected={selectedFilters.teams}
                    onChange={teams => setSelectedFilters(prev => ({ ...prev, teams }))}
                    placeholder="Filter by team..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="agent-filter" className="text-sm font-medium">
                    Agents
                  </label>
                  <MultiSelectFilter
                    options={agentOptions}
                    selected={selectedFilters.agents}
                    onChange={agents => setSelectedFilters(prev => ({ ...prev, agents }))}
                    placeholder="Filter by agent..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="priority-filter" className="text-sm font-medium">
                    Priorities
                  </label>
                  <MultiSelectFilter
                    options={PRIORITY_OPTIONS}
                    selected={selectedFilters.priorities}
                    onChange={priorities => setSelectedFilters(prev => ({ ...prev, priorities }))}
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
                    selected={selectedFilters.companies}
                    onChange={companies => setSelectedFilters(prev => ({ ...prev, companies }))}
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
                    selected={selectedFilters.users}
                    onChange={users => setSelectedFilters(prev => ({ ...prev, users }))}
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
                    selected={selectedFilters.categories}
                    onChange={categories => setSelectedFilters(prev => ({ ...prev, categories }))}
                    placeholder="Filter by category..."
                    className="mt-1"
                  />
                </div>
              </div>
            </aside>
          )}
        </Collapsible>
      </div>
      <TicketDetail
        ticket={selectedTicket}
        onClose={handleCloseDetail}
        onTicketUpdate={handleTicketUpdate}
      />
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
