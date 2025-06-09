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
import { cn } from '@/lib/utils';
import { useSocketContext } from '@/providers/socket-provider';

interface Props {
  ticket: ITicket | null;
  onClose: () => void;
  onTicketUpdate?: (updatedTicket: ITicket) => void;
}

export function TicketDetail({ ticket: initialTicket, onClose, onTicketUpdate }: Props) {
  const queryClient = useQueryClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);
  const [ticket, setTicket] = useState<ITicket | null>(initialTicket);
  
  // ✅ AGREGAR: Hook de sockets para actualizaciones en tiempo real
  const { socket } = useSocketContext();

  // Get teams data from React Query
  const { data: teams = [], isLoading: isLoadingTeams } = useQuery<Team[], Error>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });

  // Get categories data from React Query
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ICategory[], Error>({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  // ✅ AGREGAR: Listener para actualizaciones de tickets via sockets
  useEffect(() => {
    if (!socket || !ticket) return;

    const handleTicketUpdated = (data: ITicket) => {
      // Solo actualizar si es el ticket actual
      if (data.id === ticket.id) {
        console.log('🚀 Ticket updated via socket:', data);
        setTicket(prev => prev ? { ...prev, ...data } : data);
        
        // También notificar al padre
        if (onTicketUpdate) {
          onTicketUpdate(data);
        }
      }
    };

    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, [socket, ticket, onTicketUpdate]);

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
        updateValue = value === 'null' || value === null ? null : parseInt(value, 10);
        if (typeof updateValue === 'number' && isNaN(updateValue)) {
          throw new Error(`Invalid ${field}: ${value}`);
        }
      } else {
        updateValue = value as TicketPriority;
      }

      return updateTicket(ticket.id, { [field]: updateValue });
    },
    onMutate: async ({ field, value, originalFieldValue }) => {
      if (!ticket) return { previousTicket: null };

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tickets', ticket.id] });

      // Snapshot the previous value
      const previousTicket = queryClient.getQueryData<ITicket>(['tickets', ticket.id]) || ticket;

      let optimisticUpdateValue: TicketStatus | TicketPriority | number | null;
      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        optimisticUpdateValue = value === 'null' || value === null ? null : parseInt(value, 10);
        if (typeof optimisticUpdateValue === 'number' && isNaN(optimisticUpdateValue)) {
          optimisticUpdateValue = null;
        }
      } else {
        optimisticUpdateValue = value as TicketPriority;
      }

      // Optimistically update to the new value
      const optimisticTicket: ITicket = {
        ...previousTicket,
        [field]: optimisticUpdateValue,
      };

      queryClient.setQueryData(['tickets', ticket.id], optimisticTicket);

      // Update parent immediately
      if (onTicketUpdate) {
        onTicketUpdate(optimisticTicket);
      }

      // Optimistically update team counters when team_id changes
      if (field === 'team_id') {
        const currentUser = await getCurrentUser();
        if (currentUser?.id) {
          // Get current agentTeams data
          const agentTeamsKey = ['agentTeams', currentUser.id, currentUser.role];
          const currentAgentTeams = queryClient.getQueryData<Team[]>(agentTeamsKey) || [];

          // Only proceed if ticket is active (not closed/resolved)
          if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
            const previousTeamId = originalFieldValue as number | null;
            const newTeamId = optimisticUpdateValue as number | null;

            // Update team counters optimistically
            const updatedAgentTeams = currentAgentTeams.map(team => {
              if (team.id === previousTeamId && previousTeamId !== null) {
                // Decrease counter for previous team
                return {
                  ...team,
                  ticket_count: Math.max(0, (team.ticket_count || 0) - 1),
                };
              } else if (team.id === newTeamId && newTeamId !== null) {
                // Increase counter for new team
                return {
                  ...team,
                  ticket_count: (team.ticket_count || 0) + 1,
                };
              }
              return team;
            });

            queryClient.setQueryData(agentTeamsKey, updatedAgentTeams);
          }
        }
      }

      // Optimistically update "my tickets" counter and list when assignee_id changes
      if (field === 'assignee_id') {
        const currentUser = await getCurrentUser();
        if (currentUser?.id) {
          // Only proceed if ticket is active (not closed/resolved)
          if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
            const previousAssigneeId = originalFieldValue as number | null;
            const newAssigneeId = optimisticUpdateValue as number | null;

            // Get current my tickets count
            const myTicketsCountKey = ['ticketsCount', 'my', currentUser.id];
            const currentMyCount = queryClient.getQueryData<number>(myTicketsCountKey) || 0;

            // Update counter optimistically
            let newCount = currentMyCount;
            if (previousAssigneeId === currentUser.id && newAssigneeId !== currentUser.id) {
              // Ticket was assigned to current user, now assigned to someone else - decrease
              newCount = Math.max(0, currentMyCount - 1);
            } else if (previousAssigneeId !== currentUser.id && newAssigneeId === currentUser.id) {
              // Ticket was not assigned to current user, now assigned to current user - increase
              newCount = currentMyCount + 1;
            }

            queryClient.setQueryData(myTicketsCountKey, newCount);

            // Optimistically update "my tickets" infinite query list
            const myTicketsQueryKey = ['tickets', 'my', currentUser.id];
            queryClient.setQueryData(myTicketsQueryKey, (oldData: unknown) => {
              if (!oldData) return oldData;

              const typedData = oldData as { pages: ITicket[][]; pageParams: number[] };
              const newPages = typedData.pages.map((page: ITicket[]) => {
                if (previousAssigneeId === currentUser.id && newAssigneeId !== currentUser.id) {
                  // Remove ticket from my tickets list
                  return page.filter(t => t.id !== ticket.id);
                } else if (previousAssigneeId !== currentUser.id && newAssigneeId === currentUser.id) {
                  // Add ticket to my tickets list if not already there
                  const ticketExists = page.some(t => t.id === ticket.id);
                  if (!ticketExists) {
                    return [optimisticTicket, ...page];
                  }
                }
                // Update existing ticket if it's already in the list
                return page.map(t => (t.id === ticket.id ? optimisticTicket : t));
              });

              return {
                ...typedData,
                pages: newPages,
              };
            });
          }
        }
      }

      return { previousTicket };
    },
    onError: (error, { field }) => {
      toast.error(
        `Error updating ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (ticket) {
        // Revert team counter changes on error
        if (field === 'team_id') {
          queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
        }
        // Revert my tickets counter changes on error
        if (field === 'assignee_id') {
          queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'my'] });
        }
      }
    },
    onSuccess: async (data, variables) => {
      // No es necesario actualizar el estado aquí ya que se hizo optimisticamente
      // Solo invalidamos las consultas necesarias para mantener sincronización
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser?.id;

      if (currentUserId) {
        if (variables.field === 'assignee_id') {
          const previousAssigneeId = variables.originalFieldValue;
          const newAssigneeId = data.assignee_id;
          if (previousAssigneeId === currentUserId || newAssigneeId === currentUserId) {
            queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'my', currentUserId] });
          }
        } else {
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
          if (variables.field === 'team_id') {
            queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
            queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
            queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
            queryClient.invalidateQueries({ queryKey: ['agentTeams', currentUserId] });
            queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
          } else if (variables.field === 'category_id' || variables.field === 'priority') {
            queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
          }
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        if (variables.field === 'team_id') {
          queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
          queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
          queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
        }
      }
    },
  });

  const handleUpdateField = (
    field: 'priority' | 'assignee_id' | 'team_id' | 'category_id',
    value: string | null
  ) => {
    if (!ticket) return;

    // Validar el valor antes de procesarlo
    let optimisticUpdateValue: TicketStatus | TicketPriority | number | null;
    if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
      optimisticUpdateValue = value === 'null' || value === null ? null : parseInt(value, 10);
      if (typeof optimisticUpdateValue === 'number' && isNaN(optimisticUpdateValue)) {
        console.error(`Invalid ${field} selected: ${value}`);
        return;
      }
    } else {
      optimisticUpdateValue = value as TicketPriority;
    }

    // Si el valor es exactamente el mismo, no hacemos nada
    if (ticket[field as keyof ITicket] === optimisticUpdateValue) {
      return;
    }

    // Obtener el valor original para la mutation
    const currentFieldValue = ticket[field] ?? null;

    // Iniciar la actualización (la actualización optimista se hace en onMutate)
    updateFieldMutation.mutate({ field, value, originalFieldValue: currentFieldValue });
  };
  const closeTicketMutation = useMutation<ITicket, Error, void, { previousTicket: ITicket | null }>(
    {
      mutationFn: async () => {
        if (!ticket) throw new Error('No ticket selected');
        return updateTicket(ticket.id, { status: 'Closed' });
      },
      onMutate: async () => {
        if (!ticket) return { previousTicket: null };
        
        // ✅ ULTRA RÁPIDO: Actualización optimista inmediata
        setIsClosingTicket(true);
        const previousTicket = ticket;

        const optimisticTicket: ITicket = {
          ...previousTicket,
          status: 'Closed' as TicketStatus,
        };

        // Actualizar estado local inmediatamente
        setTicket(optimisticTicket);
        if (onTicketUpdate) {
          onTicketUpdate(optimisticTicket);
        }
        
        // Cancelar queries para evitar race conditions
        await queryClient.cancelQueries({ queryKey: ['tickets', ticket.id] });
        queryClient.setQueryData(['tickets', ticket.id], optimisticTicket);
        
        // ✅ NUEVO: Actualizar contadores del sidebar INSTANTÁNEAMENTE
        const currentUser = await getCurrentUser();
        if (currentUser?.id) {
          // Solo actualizar contadores si el ticket estaba activo (no cerrado/resuelto)
          if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
            // Actualizar "All Tickets" counter
            const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
            queryClient.setQueryData(['ticketsCount', 'all'], Math.max(0, currentAllCount - 1));
            
            // Actualizar "My Tickets" counter si era asignado al usuario actual
            if (ticket.assignee_id === currentUser.id) {
              const currentMyCount = queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser.id]) || 0;
              queryClient.setQueryData(['ticketsCount', 'my', currentUser.id], Math.max(0, currentMyCount - 1));
            }
            
            // Actualizar contador del team si tiene team asignado
            if (ticket.team_id) {
              const agentTeamsKey = ['agentTeams', currentUser.id, currentUser.role];
              const currentAgentTeams = queryClient.getQueryData<Team[]>(agentTeamsKey) || [];
              
              const updatedAgentTeams = currentAgentTeams.map(team => {
                if (team.id === ticket.team_id) {
                  return {
                    ...team,
                    ticket_count: Math.max(0, (team.ticket_count || 0) - 1),
                  };
                }
                return team;
              });
              
              queryClient.setQueryData(agentTeamsKey, updatedAgentTeams);
            }
          }
        }
        
        return { previousTicket };
      },
      onSuccess: updatedTicketData => {
        // ✅ OPTIMIZACIÓN: NO invalidar nada - los sockets manejan la sincronización
        
        // ✅ FEEDBACK INMEDIATO: Toast antes de cerrar
        toast.success(`Ticket #${updatedTicketData.id} closed successfully.`);
        
        // ✅ CERRAR RÁPIDO: Sin delay, los sockets mantienen sincronización
        onClose();
      },
      onError: (error, _variables, context) => {
        toast.error(
          `Error closing ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        if (context?.previousTicket) {
          setTicket(context.previousTicket);
          queryClient.setQueryData(['tickets', ticket!.id], context.previousTicket);
          if (onTicketUpdate) {
            onTicketUpdate(context.previousTicket);
          }
          
          // ✅ NUEVO: Revertir contadores del sidebar en caso de error
          const revertCounters = async () => {
            const currentUser = await getCurrentUser();
            if (currentUser?.id && context?.previousTicket) {
              // Revertir "All Tickets" counter
              const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
              queryClient.setQueryData(['ticketsCount', 'all'], currentAllCount + 1);
              
              // Revertir "My Tickets" counter si era asignado al usuario actual
              if (context.previousTicket.assignee_id === currentUser.id) {
                const currentMyCount = queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser.id]) || 0;
                queryClient.setQueryData(['ticketsCount', 'my', currentUser.id], currentMyCount + 1);
              }
              
              // Revertir contador del team
              if (context.previousTicket.team_id) {
                const agentTeamsKey = ['agentTeams', currentUser.id, currentUser.role];
                const currentAgentTeams = queryClient.getQueryData<Team[]>(agentTeamsKey) || [];
                
                const revertedAgentTeams = currentAgentTeams.map(team => {
                  if (team.id === context.previousTicket!.team_id) {
                    return {
                      ...team,
                      ticket_count: (team.ticket_count || 0) + 1,
                    };
                  }
                  return team;
                });
                
                queryClient.setQueryData(agentTeamsKey, revertedAgentTeams);
              }
            }
          };
          revertCounters();
        }
      },
      onSettled: () => {
        setIsClosingTicket(false);
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
      return updateTicket(ticket.id, { status: 'Closed' });
    },
    onMutate: async () => {
      if (!ticket) return { previousTicket: null };
      
      // ✅ ULTRA RÁPIDO: Actualización optimista inmediata
      setIsResolvingTicket(true);
      const previousTicket = ticket;

      const optimisticTicket: ITicket = {
        ...previousTicket,
        status: 'Closed' as TicketStatus,
      };

      // Actualizar estado local inmediatamente
      setTicket(optimisticTicket);
      if (onTicketUpdate) {
        onTicketUpdate(optimisticTicket);
      }
      
      // Cancelar queries para evitar race conditions
      await queryClient.cancelQueries({ queryKey: ['tickets', ticket.id] });
      queryClient.setQueryData(['tickets', ticket.id], optimisticTicket);
      
      // ✅ NUEVO: Actualizar contadores del sidebar INSTANTÁNEAMENTE
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        // Solo actualizar contadores si el ticket estaba activo (no cerrado/resuelto)
        if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
          // Actualizar "All Tickets" counter
          const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
          queryClient.setQueryData(['ticketsCount', 'all'], Math.max(0, currentAllCount - 1));
          
          // Actualizar "My Tickets" counter si era asignado al usuario actual
          if (ticket.assignee_id === currentUser.id) {
            const currentMyCount = queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser.id]) || 0;
            queryClient.setQueryData(['ticketsCount', 'my', currentUser.id], Math.max(0, currentMyCount - 1));
          }
          
          // Actualizar contador del team si tiene team asignado
          if (ticket.team_id) {
            const agentTeamsKey = ['agentTeams', currentUser.id, currentUser.role];
            const currentAgentTeams = queryClient.getQueryData<Team[]>(agentTeamsKey) || [];
            
            const updatedAgentTeams = currentAgentTeams.map(team => {
              if (team.id === ticket.team_id) {
                return {
                  ...team,
                  ticket_count: Math.max(0, (team.ticket_count || 0) - 1),
                };
              }
              return team;
            });
            
            queryClient.setQueryData(agentTeamsKey, updatedAgentTeams);
          }
        }
      }
      
      return { previousTicket };
    },
    onSuccess: updatedTicketData => {
      // ✅ OPTIMIZACIÓN: NO invalidar nada - los sockets manejan la sincronización
      
      // ✅ FEEDBACK INMEDIATO: Toast antes de cerrar
      toast.success(`Ticket #${updatedTicketData.id} resolved successfully.`);
      
      // ✅ CERRAR RÁPIDO: Sin delay, los sockets mantienen sincronización
      onClose();
    },
    onError: (error, _variables, context) => {
      toast.error(
        `Error resolving ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (context?.previousTicket) {
        setTicket(context.previousTicket);
        queryClient.setQueryData(['tickets', ticket!.id], context.previousTicket);
        if (onTicketUpdate) {
          onTicketUpdate(context.previousTicket);
        }
        
                 // ✅ NUEVO: Revertir contadores del sidebar en caso de error
         const revertCounters = async () => {
           const currentUser = await getCurrentUser();
           if (currentUser?.id && context?.previousTicket) {
             // Revertir "All Tickets" counter
             const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
             queryClient.setQueryData(['ticketsCount', 'all'], currentAllCount + 1);
             
             // Revertir "My Tickets" counter si era asignado al usuario actual
             if (context.previousTicket.assignee_id === currentUser.id) {
               const currentMyCount = queryClient.getQueryData<number>(['ticketsCount', 'my', currentUser.id]) || 0;
               queryClient.setQueryData(['ticketsCount', 'my', currentUser.id], currentMyCount + 1);
             }
             
             // Revertir contador del team
             if (context.previousTicket.team_id) {
               const agentTeamsKey = ['agentTeams', currentUser.id, currentUser.role];
               const currentAgentTeams = queryClient.getQueryData<Team[]>(agentTeamsKey) || [];
               
               const revertedAgentTeams = currentAgentTeams.map(team => {
                 if (team.id === context.previousTicket!.team_id) {
                   return {
                     ...team,
                     ticket_count: (team.ticket_count || 0) + 1,
                   };
                 }
                 return team;
               });
               
               queryClient.setQueryData(agentTeamsKey, revertedAgentTeams);
             }
           }
         };
         revertCounters();
      }
    },
    onSettled: () => {
      setIsResolvingTicket(false);
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
            <TicketConversation
              ticket={ticket!}
              onTicketUpdate={updatedTicket => {
                // Update the ticket in state
                setTicket(updatedTicket);
                // Call the parent's onTicketUpdate callback if provided
                if (onTicketUpdate) {
                  onTicketUpdate(updatedTicket);
                }
              }}
            />
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
                  disabled={false}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
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
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned to</h3>
                <Select
                  value={ticket.assignee_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('assignee_id', value)}
                  disabled={isLoadingAgents}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
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
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Team</h3>
                <Select
                  value={ticket.team_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('team_id', value)}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder={isLoadingTeams ? 'Loading...' : 'Select team'} />
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
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={isLoadingCategories ? 'Loading...' : 'Select category'}
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
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Update</h3>
                <p className="text-sm">{formatRelativeTime(ticket.last_update)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                <p className="text-sm">{formatRelativeTime(ticket.created_at)}</p>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="default"
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
