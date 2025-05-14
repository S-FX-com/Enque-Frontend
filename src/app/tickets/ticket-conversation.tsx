'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Send, Mail, Loader2 } from 'lucide-react';
import { ITicket } from '@/typescript/ticket';
import { IComment } from '@/typescript/comment';
import { Agent } from '@/typescript/agent';
import { getAgentById } from '@/services/agent';
import { getCommentsByTaskId, createComment, CreateCommentPayload } from '@/services/comment';
import { ConversationMessageItem } from '@/components/conversation-message-item';
import { useAuth } from '@/hooks/use-auth';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadAttachments } from '@/services/attachmentService';

interface Props {
  ticket: ITicket;
}

export function TicketConversation({ ticket }: Props) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [replyContent, setReplyContent] = useState<string>('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const prevTicketIdRef = useRef<number | null>(null);
  const [currentAttachments, setCurrentAttachments] = useState<File[]>([]);
  const {
    data: rawComments = [],
    isLoading: isLoadingComments,
    error: commentsError,
    isError: isCommentsError,
  } = useQuery<IComment[]>({
    queryKey: ['comments', ticket.id],
    queryFn: () => getCommentsByTaskId(ticket.id),
    enabled: !!ticket?.id,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  });
  const currentAgentId = currentUser?.id;
  const { data: currentAgentData } = useQuery<Agent>({
    queryKey: ['agent', currentAgentId],
    queryFn: () => getAgentById(currentAgentId!),
    enabled: !!currentAgentId,
    staleTime: 5 * 60 * 1000,
  });

  const conversationItems = React.useMemo(() => {
    console.log('[CONV_ITEMS_DEBUG] Recalculating conversationItems. Ticket ID:', ticket.id);
    console.log('[CONV_ITEMS_DEBUG] Raw comments from API:', JSON.stringify(rawComments, null, 2));

    let potentialInitialComment: IComment | null = null;
    let attachmentsFromPlaceholder: IComment['attachments'] = [];
    const otherComments: IComment[] = [];

    const placeholderComment = rawComments.find(
      comment =>
        comment.is_private &&
        comment.agent?.email === 'admin@example.com' &&
        comment.content?.startsWith('Correo original contenía') &&
        comment.content?.endsWith('adjunto(s).')
    );
    console.log(
      '[CONV_ITEMS_DEBUG] Placeholder comment found by find():',
      JSON.stringify(placeholderComment, null, 2)
    );

    if (placeholderComment?.attachments && placeholderComment.attachments.length > 0) {
      attachmentsFromPlaceholder = placeholderComment.attachments;
    }
    console.log(
      '[CONV_ITEMS_DEBUG] Attachments extracted from placeholder:',
      JSON.stringify(attachmentsFromPlaceholder, null, 2)
    );

    rawComments.forEach(comment => {
      if (comment.id !== placeholderComment?.id) {
        otherComments.push(comment);
      }
    });
    console.log(
      '[CONV_ITEMS_DEBUG] Other comments (after filtering placeholder, if found):',
      JSON.stringify(otherComments, null, 2)
    );

    let initialMessageContent: string | null | undefined = null;
    let initialMessageSender: IComment['user'] = null;

    if (ticket.description) {
      initialMessageContent = ticket.description;
      initialMessageSender = ticket.user;
    } else if (ticket.body?.email_body) {
      initialMessageContent = ticket.body.email_body;
      initialMessageSender = ticket.user;
    }
    console.log(
      '[CONV_ITEMS_DEBUG] Initial message content for ticket:',
      initialMessageContent ? initialMessageContent.substring(0, 100) + '...' : 'null'
    );

    if (initialMessageContent && ticket.created_at) {
      potentialInitialComment = {
        id: -1,
        content: initialMessageContent,
        created_at: ticket.created_at,
        updated_at: ticket.created_at,
        user: initialMessageSender,
        agent: null,
        ticket_id: ticket.id,
        workspace_id: ticket.workspace_id,
        is_private: false,
        attachments: attachmentsFromPlaceholder,
      };
    }
    console.log(
      '[CONV_ITEMS_DEBUG] Potential initial comment (with attachments merged):',
      JSON.stringify(potentialInitialComment, null, 2)
    );

    const finalCombinedItems: IComment[] = [...otherComments];
    if (potentialInitialComment) {
      finalCombinedItems.push(potentialInitialComment);
    }
    console.log(
      '[CONV_ITEMS_DEBUG] Final combined items (before sort):',
      finalCombinedItems.map(c => ({
        id: c.id,
        content: c.content ? c.content.substring(0, 50) + '...' : '',
        attachments: c.attachments?.length,
        user: c.user?.email,
        agent: c.agent?.email,
        is_private: c.is_private,
      }))
    );

    // La ordenación para `displayItems` se hace después, así que aquí el orden no es el final visible.
    // Para depuración, podemos ver el orden aquí.
    // finalCombinedItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return finalCombinedItems;
  }, [rawComments, ticket]);

  useEffect(() => {
    const currentSignature = currentAgentData?.email_signature || '';
    const currentTicketId = ticket.id;
    const userName = ticket.user?.name || 'there';
    const greeting = `<p>Hi ${userName},</p><p><br></p>`;
    const prevTicketId = prevTicketIdRef.current;
    const initialContent = currentSignature ? `${greeting}${currentSignature}` : greeting;

    console.log(
      `[TicketConversation Effect] Running. Ticket: ${currentTicketId}, Prev Ticket: ${prevTicketId}, Signature available: ${!!currentSignature}`
    );
    setReplyContent(initialContent);
    setEditorKey(prevKey => prevKey + 1);

    if (currentTicketId !== prevTicketId) {
      console.log('  Ticket ID changed. Resetting private note switch.');
      setIsPrivateNote(false);
    }
    prevTicketIdRef.current = currentTicketId;
  }, [ticket.id, ticket.user?.name, currentAgentData?.email_signature]);

  const uploadAttachmentsMutation = useMutation({
    mutationFn: uploadAttachments,
    onError: error => {
      console.error('Failed to upload attachments:', error);
      toast.error(`Failed to upload attachments: ${error.message}`);
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (payload: CreateCommentPayload) => createComment(ticket.id, payload),
    onMutate: async newCommentPayload => {
      // Cancelar consultas en vuelo para evitar sobrescrituras
      await queryClient.cancelQueries({ queryKey: ['comments', ticket.id] });

      // Guardar el estado previo de los comentarios
      const previousComments = queryClient.getQueryData<IComment[]>(['comments', ticket.id]);

      // Crear un comentario optimista para mostrar inmediatamente
      const optimisticComment: IComment = {
        id: Date.now(), // ID temporal único
        content: newCommentPayload.content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ticket_id: ticket.id,
        workspace_id: currentUser?.workspace_id || 0,
        is_private: newCommentPayload.is_private || false,
        agent: currentUser
          ? {
              id: currentUser.id,
              name: currentUser.name,
              email: currentUser.email,
              role:
                currentUser.role === 'manager' ? 'admin' : (currentUser.role as 'admin' | 'agent'),
              is_active: true,
              workspace_id: currentUser.workspace_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          : null,
        attachments:
          currentAttachments.length > 0
            ? currentAttachments.map(file => ({
                id: -Date.now() - Math.floor(Math.random() * 1000), // ID negativo temporal
                file_name: file.name,
                content_type: file.type,
                file_size: file.size,
                created_at: new Date().toISOString(),
                download_url: URL.createObjectURL(file), // URL temporal para previsualización
              }))
            : [],
      };

      // Añadir optimísticamente el comentario a la caché
      queryClient.setQueryData<IComment[]>(['comments', ticket.id], old =>
        old ? [...old, optimisticComment] : [optimisticComment]
      );

      // Limpiar la UI inmediatamente
      setReplyContent('');
      setIsPrivateNote(false);
      setCurrentAttachments([]);

      // Devuelve el contexto que será pasado a onError y onSettled
      return { previousComments, optimisticComment };
    },
    onError: (err, variables, context) => {
      // Si hay un error, revertir a los comentarios previos
      if (context?.previousComments) {
        queryClient.setQueryData<IComment[]>(['comments', ticket.id], context.previousComments);
      }
      console.error('Failed to send reply:', err);
      toast.error(`Failed to send reply: ${err.message}`);
    },
    onSuccess: () => {
      // Actualizar silenciosamente los datos reales
      queryClient.invalidateQueries({ queryKey: ['comments', ticket.id] });
      toast.success('Reply sent successfully.');
    },
    onSettled: () => {
      // En cualquier caso, invalidar consultas para asegurar datos frescos
      queryClient.invalidateQueries({ queryKey: ['comments', ticket.id] });
    },
  });

  const handleSendReply = async () => {
    if (!replyContent.trim() || !ticket?.id || createCommentMutation.isPending) return;
    if (!currentUser) {
      toast.error('Authentication error. User not found.');
      return;
    }

    let attachmentIds: number[] = [];
    if (currentAttachments.length > 0) {
      try {
        const uploadedAttachments = await uploadAttachmentsMutation.mutateAsync(currentAttachments);

        attachmentIds = uploadedAttachments.map(att => att.id);

        // No mostrar ningún toast para el proceso de adjuntos
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        return;
      }
    }

    const payload: CreateCommentPayload = {
      content: replyContent,
      ticket_id: ticket.id,
      agent_id: currentUser.id,
      workspace_id: currentUser.workspace_id,
      is_private: isPrivateNote,
    };

    if (attachmentIds.length > 0) {
      payload.attachment_ids = attachmentIds;
    }

    createCommentMutation.mutate(payload);
  };

  const handlePrivateNoteChange = (checked: boolean) => {
    setIsPrivateNote(checked);
    if (checked) {
      setReplyContent('');
    }
  };

  const displayItems = React.useMemo(() => {
    const sortedItems = conversationItems
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    console.log(
      '[CONV_ITEMS_DEBUG] Display items (after final sort - newest first):',
      sortedItems.map(c => ({
        id: c.id,
        content: c.content ? c.content.substring(0, 50) + '...' : '',
        created_at: c.created_at,
        user: c.user?.name,
        agent: c.agent?.name,
      }))
    );
    return sortedItems;
  }, [conversationItems]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">#{ticket.id}</span>
            <span>- {ticket.title}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg">Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {isLoadingComments && (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {isCommentsError && !isLoadingComments && (
            <div className="text-center text-red-500 py-4">
              Failed to load conversation: {commentsError?.message || 'Unknown error'}
            </div>
          )}
          {!isLoadingComments &&
            !isCommentsError &&
            (displayItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No conversation history found.
              </div>
            ) : (
              displayItems.map(item => (
                <ConversationMessageItem
                  key={item.id === -1 ? 'initial-message' : item.id}
                  comment={item}
                />
              ))
            ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 space-y-3">
          <RichTextEditor
            key={editorKey}
            content={replyContent}
            onChange={setReplyContent}
            placeholder={isPrivateNote ? 'Write a private note...' : 'Type your reply here...'}
            disabled={createCommentMutation.isPending || uploadAttachmentsMutation.isPending}
            onAttachmentsChange={setCurrentAttachments}
          />
          {createCommentMutation.isError && (
            <p className="text-xs text-red-500 pt-1">
              {createCommentMutation.error?.message || 'Failed to send reply.'}
            </p>
          )}
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="private-note"
                checked={isPrivateNote}
                onCheckedChange={handlePrivateNoteChange}
                disabled={createCommentMutation.isPending || uploadAttachmentsMutation.isPending}
              />
              <Label htmlFor="private-note">Private Note</Label>
              {currentAttachments.length > 0 && (
                <span className="text-xs text-muted-foreground ml-4">
                  {currentAttachments.length} file(s) selected
                </span>
              )}
            </div>
            <Button
              onClick={handleSendReply}
              disabled={
                !replyContent ||
                replyContent === '<p></p>' ||
                createCommentMutation.isPending ||
                uploadAttachmentsMutation.isPending
              }
            >
              {createCommentMutation.isPending || uploadAttachmentsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadAttachmentsMutation.isPending ? 'Uploading...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Reply
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
