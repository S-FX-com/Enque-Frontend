import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import type { IComment } from '@/typescript/comment';
import type { ITicket } from '@/typescript/ticket';
import { toast } from 'sonner';
import { devLog } from '@/lib/dev-logger';

interface CommentEventData {
  id: number;
  ticket_id: number;
  agent_id?: number;
  agent_name?: string;
  agent_email?: string;
  agent_avatar?: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  user_avatar?: string;
  content: string;
  is_private: boolean;
  created_at?: string;
  other_destinaries?: string;
  bcc_recipients?: string;
  to_recipients?: string;
  attachments?: Array<{
    id: number;
    file_name: string;
    content_type: string;
    file_size: number;
    download_url: string;
  }>;
}

/**
 * ⚡ OPTIMIZADO: Hook especializado para eventos de comentarios
 * Separado de use-socket.ts para mejorar mantenibilidad
 * Maneja la actualización optimista del cache y sincronización
 */
export function useCommentEvents(socket: Socket | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleCommentUpdated = (data: CommentEventData) => {
      devLog.log('💬 Comment updated/added:', data);

      // Log de recipients solo en desarrollo
      if (data.to_recipients) {
        devLog.log('📧 TO recipients received:', data.to_recipients);
      }
      if (data.other_destinaries) {
        devLog.log('📧 CC recipients received:', data.other_destinaries);
      }
      if (data.bcc_recipients) {
        devLog.log('📧 BCC recipients received:', data.bcc_recipients);
      }

      // 1️⃣ Actualizar cache optimísticamente - SOLO UNA VEZ
      queryClient.setQueryData(
        ['comments', data.ticket_id],
        (oldComments: IComment[] | undefined) => {
          if (!oldComments) {
            devLog.log(`🔄 No cached comments for ticket ${data.ticket_id}`);
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
                    avatar_url: data.user_avatar || '',
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
                    avatar_url: data.agent_avatar || '',
                    role: 'agent' as const,
                    is_active: true,
                    workspace_id: 0,
                    created_at: '',
                    updated_at: '',
                  }
                : null,
              ticket_id: data.ticket_id,
              workspace_id: 0,
              attachments:
                data.attachments?.map(att => ({
                  ...att,
                  created_at: new Date().toISOString(),
                })) || [],
              other_destinaries: data.other_destinaries || null,
              bcc_recipients: data.bcc_recipients || null,
              to_recipients: data.to_recipients || null,
            };

            return [newComment, ...oldComments];
          }

          return oldComments;
        }
      );

      // 2️⃣ Actualizar query HTML con datos completos - SOLO UNA VEZ
      queryClient.setQueryData(['ticketHtml', data.ticket_id], (oldHtmlContent: unknown) => {
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

        const existingContent = htmlContent.contents.find(
          content => parseInt(content.id) === data.id
        );

        if (!existingContent) {
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
            contents: [newContent, ...htmlContent.contents],
            total_items: (htmlContent.total_items || 0) + 1,
          };
        }

        return htmlContent;
      });

      // 3️⃣ Invalidar queries relacionadas - SIN REFETCH AUTOMÁTICO
      // Ya actualizamos el cache optimísticamente arriba, solo marcar como stale
      queryClient.invalidateQueries({
        queryKey: ['ticketHtml', data.ticket_id],
        refetchType: 'none', // No refetch, solo marca como stale
      });
      queryClient.invalidateQueries({
        queryKey: ['comments', data.ticket_id],
        refetchType: 'none', // No refetch, solo marca como stale
      });
      queryClient.invalidateQueries({
        queryKey: ['ticket', data.ticket_id],
        refetchType: 'none', // No refetch, solo marca como stale
      });

      // 4️⃣ Actualizar last_update del ticket en listas
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

      // Actualizar la query "my tickets" si existe
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

      // 5️⃣ Toast notification si es comentario de usuario
      if (!data.agent_id && data.user_name) {
        toast.info(`${data.user_name} commented on ticket #${data.ticket_id}`);
      }

      // 6️⃣ Disparar evento para sincronización de comentarios propios
      if (data.agent_id === user?.id) {
        window.dispatchEvent(
          new CustomEvent('commentSyncCompleted', {
            detail: { ticket_id: data.ticket_id, comment_id: data.id },
          })
        );
      }
    };

    socket.on('comment_updated', handleCommentUpdated);

    return () => {
      socket.off('comment_updated', handleCommentUpdated);
    };
  }, [socket, user?.id, queryClient]);
}
