'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ITicket, TicketStatus, TicketPriority } from '@/typescript/ticket';
import { Agent } from '@/typescript/agent';
import { ICategory } from '@/typescript/category';
import { formatRelativeTime } from '@/lib/utils';
import { TicketConversation } from './ticket-conversation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAgents } from '@/services/agent';
import { getTeams } from '@/services/team';
import { getCategories } from '@/services/category';
import { Team } from '@/typescript/team';
import { updateTicket } from '@/services/ticket';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';

interface Props {
  ticket: ITicket | null;
  onClose: () => void;
  onTicketUpdate?: (updatedTicket: ITicket) => void;
}

export function TicketDetail({ ticket, onClose, onTicketUpdate }: Props) {
  const queryClient = useQueryClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const fetchedAgents = await getAgents();
        setAgents(fetchedAgents);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setIsLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery<Team[], Error>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ICategory[], Error>({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });
  const updateFieldMutation = useMutation<
    ITicket,
    Error,
    {
      field: 'priority' | 'assignee_id' | 'team_id' | 'category_id';
      value: string | null;
      originalFieldValue: TicketPriority | number | null;
    }, // Type of variables passed to mutationFn
    { previousTicket: ITicket | null } // Type of context
  >({
    mutationFn: async ({ field, value }) => {
      if (!ticket) throw new Error('No ticket selected for update');

      let updatePayloadValue: TicketStatus | TicketPriority | number | null;
      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        updatePayloadValue = value === 'null' || value === null ? null : parseInt(value, 10);
        if (typeof updatePayloadValue === 'number' && isNaN(updatePayloadValue)) {
          throw new Error(`Invalid ${field} selected: ${value}`);
        }
      } else {
        updatePayloadValue = value as TicketPriority;
      }

      const updatedTicketData = await updateTicket(ticket.id, { [field]: updatePayloadValue });
      if (!updatedTicketData) {
        throw new Error(`API failed to update ticket ${field}`);
      }
      return updatedTicketData;
    },
    onMutate: async ({ field, value }) => {
      if (!ticket) return { previousTicket: null };
      if (field === 'priority') setIsUpdatingPriority(true);
      if (field === 'assignee_id') setIsUpdatingAssignee(true);
      if (field === 'team_id') setIsUpdatingTeam(true);
      if (field === 'category_id') setIsUpdatingCategory(true);

      const previousTicket = { ...ticket };

      let optimisticUpdateValue: TicketStatus | TicketPriority | number | null;
      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        optimisticUpdateValue = value === 'null' || value === null ? null : parseInt(value, 10);
      } else {
        optimisticUpdateValue = value as TicketPriority;
      }

      const optimisticTicket = {
        ...ticket,
        [field]: optimisticUpdateValue,
      };

      if (onTicketUpdate) {
        onTicketUpdate(optimisticTicket);
      }
      return { previousTicket };
    },
    onError: (error, variables, context) => {
      console.error(`Error updating ticket ${variables.field}:`, error);
      toast.error(`Failed to update ticket ${variables.field}. Reverting changes.`);
      if (context?.previousTicket && onTicketUpdate) {
        onTicketUpdate(context.previousTicket);
      }
    },
    onSuccess: async (data, variables) => {
      if (onTicketUpdate) {
        onTicketUpdate(data);
      }
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser?.id;

      if (currentUserId) {
        if (variables.field === 'assignee_id') {
          const previousAssigneeId = variables.originalFieldValue;
          const newAssigneeId = data.assignee_id;
          if (previousAssigneeId === currentUserId || newAssigneeId === currentUserId) {
            console.log(
              `Assignee changed involving current user ${currentUserId}. Invalidating 'My Tickets' query.`
            );
            queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
          }
        } else {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          if (variables.field === 'team_id') {
            queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
            queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] }); // For TeamsPage
            queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
            queryClient.invalidateQueries({ queryKey: ['agentTeams', currentUserId] }); // For Sidebar "My Teams"
            queryClient.invalidateQueries({ queryKey: ['agentTeams'] }); // Broader invalidation as a fallback
          } else if (variables.field === 'category_id' || variables.field === 'priority') {
            queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
          }
        }
      } else {
        // If currentUserId is not available
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        if (variables.field === 'team_id') {
          queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
          queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
          queryClient.invalidateQueries({ queryKey: ['agentTeams'] }); // Broader invalidation for Sidebar
        }
      }
    },
    onSettled: (_data, _error, variables) => {
      if (variables.field === 'priority') setIsUpdatingPriority(false);
      if (variables.field === 'assignee_id') setIsUpdatingAssignee(false);
      if (variables.field === 'team_id') setIsUpdatingTeam(false);
      if (variables.field === 'category_id') setIsUpdatingCategory(false);
    },
  });

  const handleUpdateField = (
    field: 'priority' | 'assignee_id' | 'team_id' | 'category_id',
    value: string | null
  ) => {
    if (!ticket) return;
    if (field === 'priority' && isUpdatingPriority) return;
    if (field === 'assignee_id' && isUpdatingAssignee) return;
    if (field === 'team_id' && isUpdatingTeam) return;
    if (field === 'category_id' && isUpdatingCategory) return;

    let updateValueForComparison: TicketStatus | TicketPriority | number | null;
    if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
      updateValueForComparison = value === 'null' || value === null ? null : parseInt(value, 10);
      if (typeof updateValueForComparison === 'number' && isNaN(updateValueForComparison)) {
        console.error(`Invalid ${field} selected: ${value}`);
        return;
      }
    } else {
      updateValueForComparison = value as TicketPriority;
    }

    if (ticket[field as keyof ITicket] === updateValueForComparison) {
      return;
    }

    const originalFieldValue = ticket[field] ?? null;
    updateFieldMutation.mutate({ field, value, originalFieldValue });
  };
  const closeTicketMutation = useMutation<ITicket, Error, void, { previousTicket: ITicket | null }>(
    {
      mutationFn: async () => {
        if (!ticket) throw new Error('No ticket selected');
        setIsClosingTicket(true);
        return updateTicket(ticket.id, { status: 'Closed' });
      },
      onMutate: async () => {
        if (!ticket) return { previousTicket: null };
        await queryClient.cancelQueries({ queryKey: ['tickets', ticket.id] }); // Cancelar consultas para este ticket
        const previousTicket = queryClient.getQueryData<ITicket>(['tickets', ticket.id]) || ticket;

        const optimisticTicket: ITicket = {
          ...previousTicket,
          status: 'Closed' as TicketStatus,
        };

        queryClient.setQueryData(['tickets', ticket.id], optimisticTicket); // Actualización optimista en caché individual
        if (onTicketUpdate) {
          onTicketUpdate(optimisticTicket);
        }
        return { previousTicket };
      },
      onSuccess: updatedTicketData => {
        // Removido _variables, _context ya que no se usan aquí explícitamente
        // updatedTicketData ya es el dato correcto del servidor
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] });
        if (onTicketUpdate) {
          onTicketUpdate(updatedTicketData); // Asegurar que el padre recibe los datos finales
        }
        onClose();
        toast.success(`Ticket #${updatedTicketData.id} closed successfully.`);
      },
      onError: (error, _variables, context) => {
        toast.error(
          `Error closing ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        if (context?.previousTicket) {
          queryClient.setQueryData(['tickets', ticket!.id], context.previousTicket); // Revertir caché individual
          if (onTicketUpdate) {
            onTicketUpdate(context.previousTicket);
          }
        }
      },
      onSettled: () => {
        setIsClosingTicket(false);
        // Invalidar para asegurar consistencia después de éxito o error si no se hizo ya o si el panel no se cierra
        // Sin embargo, con onClose() en onSuccess y la reversión en onError, esto podría ser redundante aquí
        // a menos que queramos asegurar refetch incluso si onTicketUpdate no actualiza el estado correctamente.
        // queryClient.invalidateQueries({ queryKey: ['tickets', ticket?.id] });
      },
    }
  );

  const resolveTicketMutation = useMutation<
    ITicket,
    Error,
    void,
    { previousTicket: ITicket | null }
  >({
    mutationFn: async () => {
      if (!ticket) throw new Error('No ticket selected');
      setIsResolvingTicket(true);
      return updateTicket(ticket.id, { status: 'Resolved' });
    },
    onMutate: async () => {
      if (!ticket) return { previousTicket: null };
      await queryClient.cancelQueries({ queryKey: ['tickets', ticket.id] });
      const previousTicket = queryClient.getQueryData<ITicket>(['tickets', ticket.id]) || ticket;

      const optimisticTicket: ITicket = {
        ...previousTicket,
        status: 'Resolved' as TicketStatus,
      };

      queryClient.setQueryData(['tickets', ticket.id], optimisticTicket);
      if (onTicketUpdate) {
        onTicketUpdate(optimisticTicket);
      }
      return { previousTicket };
    },
    onSuccess: updatedTicketData => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] });
      if (onTicketUpdate) {
        onTicketUpdate(updatedTicketData);
      }
      onClose();
      toast.success(`Ticket #${updatedTicketData.id} resolved successfully.`);
    },
    onError: (error, _variables, context) => {
      toast.error(
        `Error resolving ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (context?.previousTicket) {
        queryClient.setQueryData(['tickets', ticket!.id], context.previousTicket);
        if (onTicketUpdate) {
          onTicketUpdate(context.previousTicket);
        }
      }
    },
    onSettled: () => {
      setIsResolvingTicket(false);
      // queryClient.invalidateQueries({ queryKey: ['tickets', ticket?.id] });
    },
  });

  if (!ticket) {
    return null;
  }

  const avatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        key={`overlay-${ticket.id}`}
      />
      <motion.div
        key={`panel-${ticket.id}`}
        className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-3/5 bg-card border-l shadow-lg flex flex-col z-50 overflow-hidden"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Close"
          className="absolute top-2 right-2 z-10"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex gap-4 p-4 pt-10 overflow-y-auto">
          <div className="flex-1 min-w-0">
            <TicketConversation ticket={ticket} />
          </div>
          <div className="border-l border-border"></div>
          <div className="w-56 flex-shrink-0 space-y-4 flex flex-col pr-2">
            <h3 className="text-lg font-semibold text-center mb-4 flex-shrink-0">Details</h3>

            <div className="flex-1 space-y-4 overflow-y-auto">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Priority</h3>
                <Select
                  value={ticket.priority}
                  onValueChange={value => handleUpdateField('priority', value)}
                  disabled={isUpdatingPriority}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={isUpdatingPriority ? 'Updating...' : 'Select priority'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned to</h3>
                <Select
                  value={ticket.assignee_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('assignee_id', value)}
                  disabled={isLoadingAgents || isUpdatingAssignee}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={
                        isLoadingAgents
                          ? 'Loading...'
                          : isUpdatingAssignee
                            ? 'Updating...'
                            : 'Select agent'
                      }
                    />
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
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Team</h3>
                <Select
                  value={ticket.team_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('team_id', value)}
                  disabled={isLoadingTeams || isUpdatingTeam}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={
                        isLoadingTeams
                          ? 'Loading...'
                          : isUpdatingTeam
                            ? 'Updating...'
                            : 'Select team'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {teams.map((team: Team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                <Select
                  value={ticket.category_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('category_id', value)}
                  disabled={isLoadingCategories || isUpdatingCategory}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={
                        isLoadingCategories
                          ? 'Loading...'
                          : isUpdatingCategory
                            ? 'Updating...'
                            : 'Select category'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {categories.map((category: ICategory) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">User</h3>
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

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                <p className="text-sm">{formatRelativeTime(ticket.created_at)}</p>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveTicketMutation.mutate()}
                    disabled={isResolvingTicket}
                    className="w-full"
                  >
                    {isResolvingTicket ? 'Marking Resolved...' : 'Mark Resolved'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => closeTicketMutation.mutate()}
                    disabled={isClosingTicket}
                    className="w-full"
                  >
                    {isClosingTicket ? 'Marking Closed...' : 'Mark Closed'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
