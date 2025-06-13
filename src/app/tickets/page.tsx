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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function TicketsClientContent() {
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

  const { data: teamsData = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });
  const teamOptions: OptionType[] = useMemo(() => {
    return teamsData.map(team => ({
      value: team.id.toString(),
      label: team.name,
    }));
  }, [teamsData]);

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

  const filteredTicketsData = useMemo(() => {
    let tickets = allTicketsData;

    if (selectedStatuses.length === 0) {
      tickets = tickets.filter(ticket => ticket.status !== 'Closed');
    }

    if (debouncedSubjectFilter) {
      const filter = debouncedSubjectFilter.toLowerCase();
      tickets = tickets.filter(ticket => ticket.title.toLowerCase().includes(filter));
    }

    if (selectedStatuses.length > 0) {
      tickets = tickets.filter(ticket => selectedStatuses.includes(ticket.status));
    }
    if (selectedTeams.length > 0) {
      const teamIds = selectedTeams.map(id => Number.parseInt(id, 10));
      tickets = tickets.filter(ticket => ticket.team_id && teamIds.includes(ticket.team_id));
    }

    if (selectedAgents.length > 0) {
      const agentIds = selectedAgents.map(id => Number.parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.assignee_id && agentIds.includes(ticket.assignee_id)
      );
    }

    if (selectedPriorities.length > 0) {
      tickets = tickets.filter(ticket => selectedPriorities.includes(ticket.priority));
    }

    if (selectedUsers.length > 0) {
      const userIds = selectedUsers.map(id => Number.parseInt(id, 10));
      tickets = tickets.filter(ticket => ticket.user_id && userIds.includes(ticket.user_id));
    }

    if (selectedCompanies.length > 0) {
      const companyIds = selectedCompanies.map(id => Number.parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.user?.company_id && companyIds.includes(ticket.user.company_id)
      );
    }

    if (selectedCategories.length > 0) {
      const categoryIds = selectedCategories.map(id => Number.parseInt(id, 10));
      tickets = tickets.filter(
        ticket => ticket.category_id && categoryIds.includes(ticket.category_id)
      );
    }

    return tickets;
  }, [
    allTicketsData,
    debouncedSubjectFilter,
    selectedStatuses,
    selectedTeams,
    selectedAgents,
    selectedPriorities,
    selectedUsers,
    selectedCompanies,
    selectedCategories,
  ]);

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
    const teamIdFromQuery = searchParams.get('teamId');

    if (pathname === '/tickets') {
      if (teamIdFromQuery) {
        if (!selectedTeams.includes(teamIdFromQuery)) {
          setSelectedTeams([teamIdFromQuery]);
        }
      } else {
        if (selectedTeams.length > 0) {
          setSelectedTeams([]);
        }
      }
    }
  }, [searchParams, allTicketsData, router, pathname, selectedTeams]);

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
      await queryClient.cancelQueries({ queryKey: ['tickets'] });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
      ]);

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
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
      await queryClient.cancelQueries({ queryKey: ['tickets'] });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
      ]);

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
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
        queryClient.setQueryData(['tickets'], context.previousTicketsData);
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
      await queryClient.cancelQueries({ queryKey: ['tickets'] });

      const previousTicketsData = queryClient.getQueryData<InfiniteData<ITicket[], number>>([
        'tickets',
      ]);

      // Get current tickets to calculate counter changes
      const allTickets = previousTicketsData?.pages.flat() || [];
      const affectedTickets = allTickets.filter(ticket => ticketIds.includes(ticket.id));

      // Update optimistically the tickets data
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(['tickets'], oldData => {
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
        const activeTicketsToUser = affectedTickets.filter(
          ticket => ticket.status !== 'Closed' && ticket.status !== 'Resolved'
        );

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

              // Add tickets that were not assigned to current user and are now assigned to them
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
        queryClient.setQueryData(['tickets'], context.previousTicketsData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
    },
  });

  const handleAssignToAgentConfirm = () => {
    if (selectedTicketIds.size > 0) {
      const agentId =
        selectedAgentId === 'null'
          ? undefined
          : selectedAgentId
            ? parseInt(selectedAgentId, 10)
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
            ? parseInt(selectedTeamId, 10)
            : undefined;
      bulkAssignToTeamMutation.mutate({
        ticketIds: Array.from(selectedTicketIds),
        teamId,
      });
    }
  };

  const getUserName = (user_id: number) => {
    const users = usersData.filter(user => user.id === user_id)

    const user = users[0]
    if (!user) return "-"

    const companies = companiesData.filter(company => company.id === user.company_id)

    const company = companies[0]
    if (!company) return user.name

    return `${user.name} (${company.name})`
    
  }

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
                    filteredTicketsData.map(ticket => {
                      return (
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
                            {getUserName(ticket.user_id as number)}
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
                      );
                    })
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
          open={filtersExpanded}
          onOpenChange={setFiltersExpanded}
          className="flex h-full"
        >
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
                    Teams
                  </label>
                  <MultiSelectFilter
                    options={teamOptions}
                    selected={selectedTeams}
                    onChange={setSelectedTeams}
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
