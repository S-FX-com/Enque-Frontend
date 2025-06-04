'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Send,
  Mail,
  Clock,
  Loader2,
  MessageSquare,
  Search,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ITicket } from '@/typescript/ticket';
import { IComment } from '@/typescript/comment';
import { Agent } from '@/typescript/agent';
import { getAgentById } from '@/services/agent';
import {
  getCommentsByTaskId,
  createComment,
  CreateCommentPayload,
  CommentResponseData,
} from '@/services/comment';
import { ConversationMessageItem } from '@/components/conversation-message-item';
import { useAuth } from '@/hooks/use-auth';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadAttachments } from '@/services/attachmentService';
import { getEnabledGlobalSignature } from '@/services/global-signature';
import {
  getCannedReplies,
  CannedReply,
} from '@/services/canned-replies';

interface Props {
  ticket: ITicket;
  onTicketUpdate?: (updatedTicket: ITicket) => void;
}

export function TicketConversation({ ticket, onTicketUpdate }: Props) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const prevTicketIdRef = useRef<number | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);

  // Canned replies state
  const [cannedRepliesOpen, setCannedRepliesOpen] = useState(false);
  const [cannedSearchTerm, setCannedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
    isError: isCommentsError,
  } = useQuery<IComment[]>({
    queryKey: ['comments', ticket.id],
    queryFn: () => getCommentsByTaskId(ticket.id),
    enabled: !!ticket?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos - más tiempo para evitar refetch constante
    refetchInterval: 10000, // 10 segundos en lugar de 5
    refetchIntervalInBackground: false, // No refetch en background
    refetchOnWindowFocus: false, // No refetch al volver a la ventana
  });

  const currentAgentId = currentUser?.id;
  const { data: currentAgentData } = useQuery<Agent>({
    queryKey: ['agent', currentAgentId],
    queryFn: () => getAgentById(currentAgentId!),
    enabled: !!currentAgentId,
    staleTime: 5 * 60 * 1000,
  });

  const workspaceId = currentUser?.workspace_id;
  const { data: globalSignatureData } = useQuery({
    queryKey: ['globalSignature', workspaceId, 'enabled'],
    queryFn: () => getEnabledGlobalSignature(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch canned replies
  const { data: cannedReplies = [], isLoading: isLoadingCannedReplies } = useQuery<CannedReply[]>({
    queryKey: ['cannedReplies', workspaceId],
    queryFn: () => getCannedReplies(workspaceId!, { enabledOnly: true }),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  // Filter canned replies based on search
  const filteredCannedReplies = React.useMemo(() => {
    let filtered = cannedReplies;

    // Filter by search term
    if (cannedSearchTerm) {
      const searchLower = cannedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        reply =>
          reply.name.toLowerCase().includes(searchLower) ||
          reply.content.toLowerCase().includes(searchLower) ||
          (reply.description && reply.description.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [cannedReplies, cannedSearchTerm]);

  // Get unique categories - now empty since we don't use categories anymore
  const categories = React.useMemo(() => {
    return [];
  }, []);

  // --- Combine initial message and comments ---
  const conversationItems = React.useMemo(() => {
    const items: IComment[] = [...comments];

    let initialMessageContent: string | null | undefined = null;
    let initialMessageSender: IComment['user'] = null;

    if (ticket.description) {
      initialMessageContent = ticket.description;
      initialMessageSender = ticket.user;
    } else if (ticket.body?.email_body) {
      initialMessageContent = ticket.body.email_body;
      initialMessageSender = ticket.user;
    }

    if (initialMessageContent && ticket.created_at) {
      const initialComment: IComment = {
        id: -1,
        content: initialMessageContent,
        created_at: ticket.created_at,
        updated_at: ticket.created_at,
        user: initialMessageSender,
        agent: null,
        ticket_id: ticket.id,
        workspace_id: ticket.workspace_id,
        is_private: false,
      };
      items.push(initialComment);
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return items;
  }, [comments, ticket]);

  // Precarga inteligente de contenido S3 - cargar múltiples comentarios en paralelo
  useEffect(() => {
    if (comments.length > 0) {
      // Encontrar todos los comentarios S3 que necesiten contenido
      const s3Comments = comments.filter(comment => 
        comment.s3_html_url && comment.content?.startsWith('[MIGRATED_TO_S3]')
      );
      
      if (s3Comments.length > 0) {
        // Precargar hasta 5 comentarios S3 en paralelo para mejor UX
        const commentsToPreload = s3Comments.slice(0, 5);
        
        // Precargar todos en paralelo con Promise.allSettled para que los fallos no afecten otros
        Promise.allSettled(
          commentsToPreload.map(async (comment) => {
            try {
              const { getCommentS3Content } = await import('@/services/comment');
              await getCommentS3Content(comment.id);
            } catch {
              // Silently fail individual loads
            }
          })
        );
      }
    }
  }, [comments.length, comments]); // Agregar 'comments' para satisfacer el hook de dependencias

  useEffect(() => {
    let signatureToUse = '';

    if (globalSignatureData?.content) {
      signatureToUse = globalSignatureData.content
        .replace(/\[Agent Name\]/g, currentAgentData?.name || '')
        .replace(/\[Agent Role\]/g, currentAgentData?.job_title || '-');
    } else if (currentAgentData?.email_signature) {
      signatureToUse = currentAgentData.email_signature;
    }

    if (signatureToUse) {
      signatureToUse = signatureToUse
        .replace(/<\/strong><\/p>\s*<p>\s*<em>/g, '</strong><br><em>')
        .replace(/<\/em><\/p>\s*<p>\s*<em>/g, '</em><br><em>')
        .replace(/<\/strong><\/p>\s*<p>/g, '</strong><br>')
        .replace(/<\/em><\/p>\s*<p>/g, '</em><br>')
        .replace(/<\/p>\s*<p>\s*<strong>/g, '<br><strong>')
        .replace(/<\/p>\s*<p>\s*<em>/g, '<br><em>')
        .replace(/<\/p>\s*<p>/g, '<br>');

      // Forzar tamaño pequeño para imágenes en la firma
      signatureToUse = signatureToUse.replace(
        /<img([^>]*?)width="300"([^>]*?)height="200"([^>]*?)>/g,
        '<img$1width="120"$2height="75"$3style="width: 120px; height: 75px; max-width: 120px; max-height: 75px; object-fit: scale-down; border-radius: 4px;">'
      );
      
      // También manejar imágenes que puedan tener diferentes tamaños pero siguen siendo de la firma
      signatureToUse = signatureToUse.replace(
        /<img([^>]*?)style="[^"]*width:\s*auto[^"]*"([^>]*?)>/g,
        '<img$1style="width: 120px; height: 75px; max-width: 120px; max-height: 75px; object-fit: scale-down; border-radius: 4px;"$2>'
      );

      // Mejorar la separación visual de la firma con espaciado adicional
      signatureToUse = `<div class="email-signature text-gray-500" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; clear: both;">${signatureToUse}</div>`;
    }

    const currentTicketId = ticket.id;
    const userName = ticket.user?.name || 'there';
    
    // Crear un contenedor para el contenido del mensaje con separación clara de la firma
    const greeting = `<p>Hi ${userName},</p><div class="message-content" style="min-height: 60px; margin-bottom: 16px;"><p><br></p></div>`;
    
    const prevTicketId = prevTicketIdRef.current;
    const initialContent = signatureToUse ? `${greeting}${signatureToUse}` : greeting;

    setReplyContent(initialContent);
    setEditorKey(prevKey => prevKey + 1);

    if (currentTicketId !== prevTicketId) {
      setIsPrivateNote(false);
    }
    prevTicketIdRef.current = currentTicketId;
  }, [ticket.id, ticket.user?.name, currentAgentData, globalSignatureData]);

  const handleAttachmentsChange = (files: File[]) => {
    setSelectedAttachments(files);
  };

  // Handle canned reply selection
  const handleCannedReplySelect = (cannedReply: CannedReply) => {
    // Replace placeholders in canned reply content
    let content = cannedReply.content;
    const userName = ticket.user?.name || 'there';
    const agentName = currentAgentData?.name || '';

    content = content
      .replace(/\[Customer Name\]/g, userName)
      .replace(/\[Agent Name\]/g, agentName)
      .replace(/\[Ticket ID\]/g, ticket.id.toString())
      .replace(/\[Ticket Title\]/g, ticket.title || '');

    // If it's a private note, just set the content without greeting or signature
    if (isPrivateNote) {
      setReplyContent(content);
    } else {
      // For regular replies, maintain the greeting and signature structure
      const greeting = `<p>Hi ${userName},</p><p><br></p>`;

      // Get signature
      let signatureToUse = '';
      if (globalSignatureData?.content) {
        signatureToUse = globalSignatureData.content
          .replace(/\[Agent Name\]/g, currentAgentData?.name || '')
          .replace(/\[Agent Role\]/g, currentAgentData?.job_title || '-');
      } else if (currentAgentData?.email_signature) {
        signatureToUse = currentAgentData.email_signature;
      }

      if (signatureToUse) {
        signatureToUse = signatureToUse
          .replace(/<\/strong><\/p>\s*<p>\s*<em>/g, '</strong><br><em>')
          .replace(/<\/em><\/p>\s*<p>\s*<em>/g, '</em><br><em>')
          .replace(/<\/strong><\/p>\s*<p>/g, '</strong><br>')
          .replace(/<\/em><\/p>\s*<p>/g, '</em><br>')
          .replace(/<\/p>\s*<p>\s*<strong>/g, '<br><strong>')
          .replace(/<\/p>\s*<p>\s*<em>/g, '<br><em>')
          .replace(/<\/p>\s*<p>/g, '<br>');

        signatureToUse = `<div class="email-signature text-gray-500">${signatureToUse}</div>`;
      }

      const fullContent = signatureToUse
        ? `${greeting}${content}<p><br></p>${signatureToUse}`
        : `${greeting}${content}`;

      setReplyContent(fullContent);
    }

    setCannedRepliesOpen(false);
    setCannedSearchTerm('');
    setSelectedCategory('');
    setEditorKey(prev => prev + 1);
  };

  const sendComment = async (content: string, isPrivate: boolean): Promise<CommentResponseData> => {
    if (!currentUser) {
      toast.error('Authentication error. User not found.');
      throw new Error('Authentication error. User not found.');
    }

    let attachmentIds: number[] = [];

    if (selectedAttachments && selectedAttachments.length > 0) {
      try {
        const uploaded = await uploadAttachments(selectedAttachments);
        attachmentIds = uploaded.map(file => file.id);
        console.log(`Successfully uploaded attachments: ${attachmentIds}`);
      } catch (error) {
        console.error('Error uploading attachments:', error);
        toast.error('Failed to upload attachments');
        throw new Error('Failed to upload attachments');
      }
    }

    const payload: CreateCommentPayload = {
      content,
      ticket_id: ticket.id,
      agent_id: currentUser.id,
      workspace_id: currentUser.workspace_id,
      is_private: isPrivate,
      attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
    };

    return createComment(ticket.id, payload);
  };

  const createCommentMutation = useMutation({
    mutationFn: () => sendComment(replyContent, isPrivateNote),
    onMutate: async () => {
      // Cancelar queries salientes para evitar que sobrescriban nuestro update optimista
      await queryClient.cancelQueries({ queryKey: ['comments', ticket.id] });

      // Snapshot del estado anterior
      const previousComments = queryClient.getQueryData(['comments', ticket.id]);

      // Crear comentario optimista para mostrar inmediatamente
      const optimisticComment: IComment = {
        id: Date.now(), // ID temporal único
        content: replyContent,
        s3_html_url: null,
        is_private: isPrivateNote,
        ticket_id: ticket.id,
        workspace_id: currentUser?.workspace_id || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        agent: currentUser ? {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          is_active: true,
          workspace_id: currentUser.workspace_id,
          created_at: currentUser.created_at || '',
          updated_at: currentUser.updated_at || '',
        } : null,
        user: null,
        attachments: selectedAttachments ? selectedAttachments.map((file, index) => ({
          id: -(index + 1), // IDs temporales negativos
          file_name: file.name,
          content_type: file.type,
          file_size: file.size,
          size_text: `${(file.size / 1024).toFixed(1)} KB`,
          download_url: '',
          preview_url: null,
          is_image: file.type.startsWith('image/'),
          created_at: new Date().toISOString(),
        })) : [],
      };

      // Actualizar optimistamente el cache
      queryClient.setQueryData(['comments', ticket.id], (old: IComment[] | undefined) => {
        return [...(old || []), optimisticComment];
      });

      // Retornar contexto para rollback si es necesario
      return { previousComments };
    },
    onSuccess: (data: CommentResponseData) => {
      // Invalidar queries para obtener el comentario real del servidor
      queryClient.invalidateQueries({ queryKey: ['comments', ticket.id] });

      // Limpiar formulario
      setReplyContent('');
      setSelectedAttachments([]);
      setIsPrivateNote(false);
      setEditorKey(prev => prev + 1);

      toast.success('Reply sent successfully.');

      if (data.task && onTicketUpdate) {
        onTicketUpdate(data.task);

        queryClient.setQueryData(['ticket', ticket.id], data.task);
        queryClient.invalidateQueries({ queryKey: ['tickets'] });

        if (data.assignee_changed && currentUser) {
          toast.info(`You were automatically assigned to this ticket.`);
        }
      }
    },
    onError: (error, variables, context) => {
      // Rollback en caso de error
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', ticket.id], context.previousComments);
      }
      
      console.error('Failed to send reply:', error);
      toast.error(`Failed to send reply: ${error.message}`);
    },
  });

  const handleSendReply = () => {
    if (!replyContent.trim() || !ticket?.id || createCommentMutation.isPending) return;
    createCommentMutation.mutate();
  };

  const handlePrivateNoteChange = (checked: boolean) => {
    setIsPrivateNote(checked);
    if (checked) {
      setReplyContent('');
    }
  };

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
          {isLoadingComments && conversationItems.length === 0 && (
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

          {conversationItems.length === 0 && !isLoadingComments && !isCommentsError ? (
            <div className="text-center text-muted-foreground py-10">
              No conversation history found.
            </div>
          ) : (
            conversationItems.map(item => (
              <ConversationMessageItem
                key={item.id === -1 ? 'initial-message' : item.id}
                comment={item}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <RichTextEditor
            key={editorKey}
            content={replyContent}
            onChange={setReplyContent}
            placeholder={isPrivateNote ? 'Write a private note...' : 'Type your reply here...'}
            disabled={createCommentMutation.isPending}
            onAttachmentsChange={handleAttachmentsChange}
          />
          {createCommentMutation.isError && (
            <p className="text-xs text-red-500 pt-1">
              {createCommentMutation.error?.message || 'Failed to send reply.'}
            </p>
          )}

          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="private-note"
                  checked={isPrivateNote}
                  onCheckedChange={handlePrivateNoteChange}
                  disabled={createCommentMutation.isPending}
                />
                <Label htmlFor="private-note">Private Note</Label>
              </div>

              {/* Canned Replies Popover */}
              <Popover open={cannedRepliesOpen} onOpenChange={setCannedRepliesOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={createCommentMutation.isPending || isLoadingCannedReplies}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Templates
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-sm mb-3">Canned Replies</h3>

                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search templates..."
                        value={cannedSearchTerm}
                        onChange={e => setCannedSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>

                    {/* Category Filter */}
                    {categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant={selectedCategory === '' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedCategory('')}
                          className="h-6 text-xs"
                        >
                          All
                        </Button>
                        {categories.map(category => (
                          <Button
                            key={category}
                            variant={selectedCategory === category ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(category)}
                            className="h-6 text-xs"
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  <ScrollArea className="h-64">
                    <div className="p-2">
                      {isLoadingCannedReplies ? (
                        <div className="space-y-2">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : filteredCannedReplies.length === 0 ? (
                        <div className="text-center text-muted-foreground py-4 text-sm">
                          {cannedSearchTerm || selectedCategory
                            ? 'No templates match your search'
                            : 'No templates available'}
                        </div>
                      ) : (
                        filteredCannedReplies.map(reply => (
                          <div
                            key={reply.id}
                            className="p-3 hover:bg-accent rounded-lg cursor-pointer border mb-2"
                            onClick={() => handleCannedReplySelect(reply)}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="font-medium text-sm truncate flex-1">{reply.name}</h4>
                              <div className="flex items-center gap-1 ml-2">
                                {reply.usage_count > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {reply.usage_count}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {reply.description || reply.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={handleSendReply}
              disabled={
                !replyContent || replyContent === '<p></p>' || createCommentMutation.isPending
              }
            >
              {createCommentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
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
