import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { ITicket } from '@/typescript/ticket';
import { toast } from 'sonner';
import { devLog } from '@/lib/dev-logger';

// Type extension para campos adicionales del socket
type TicketEventData = ITicket & {
  was_merged_target?: boolean;
  invalidate_html_cache?: boolean;
};

/**
 * ⚡ OPTIMIZADO: Hook especializado para eventos de tickets
 * Separado de use-socket.ts para mejorar mantenibilidad
 */
export function useTicketEvents(socket: Socket | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleNewTicket = (data: ITicket) => {
      devLog.log('🎫 New ticket created:', data);

      // ⚡ OPTIMIZADO: Agregar directamente a las páginas infinitas en lugar de invalidar
      // Esto evita refetch y mejora el rendimiento significativamente

      // Actualizar query global ['tickets']
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets'],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;

          // Agregar al inicio de la primera página
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[0] = [data, ...newPages[0]];
          } else {
            newPages[0] = [data];
          }

          return { ...oldData, pages: newPages };
        }
      );

      // Actualizar query de "My Tickets" si el ticket está asignado al usuario
      if (user?.id && data.assignee_id === user.id) {
        queryClient.setQueryData<InfiniteData<ITicket[], number>>(
          ['tickets', 'my', user.id],
          (oldData: InfiniteData<ITicket[], number> | undefined) => {
            if (!oldData) return oldData;

            const newPages = [...oldData.pages];
            if (newPages.length > 0) {
              newPages[0] = [data, ...newPages[0]];
            } else {
              newPages[0] = [data];
            }

            return { ...oldData, pages: newPages };
          }
        );
      }

      // Invalidar contadores (queries pequeñas)
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'my'] });
      // ⚡ IMPORTANTE: Invalidar contadores del sidebar para que se actualicen
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });

      toast.info(`New ticket created: ${data.title}`);
    };

    const handleTicketUpdated = (data: TicketEventData) => {
      devLog.log('📝 Ticket updated:', data);

      if (data.was_merged_target || data.invalidate_html_cache) {
        devLog.log(`Ticket ${data.id} was merge target - invalidating HTML cache`);
        queryClient.removeQueries({ queryKey: ['ticketHtml', data.id] });
        queryClient.invalidateQueries({ queryKey: ['ticketHtml', data.id] });
        queryClient.invalidateQueries({ queryKey: ['comments', data.id] });
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['ticketHtml', data.id] });
        }, 100);
      }

      // @ts-expect-error - status puede ser 'Resolved' aunque no esté en el tipo
      if (data.status === 'Closed' || data.status === 'Resolved') {
        queryClient.setQueryData(['tickets', data.id], (oldTicket: ITicket | undefined) =>
          oldTicket ? { ...oldTicket, ...data } : (data as ITicket)
        );

        const updateCountersOptimistically = () => {
          if (oldTicket && user?.id && oldTicket.status !== 'Closed') {
            const currentAllCount = queryClient.getQueryData<number>(['ticketsCount', 'all']) || 0;
            queryClient.setQueryData(['ticketsCount', 'all'], Math.max(0, currentAllCount - 1));

            if (oldTicket.assignee_id === user.id) {
              const currentMyCount =
                queryClient.getQueryData<number>(['ticketsCount', 'my', user.id]) || 0;
              queryClient.setQueryData(
                ['ticketsCount', 'my', user.id],
                Math.max(0, currentMyCount - 1)
              );
            }

            if (oldTicket.team_id) {
              const agentTeamsKey = ['agentTeams', user.id, user.role];
              const currentAgentTeams =
                queryClient.getQueryData<{ id: number; ticket_count?: number }[]>(agentTeamsKey) ||
                [];

              const updatedAgentTeams = currentAgentTeams.map(team => {
                if (team.id === oldTicket.team_id) {
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
        };

        const oldTicket = queryClient.getQueryData<ITicket>(['tickets', data.id]);
        if (oldTicket) {
          updateCountersOptimistically();
        }
      } else {
        queryClient.setQueryData(['tickets', data.id], (oldTicket: ITicket | undefined) =>
          oldTicket ? { ...oldTicket, ...data } : (data as ITicket)
        );
      }

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets'],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((ticket: ITicket) => (ticket.id === data.id ? { ...ticket, ...data } : ticket))
          );

          return { ...oldData, pages: newPages };
        }
      );

      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets', 'my', user?.id],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((ticket: ITicket) => (ticket.id === data.id ? { ...ticket, ...data } : ticket))
          );

          return { ...oldData, pages: newPages };
        }
      );

      // ⚡ IMPORTANTE: Si el ticket cambió de team o estado, invalidar contadores del sidebar
      if (data.team_id || data.status) {
        queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
      }
    };

    const handleTicketDeleted = (data: { id: number }) => {
      devLog.log('🗑️ Ticket deleted:', data);

      // Remover queries individuales del ticket
      queryClient.removeQueries({ queryKey: ['ticket', data.id] });
      queryClient.removeQueries({ queryKey: ['ticketHtml', data.id] });
      queryClient.removeQueries({ queryKey: ['comments', data.id] });

      // ⚡ OPTIMIZADO: Remover directamente de las páginas infinitas en lugar de invalidar
      // Actualizar query global ['tickets']
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets'],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.filter((ticket: ITicket) => ticket.id !== data.id)
          );

          return { ...oldData, pages: newPages };
        }
      );

      // Actualizar query de "My Tickets"
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets', 'my', user?.id],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.filter((ticket: ITicket) => ticket.id !== data.id)
          );

          return { ...oldData, pages: newPages };
        }
      );

      // Invalidar contadores
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
      // ⚡ IMPORTANTE: Invalidar contadores del sidebar para que se actualicen
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
    };

    socket.on('new_ticket', handleNewTicket);
    socket.on('ticket_updated', handleTicketUpdated);
    socket.on('ticket_deleted', handleTicketDeleted);

    return () => {
      socket.off('new_ticket', handleNewTicket);
      socket.off('ticket_updated', handleTicketUpdated);
      socket.off('ticket_deleted', handleTicketDeleted);
    };
  }, [socket, user?.id, user?.role, queryClient]);
}
