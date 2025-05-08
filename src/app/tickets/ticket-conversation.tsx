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

interface Props {
  ticket: ITicket;
}

export function TicketConversation({ ticket }: Props) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const prevTicketIdRef = useRef<number | null>(null);
  const {
    data: comments = [],
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

  // --- Combine initial message and comments ---
  const conversationItems = React.useMemo(() => {
    const items: IComment[] = [...comments];

    let initialMessageContent: string | null | undefined = null;
    let initialMessageSender: IComment['user'] = null; // Esto es IUser | null

    if (ticket.description) {
      initialMessageContent = ticket.description;
      initialMessageSender = ticket.user;
    } else if (ticket.body?.email_body) {
      initialMessageContent = ticket.body.email_body;
      initialMessageSender = ticket.user;
    }

    // Modificación: Crear el mensaje inicial si hay contenido, incluso si initialMessageSender es null.
    if (initialMessageContent && ticket.created_at) {
      const initialComment: IComment = {
        id: -1,
        content: initialMessageContent,
        created_at: ticket.created_at,
        updated_at: ticket.created_at,
        user: initialMessageSender, // Puede ser null, ConversationMessageItem debería manejarlo
        agent: null,
        ticket_id: ticket.id,
        // Usar ticket.workspace_id de forma segura. Asumiendo que ITicket tiene workspace_id no nulo.
        // Si initialMessageSender existe, su workspace_id debería coincidir con ticket.workspace_id.
        workspace_id: ticket.workspace_id,
        is_private: false,
      };
      items.push(initialComment);
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return items;
  }, [comments, ticket]);

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

  const createCommentMutation = useMutation({
    mutationFn: (payload: CreateCommentPayload) => createComment(ticket.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ticket.id] });
      setReplyContent('');
      setIsPrivateNote(false);
      toast.success('Reply sent successfully.');
    },
    onError: error => {
      console.error('Failed to send reply:', error);
      toast.error(`Failed to send reply: ${error.message}`);
    },
  });

  const handleSendReply = () => {
    if (!replyContent.trim() || !ticket?.id || createCommentMutation.isPending) return;
    if (!currentUser) {
      toast.error('Authentication error. User not found.');
      return;
    }
    const payload: CreateCommentPayload = {
      content: replyContent,
      ticket_id: ticket.id,
      agent_id: currentUser.id,
      workspace_id: currentUser.workspace_id,
      is_private: isPrivateNote,
    };

    createCommentMutation.mutate(payload);
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
          {/* Render based on loading/error state first */}
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

          {/* Render conversation items if not loading and no error */}
          {!isLoadingComments &&
            !isCommentsError &&
            (conversationItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                No conversation history found.
              </div>
            ) : (
              conversationItems.map(item => (
                // Use item.id for real comments, and a stable key for the initial message
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
            disabled={createCommentMutation.isPending}
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
                disabled={createCommentMutation.isPending}
              />
              <Label htmlFor="private-note">Private Note</Label>
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
