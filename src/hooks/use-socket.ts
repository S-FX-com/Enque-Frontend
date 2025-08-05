import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { ITicket } from '@/typescript/ticket';
import type { IComment } from '@/typescript/comment';
import { toast } from 'sonner';

interface TeamData {
  id: number;
  name: string;
  workspace_id: number;
}

interface SocketEvents {
  connected: (data: { status: string; workspace_id: number; message: string }) => void;
  new_ticket: (ticket: ITicket) => void;
  ticket_updated: (ticket: ITicket) => void;
  ticket_deleted: (data: { ticket_id: number }) => void;
  comment_updated: (data: {
    id: number;
    ticket_id: number;
    agent_id?: number;
    agent_name?: string;
    agent_email?: string;
    user_id?: number;
    user_name?: string;
    user_email?: string;
    content: string;
    is_private: boolean;
    created_at?: string;
    attachments?: Array<{
      id: number;
      file_name: string;
      content_type: string;
      file_size: number;
      download_url: string;
    }>;
  }) => void;
  team_updated: (team: TeamData) => void;
  error: (error: { message: string }) => void;
}

export function useSocket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.workspace_id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const SOCKET_URL =
      process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

    const socket = io(SOCKET_URL, {
      auth: {
        workspace_id: user.workspace_id,
      },
      query: {
        workspace_id: user.workspace_id.toString(),
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: false,
      autoConnect: true,
      upgrade: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      socket.emit('ping', { message: 'testing connection' });
    });

    socket.on('connected', () => {
      toast.success('Actualizaciones en tiempo real activadas');
    });

    socket.on('new_ticket', data => {
      console.log('🎫 New ticket created:', data);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'my'] });
      toast.info(`New ticket created: ${data.title}`);
    });

    socket.on('ticket_updated', data => {
      console.log('📝 Ticket updated:', data);

      if (data.was_merged_target || data.invalidate_html_cache) {
        console.log(`Ticket ${data.id} was merge target - invalidating HTML cache`);
        queryClient.removeQueries({ queryKey: ['ticketHtml', data.id] });
        queryClient.invalidateQueries({ queryKey: ['ticketHtml', data.id] });
        queryClient.invalidateQueries({ queryKey: ['comments', data.id] });
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['ticketHtml', data.id] });
        }, 100);
      }

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
    });

    socket.on('ticket_deleted', data => {
      console.log('🗑️ Ticket deleted:', data);
      queryClient.removeQueries({ queryKey: ['ticket', data.id] });
      queryClient.removeQueries({ queryKey: ['ticketHtml', data.id] });
      queryClient.removeQueries({ queryKey: ['comments', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticketsCount'] });
    });

    socket.on('comment_updated', data => {
      console.log('💬 Comment updated/added:', data);

      queryClient.setQueryData(
        ['comments', data.ticket_id],
        (oldComments: IComment[] | undefined) => {
          if (!oldComments) {
            console.log(`🔄 No cached comments for ticket ${data.ticket_id}, invalidating queries`);
            queryClient.invalidateQueries({ queryKey: ['comments', data.ticket_id] });
            queryClient.invalidateQueries({ queryKey: ['ticketHtml', data.ticket_id] });
            return [];
          }

          const existingComment = oldComments.find(comment => comment.id === data.id);
          if (!existingComment) {
            const isUserReply = data.user_name && !data.agent_id;

            const newComment: IComment = {
              id: data.id,
              content: data.content,
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.created_at || new Date().toISOString(),
              is_private: data.is_private,
              user: isUserReply
                ? {
                    id: data.user_id || 0,
                    name: data.user_name || 'User',
                    email: data.user_email || '',
                    avatar_url: data.user_avatar,
                    workspace_id: 0,
                    created_at: '',
                    updated_at: '',
                  }
                : null,
              agent: data.agent_id
                ? {
                    id: data.agent_id,
                    name: data.agent_name || 'Agent',
                    email: data.agent_email || '',
                    avatar_url: data.agent_avatar,
                    role: 'agent' as const,
                    is_active: true,
                    workspace_id: 0,
                    created_at: '',
                    updated_at: '',
                  }
                : null,
              ticket_id: data.ticket_id,
              workspace_id: 0,
              attachments: data.attachments || [],
            };

            return [newComment, ...oldComments];
          }

          return oldComments;
        }
      );

      // Hacer lo mismo para la query HTML con datos completos
      queryClient.setQueryData(['ticketHtml', data.ticket_id], (oldHtmlContent: unknown) => {
        // Tipar el contenido HTML
        const htmlContent = oldHtmlContent as {
          contents?: Array<{
            id: string;
            content: string;
            created_at: string;
            sender?: { name?: string; email?: string; type?: string };
            attachments?: unknown[];
            is_private?: boolean;
          }>;
          total_items?: number;
        };

        if (!htmlContent?.contents) return htmlContent;

        // Verificar si el contenido ya existe para evitar duplicados
        const existingContent = htmlContent.contents.find(
          content => parseInt(content.id) === data.id
        );

        if (!existingContent) {
          // 🔧 CORREGIDO: Detectar correctamente si es usuario o agente
          const isUserReply = data.user_name && !data.agent_id;

          const newContent = {
            id: data.id.toString(),
            content: data.content,
            created_at: data.created_at || new Date().toISOString(),
            sender: {
              name: isUserReply ? data.user_name : data.agent_name || 'Agent',
              email: isUserReply ? data.user_email || '' : data.agent_email || '',
              type: isUserReply ? 'user' : 'agent',
            },
            attachments: data.attachments || [],
            is_private: data.is_private,
          };

          return {
            ...htmlContent,
            contents: [newContent, ...htmlContent.contents], // ✅ Agregar al inicio (más reciente)
            total_items: (htmlContent.total_items || 0) + 1,
          };
        }

        return htmlContent;
      });

      // Invalidar datos para mantener sincronización
      queryClient.invalidateQueries({ queryKey: ['ticketHtml', data.ticket_id] });
      queryClient.invalidateQueries({ queryKey: ['comments', data.ticket_id] });

      // Invalidar el ticket en sí (por si cambió status, etc.)
      queryClient.invalidateQueries({ queryKey: ['ticket', data.ticket_id] });

      // ✅ OPTIMIZACIÓN: Solo actualizar last_update del ticket en lugar de invalidar toda la lista
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets'],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((ticket: ITicket) =>
              ticket.id === data.ticket_id
                ? { ...ticket, last_update: new Date().toISOString() }
                : ticket
            )
          );

          return { ...oldData, pages: newPages };
        }
      );

      // También actualizar la query "my tickets" si existe
      queryClient.setQueryData<InfiniteData<ITicket[], number>>(
        ['tickets', 'my', user?.id],
        (oldData: InfiniteData<ITicket[], number> | undefined) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((ticket: ITicket) =>
              ticket.id === data.ticket_id
                ? { ...ticket, last_update: new Date().toISOString() }
                : ticket
            )
          );

          return { ...oldData, pages: newPages };
        }
      );

      // Mostrar notificación si no es del usuario actual
      if (data.agent_id !== user?.id) {
        const senderName = data.agent_name || data.user_name || 'Someone';
        toast.info(`${senderName} added a comment to ticket #${data.ticket_id}`);
      }
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['comments', data.ticket_id] });
        queryClient.invalidateQueries({ queryKey: ['ticketHtml', data.ticket_id] });
        console.log(`🔄 Backup invalidation triggered for ticket ${data.ticket_id}`);
      }, 500);

      // ✅ RÁPIDO: Resetear botón inmediatamente cuando llega nuestro comentario
      if (data.agent_id === user?.id) {
        // Es nuestro propio comentario, disparar evento inmediatamente
        window.dispatchEvent(
          new CustomEvent('commentSyncCompleted', {
            detail: { ticket_id: data.ticket_id, comment_id: data.id },
          })
        );
      }
    });

    socket.on('team_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
      queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
    });

    socket.on('error', (error: { message: string }) => {
      setConnectionError(error.message);
      toast.error(`Error de conexión: ${error.message}`);
    });

    socket.on('disconnect', reason => {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            socket.connect();
          }
        }, 1000);
      }
    });

    socket.on('connect_error', error => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      setConnectionError(null);
      toast.success('Conexión restaurada');
    });

    socket.on('reconnect_error', error => {
      setConnectionError(error.message);
    });

    socket.on('pong', () => {});

    return () => {
      if (socket && socket.connected) {
        socket.removeAllListeners();
      }
    };
  }, [user?.workspace_id, user?.id, user?.role, queryClient]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, []);

  const emit = <T extends keyof SocketEvents>(event: T, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket no conectado, no se puede emitir:', event);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
  };
}
