'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Settings, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ITicket, TicketStatus, TicketPriority } from '@/typescript/ticket';
import type { Agent } from '@/typescript/agent';
import type { ICategory } from '@/typescript/category';
import type { Team } from '@/typescript/team';
import { getTickets, updateTicket } from '@/services/ticket';
import { getAgents } from '@/services/agent';
import { getTeams } from '@/services/team';
import { getCategories } from '@/services/category';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSocketContext } from '@/providers/socket-provider';
import { TicketConversation } from './ticket-conversation';
import BoringAvatar from 'boring-avatars';

interface Props {
  ticketId: number;
}

export function TicketPageContent({ ticketId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const [ticket, setTicket] = useState<ITicket | null>(null);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);

  // Fetch ticket data
  const {
    data: ticketData,
    isLoading: isLoadingTicket,
    error: ticketError,
  } = useQuery<ITicket[]>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      return getTickets({}, `/v1/tasks/${ticketId}`);
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const currentTicket = ticketData?.[0] || null;

  useEffect(() => {
    if (currentTicket) {
      setTicket(currentTicket);
    }
  }, [currentTicket]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !ticket) return;

    const handleTicketUpdated = (data: ITicket) => {
      if (data.id === ticket.id) {
        console.log('🚀 Ticket updated via socket:', data);
        setTicket(prev => (prev ? { ...prev, ...data } : data));
      }
    };

    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, [socket, ticket]);

  // Fetch related data
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 1000 * 60 * 5,
  });

  const { data: teams = [], isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ICategory[]>({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  // Update field mutation
  const updateFieldMutation = useMutation<
    ITicket,
    Error,
    {
      field: 'priority' | 'assignee_id' | 'team_id' | 'category_id';
      value: string | null;
      originalFieldValue: string | number | null;
    },
    { previousTicket: ITicket | null }
  >({
    mutationFn: async ({ field, value }) => {
      if (!ticket) throw new Error('No ticket selected');
      let updateValue: TicketStatus | TicketPriority | number | null;

      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        updateValue = value === 'null' || value === null ? null : Number.parseInt(value, 10);
        if (typeof updateValue === 'number' && isNaN(updateValue)) {
          throw new Error(`Invalid ${field}: ${value}`);
        }
      } else {
        updateValue = value as TicketPriority;
      }

      return updateTicket(ticket.id, { [field]: updateValue });
    },
    onMutate: async ({ field, value }) => {
      if (!ticket) return { previousTicket: null };

      const previousTicket = ticket;
      let optimisticUpdateValue: TicketStatus | TicketPriority | number | null;

      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        optimisticUpdateValue =
          value === 'null' || value === null ? null : Number.parseInt(value, 10);
        if (typeof optimisticUpdateValue === 'number' && isNaN(optimisticUpdateValue)) {
          optimisticUpdateValue = null;
        }
      } else {
        optimisticUpdateValue = value as TicketPriority;
      }

      const optimisticTicket: ITicket = {
        ...previousTicket,
        [field]: optimisticUpdateValue,
      };

      setTicket(optimisticTicket);
      queryClient.setQueryData(['ticket', ticket.id], [optimisticTicket]);

      return { previousTicket };
    },
    onError: (error, { field }, context) => {
      toast.error(
        `Error updating ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (context?.previousTicket) {
        setTicket(context.previousTicket);
        queryClient.setQueryData(['ticket', ticketId], [context.previousTicket]);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const handleUpdateField = (
    field: 'priority' | 'assignee_id' | 'team_id' | 'category_id',
    value: string | null
  ) => {
    if (!ticket) return;

    let optimisticUpdateValue: TicketStatus | TicketPriority | number | null;
    if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
      optimisticUpdateValue =
        value === 'null' || value === null ? null : Number.parseInt(value, 10);
      if (typeof optimisticUpdateValue === 'number' && isNaN(optimisticUpdateValue)) {
        console.error(`Invalid ${field} selected: ${value}`);
        return;
      }
    } else {
      optimisticUpdateValue = value as TicketPriority;
    }

    if (ticket[field as keyof ITicket] === optimisticUpdateValue) {
      return;
    }

    const currentFieldValue = ticket[field] ?? null;
    updateFieldMutation.mutate({ field, value, originalFieldValue: currentFieldValue });
  };

  // Close ticket mutation
  const closeTicketMutation = useMutation<ITicket, Error, void, { previousTicket: ITicket | null }>(
    {
      mutationFn: async () => {
        if (!ticket) throw new Error('No ticket selected');
        return updateTicket(ticket.id, { status: 'Closed' });
      },
      onMutate: async () => {
        if (!ticket) return { previousTicket: null };

        setIsClosingTicket(true);
        const previousTicket = ticket;

        const optimisticTicket: ITicket = {
          ...previousTicket,
          status: 'Closed' as TicketStatus,
        };

        setTicket(optimisticTicket);
        queryClient.setQueryData(['ticket', ticket.id], [optimisticTicket]);

        return { previousTicket };
      },
      onSuccess: updatedTicketData => {
        toast.success(`Ticket #${updatedTicketData.id} closed successfully.`);
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      },
      onError: (error, _variables, context) => {
        toast.error(
          `Error closing ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        if (context?.previousTicket) {
          setTicket(context.previousTicket);
          queryClient.setQueryData(['ticket', ticketId], [context.previousTicket]);
        }
      },
      onSettled: () => {
        setIsClosingTicket(false);
      },
    }
  );

  // Resolve ticket mutation
  const resolveTicketMutation = useMutation<
    ITicket,
    Error,
    void,
    { previousTicket: ITicket | null }
  >({
    mutationFn: async () => {
      if (!ticket) throw new Error('No ticket selected');
      return updateTicket(ticket.id, { status: 'Closed' });
    },
    onMutate: async () => {
      if (!ticket) return { previousTicket: null };

      setIsResolvingTicket(true);
      const previousTicket = ticket;

      const optimisticTicket: ITicket = {
        ...previousTicket,
        status: 'Closed' as TicketStatus,
      };

      setTicket(optimisticTicket);
      queryClient.setQueryData(['ticket', ticket.id], [optimisticTicket]);

      return { previousTicket };
    },
    onSuccess: updatedTicketData => {
      toast.success(`Ticket #${updatedTicketData.id} resolved successfully.`);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error, _variables, context) => {
      toast.error(
        `Error resolving ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (context?.previousTicket) {
        setTicket(context.previousTicket);
        queryClient.setQueryData(['ticket', ticketId], [context.previousTicket]);
      }
    },
    onSettled: () => {
      setIsResolvingTicket(false);
    },
  });

  const handleTicketUpdate = (updatedTicket: ITicket) => {
    setTicket(updatedTicket);
    queryClient.setQueryData(['ticket', ticketId], [updatedTicket]);
  };

  if (isLoadingTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="space-y-4">
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (ticketError || !ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">Ticket Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The ticket you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => router.push('/tickets')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tickets
        </Button>
      </div>
    );
  }

  const avatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/tickets')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">#{ticket.id}</span>
            <h1 className="text-xl font-semibold">{ticket.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => resolveTicketMutation.mutate()}
            disabled={isResolvingTicket}
          >
            {isResolvingTicket ? 'Resolving...' : 'Mark Resolved'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => closeTicketMutation.mutate()}
            disabled={isClosingTicket}
          >
            {isClosingTicket ? 'Closing...' : 'Mark Closed'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Badge */}
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
          />
          {ticket.status === 'Unread' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          )}
        </div>
        <span className="text-sm font-medium capitalize">{ticket.status}</span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <div className="lg:col-span-2">
          <TicketConversation ticket={ticket} onTicketUpdate={handleTicketUpdate} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Priority
                </label>
                <Select
                  value={ticket.priority}
                  onValueChange={value => handleUpdateField('priority', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select priority">
                      {ticket.priority && (
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              ticket.priority === 'Low' && 'bg-slate-500',
                              ticket.priority === 'Medium' && 'bg-green-500',
                              ticket.priority === 'High' && 'bg-yellow-500',
                              ticket.priority === 'Critical' && 'bg-red-500'
                            )}
                          />
                          {ticket.priority}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="High">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="Critical">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Critical
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned to */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Assigned to
                </label>
                <Select
                  value={ticket.assignee_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('assignee_id', value)}
                  disabled={isLoadingAgents}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={isLoadingAgents ? 'Loading...' : 'Select agent'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Team</label>
                <Select
                  value={ticket.team_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('team_id', value)}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={isLoadingTeams ? 'Loading...' : 'Select team'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Category
                </label>
                <Select
                  value={ticket.category_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('category_id', value)}
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue
                      placeholder={isLoadingCategories ? 'Loading...' : 'Select category'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* User */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">User</label>
                <div className="flex items-center gap-2">
                  <BoringAvatar
                    size={24}
                    name={
                      ticket.user?.email ||
                      ticket.user?.name ||
                      `user-${ticket.user?.id}` ||
                      'unknown-user'
                    }
                    variant="beam"
                    colors={avatarColors}
                  />
                  <span className="text-sm">{ticket.user?.name || 'Unknown User'}</span>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Last Update
                </label>
                <p className="text-sm">{formatRelativeTime(ticket.last_update)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Created
                </label>
                <p className="text-sm">{formatRelativeTime(ticket.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
