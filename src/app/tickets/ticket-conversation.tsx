'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Send, Mail, Clock, Loader2, MessageSquare, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ITicket } from '@/typescript/ticket';
import { IComment } from '@/typescript/comment';
import { Agent } from '@/typescript/agent';
import { getAgentById } from '@/services/agent';
import { getCommentsByTaskId, createComment } from '@/services/comment';
import { getTicketHtmlContent, TicketHtmlContent } from '@/services/ticket';
import { ConversationMessageItem } from '@/components/conversation-message-item';
import { InitialTicketMessage } from '@/components/conversation-message-item';
import { useAuth } from '@/hooks/use-auth';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadAttachments } from '@/services/attachmentService';
import { getEnabledGlobalSignature } from '@/services/global-signature';
import { getCannedReplies, CannedReply } from '@/services/canned-replies';
import { formatRelativeTime } from '@/lib/utils';
import BoringAvatar from 'boring-avatars';

interface Props {
  ticket: ITicket;
  onTicketUpdate?: (updatedTicket: ITicket) => void;
}

const AVATAR_COLORS = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];
const AGENT_AVATAR_COLORS = ['#1D73F4', '#D4E4FA'];

function findQuoteStartIndex(html: string): number {
  const patterns = [
    /On .*? wrote:/i,
    /From:.*?</i,
    /Sent from my /i,
    /<div class="gmail_quote/i,
    /<blockquote class="gmail_quote/i,
    /<blockquote/i,
    /<div class="gmail_attr"/i,
    /<hr\s*style=["'][^"']*border-top:\s*1px\s*solid\s*[^;]+;["']/i,
    /<hr/i,
    /---------- Forwarded message ---------/i,
    /Begin forwarded message:/i,
  ];

  return patterns.reduce((earliestIndex, pattern) => {
    const match = html.match(pattern);
    if (
      match?.index !== undefined &&
      (pattern.source !== '<hr/i' || match.index >= 10) &&
      (earliestIndex === -1 || match.index < earliestIndex)
    ) {
      return match.index;
    }
    return earliestIndex;
  }, -1);
}

const MessageItem = React.memo(
  ({ content, isInitial = false }: { content: TicketHtmlContent; isInitial?: boolean }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const senderInfo = React.useMemo(() => {
      const metadataMatch = content.content?.match(
        /<original-sender>(.*?)\|(.*?)<\/original-sender>/
      );
      if (metadataMatch) {
        return {
          name: metadataMatch[1].trim(),
          email: metadataMatch[2].trim(),
          isUserReply: true,
          type: 'user',
        };
      }

      const isAgentMessage = content.sender.type === 'agent';
      return {
        name: content.sender.name || (isAgentMessage ? 'Agent' : 'User'),
        email: content.sender.email || 'unknown',
        isUserReply: !isAgentMessage && !isInitial,
        type: isAgentMessage ? 'agent' : 'user',
      };
    }, [content.content, content.sender, isInitial]);

    const processedContent = React.useMemo(() => {
      let htmlContent = content.content || '';

      htmlContent = htmlContent
        .replace(/<original-sender>.*?<\/original-sender>/g, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/^\s*<html[^>]*>/gi, '')
        .replace(/<\/html>\s*$/gi, '')
        .replace(/^\s*<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/^\s*<body[^>]*>/gi, '')
        .replace(/<\/body>\s*$/gi, '')
        .replace(/<p>\s*<\/p>/gi, '<p><br></p>')
        .replace(/^\s*(?:<br\s*\/?>\s*)+/i, '')
        .replace(/(?:<br\s*\/?>\s*)+$/i, '')
        .trim();

      return htmlContent;
    }, [content.content]);

    const { displayReplyPart, displayQuotedPart, showToggleButton } = React.useMemo(() => {
      if (!senderInfo.isUserReply || !processedContent) {
        return {
          displayReplyPart: processedContent,
          displayQuotedPart: null,
          showToggleButton: false,
        };
      }

      const quoteStartIndex = findQuoteStartIndex(processedContent);
      if (quoteStartIndex === -1) {
        return {
          displayReplyPart: processedContent,
          displayQuotedPart: null,
          showToggleButton: false,
        };
      }

      const replyPart = processedContent.substring(0, quoteStartIndex);
      const quotedPart = processedContent.substring(quoteStartIndex);
      const shouldShowToggle = quotedPart.replace(/<[^>]*>/g, '').trim().length > 20;

      return {
        displayReplyPart: replyPart,
        displayQuotedPart: shouldShowToggle ? quotedPart : null,
        showToggleButton: shouldShowToggle,
      };
    }, [processedContent, senderInfo.isUserReply]);

    const avatarColors =
      isInitial || senderInfo.isUserReply || senderInfo.type === 'user'
        ? AVATAR_COLORS
        : AGENT_AVATAR_COLORS;

    const containerClasses = [
      'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 p-3 rounded-md',
      content.is_private ? 'bg-yellow-50 dark:bg-yellow-800/30' : '',
      senderInfo.type === 'agent' && !isInitial && !senderInfo.isUserReply
        ? 'bg-slate-50 dark:bg-slate-800/50'
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses}>
        <div className="flex-shrink-0">
          <BoringAvatar size={40} name={senderInfo.email} variant="beam" colors={avatarColors} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <p className="text-sm font-medium leading-none">
              {senderInfo.name}
              {content.is_private && (
                <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-400">
                  (Private Note)
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatRelativeTime(content.created_at)}
            </p>
          </div>

          <div className="max-w-none break-words overflow-x-auto">
            <div
              className="text-sm text-black dark:text-white prose dark:prose-invert max-w-none whitespace-pre-line prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline"
              dangerouslySetInnerHTML={{ __html: displayReplyPart || '' }}
            />

            {showToggleButton && (
              <div className="mt-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 p-1 rounded bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50"
                >
                  <span className="h-3 w-3 flex-shrink-0">⏷</span>
                  {isExpanded ? 'Show less' : 'Show quoted text'}
                </button>

                {isExpanded && displayQuotedPart && (
                  <div
                    className="mt-2 p-2 border-l-2 border-gray-200 dark:border-gray-700 text-muted-foreground text-sm"
                    dangerouslySetInnerHTML={{ __html: displayQuotedPart }}
                  />
                )}
              </div>
            )}
          </div>

          {content.attachments?.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Attachments:</p>
              <div className="flex flex-wrap gap-2">
                {content.attachments.map(attachment => (
                  <a
                    key={attachment.id}
                    href={attachment.download_url}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 {attachment.file_name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

export function TicketConversation({ ticket, onTicketUpdate }: Props) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const prevTicketIdRef = useRef<number | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [cannedRepliesOpen, setCannedRepliesOpen] = useState(false);
  const [cannedSearchTerm, setCannedSearchTerm] = useState('');

  const {
    data: htmlContent,
    isLoading: isLoadingHtmlContent,
    error: htmlContentError,
    isError: isHtmlContentError,
  } = useQuery({
    queryKey: ['ticketHtml', ticket.id],
    queryFn: () => getTicketHtmlContent(ticket.id),
    enabled: !!ticket?.id,
    staleTime: 60_000,
    refetchOnMount: 'always',
  });

  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
    isError: isCommentsError,
  } = useQuery<IComment[]>({
    queryKey: ['comments', ticket.id],
    queryFn: () => getCommentsByTaskId(ticket.id),
    enabled: !!ticket?.id && isHtmlContentError,
    staleTime: 300_000,
  });

  const { data: currentAgentData } = useQuery<Agent>({
    queryKey: ['agent', currentUser?.id],
    queryFn: () => getAgentById(currentUser!.id),
    enabled: !!currentUser?.id,
    staleTime: 600_000,
  });

  const { data: globalSignatureData } = useQuery({
    queryKey: ['globalSignature', currentUser?.workspace_id, 'enabled'],
    queryFn: () => getEnabledGlobalSignature(currentUser!.workspace_id),
    enabled: !!currentUser?.workspace_id,
    staleTime: 600_000,
  });

  const { data: cannedReplies = [], isLoading: isLoadingCannedReplies } = useQuery<CannedReply[]>({
    queryKey: ['cannedReplies', currentUser?.workspace_id],
    queryFn: () => getCannedReplies(currentUser!.workspace_id, { enabledOnly: true }),
    enabled: !!currentUser?.workspace_id,
    staleTime: 600_000,
  });

  const filteredCannedReplies = React.useMemo(() => {
    if (!cannedSearchTerm) return cannedReplies;
    const searchLower = cannedSearchTerm.toLowerCase();
    return cannedReplies.filter(
      reply =>
        reply.name.toLowerCase().includes(searchLower) ||
        reply.content.toLowerCase().includes(searchLower) ||
        reply.description?.toLowerCase().includes(searchLower)
    );
  }, [cannedReplies, cannedSearchTerm]);

  const conversationItems = React.useMemo(() => {
    if (htmlContent?.contents) {
      return {
        items: [...htmlContent.contents].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        isOptimized: true,
        hasInitialMessage: htmlContent.contents.some(item => item.id === 'initial'),
      };
    }

    const items: IComment[] = [...comments];
    const hasInitialMessage = ticket.description || ticket.body?.email_body;

    if (hasInitialMessage && !ticket.description?.startsWith('[MIGRATED_TO_S3]')) {
      items.push({
        id: -1,
        content: ticket.description || ticket.body!.email_body,
        created_at: ticket.created_at,
        updated_at: ticket.created_at,
        user: ticket.user,
        agent: null,
        ticket_id: ticket.id,
        workspace_id: ticket.workspace_id,
        is_private: false,
      });
    }

    return {
      items: items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      isOptimized: false,
      hasInitialMessage,
    };
  }, [htmlContent, comments, ticket]);

  const initializeReplyContent = useCallback(() => {
    let signatureToUse = '';

    if (globalSignatureData?.content) {
      signatureToUse = globalSignatureData.content
        .replace(/\[Agent Name\]/g, currentAgentData?.name || '')
        .replace(/\[Agent Role\]/g, currentAgentData?.job_title || '-');
    } else if (currentAgentData?.email_signature) {
      signatureToUse = currentAgentData.email_signature;
    }

    signatureToUse = signatureToUse
      .replace(/<\/strong><\/p>\s*<p>\s*<em>/g, '</strong><br><em>')
      .replace(/<\/em><\/p>\s*<p>\s*<em>/g, '</em><br><em>')
      .replace(/<\/strong><\/p>\s*<p>/g, '</strong><br>')
      .replace(/<\/em><\/p>\s*<p>/g, '</em><br>')
      .replace(/<\/p>\s*<p>\s*<strong>/g, '<br><strong>')
      .replace(/<\/p>\s*<p>\s*<em>/g, '<br><em>')
      .replace(/<\/p>\s*<p>/g, '<br>')
      .replace(
        /<img([^>]*?)width="300"([^>]*?)height="200"([^>]*?)>/g,
        '<img$1width="120"$2height="75"$3style="width: 120px; height: 75px; max-width: 120px; max-height: 75px; object-fit: scale-down; border-radius: 4px;">'
      );

    const userName = ticket.user?.name || 'there';
    const greeting = `<p>Hi ${userName},</p><div class="message-content" style="min-height: 60px; margin-bottom: 16px;"><p><br></p></div>`;
    const initialContent = signatureToUse
      ? `${greeting}<div class="email-signature text-gray-500" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; clear: both;">${signatureToUse}</div>`
      : greeting;

    setReplyContent(initialContent);
    setEditorKey(prev => prev + 1);
    setIsPrivateNote(false);
    prevTicketIdRef.current = ticket.id;
  }, [ticket.id, ticket.user?.name, currentAgentData, globalSignatureData]);

  useEffect(() => {
    if (prevTicketIdRef.current !== ticket.id) {
      initializeReplyContent();
    }
  }, [ticket.id, initializeReplyContent]);

  const handleCannedReplySelect = useCallback(
    (cannedReply: CannedReply) => {
      const userName = ticket.user?.name || 'there';
      const agentName = currentAgentData?.name || '';

      let content = cannedReply.content
        .replace(/\[Customer Name\]/g, userName)
        .replace(/\[Agent Name\]/g, agentName)
        .replace(/\[Ticket ID\]/g, ticket.id.toString())
        .replace(/\[Ticket Title\]/g, ticket.title || '');

      if (isPrivateNote) {
        setReplyContent(content);
      } else {
        const greeting = `<p>Hi ${userName},</p><p><br></p>`;
        let signatureToUse = '';

        if (globalSignatureData?.content) {
          signatureToUse = globalSignatureData.content
            .replace(/\[Agent Name\]/g, agentName)
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

        setReplyContent(
          signatureToUse
            ? `${greeting}${content}<p><br></p>${signatureToUse}`
            : `${greeting}${content}`
        );
      }

      setCannedRepliesOpen(false);
      setCannedSearchTerm('');
      setEditorKey(prev => prev + 1);
    },
    [isPrivateNote, ticket, currentAgentData, globalSignatureData]
  );

  const sendComment = useCallback(async () => {
    if (!currentUser) {
      toast.error('Authentication error. User not found.');
      throw new Error('Authentication error. User not found.');
    }

    let attachmentIds: number[] = [];
    if (selectedAttachments.length > 0) {
      try {
        const uploaded = await uploadAttachments(selectedAttachments);
        attachmentIds = uploaded.map(file => file.id);
      } catch (error) {
        toast.error('Failed to upload attachments');
        throw error;
      }
    }

    return createComment(ticket.id, {
      content: replyContent,
      ticket_id: ticket.id,
      agent_id: currentUser.id,
      workspace_id: currentUser.workspace_id,
      is_private: isPrivateNote,
      attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
    });
  }, [currentUser, selectedAttachments, ticket.id, replyContent, isPrivateNote]);

  const createCommentMutation = useMutation({
    mutationFn: sendComment,
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['ticketHtml', ticket.id] });
      queryClient.invalidateQueries({ queryKey: ['comments', ticket.id] });

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
    onError: error => {
      toast.error(`Failed to send reply: ${error.message}`);
    },
  });

  const handleSendReply = useCallback(() => {
    if (!replyContent.trim() || createCommentMutation.isPending) return;
    createCommentMutation.mutate();
  }, [replyContent, createCommentMutation]);

  const handlePrivateNoteChange = useCallback((checked: boolean) => {
    setIsPrivateNote(checked);
    if (checked) {
      setReplyContent('');
    }
  }, []);

  const isLoading = isLoadingHtmlContent && !htmlContent;
  const isError = isHtmlContentError && isCommentsError;
  const isEmpty = !isLoading && !isError && conversationItems.items.length === 0;

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
          {isError && (
            <div className="text-center text-red-500 py-4">
              Failed to load conversation: {htmlContentError?.message || commentsError?.message}
            </div>
          )}

          {isLoading && (
            <div className="space-y-4 animate-pulse">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 h-20"></div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 h-16"></div>
            </div>
          )}

          {isEmpty ? (
            <div className="text-center text-muted-foreground py-10">
              No conversation history found.
            </div>
          ) : (
            <>
              {conversationItems.isOptimized ? (
                conversationItems.items.map((item: TicketHtmlContent) => (
                  <MessageItem key={item.id} content={item} isInitial={item.id === 'initial'} />
                ))
              ) : (
                <>
                  {conversationItems.hasInitialMessage && (
                    <InitialTicketMessage
                      key="initial-message"
                      ticketId={ticket.id}
                      initialContent={ticket.description || ticket.body?.email_body || ''}
                      user={ticket.user}
                      createdAt={ticket.created_at}
                    />
                  )}
                  {(conversationItems.items as IComment[]).map(item => (
                    <ConversationMessageItem
                      key={item.id === -1 ? 'initial-message' : item.id}
                      comment={item}
                    />
                  ))}
                </>
              )}
            </>
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
            onAttachmentsChange={setSelectedAttachments}
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
                    <div className="relative mb-3">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search templates..."
                        value={cannedSearchTerm}
                        onChange={e => setCannedSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
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
                          {cannedSearchTerm
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
                              {reply.usage_count > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {reply.usage_count}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {reply.description ||
                                reply.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'}
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
              disabled={!replyContent.trim() || createCommentMutation.isPending}
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

      <style jsx global>{`
        .prose p:not(.email-signature p):not(.email-signature) {
          line-height: 1.2;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose p:empty,
        .prose p:has(br:only-child) {
          min-height: 1.2em;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        .prose .email-signature p,
        .prose .email-signature {
          color: #6b7280 !important;
          margin-top: 0 !important;
          margin-bottom: 0.1em !important;
          line-height: 0.6 !important;
        }
        .prose .email-signature br {
          line-height: 1 !important;
        }
        .prose .email-signature img {
          margin-top: 0.25em !important;
          margin-bottom: 0 !important;
          width: 150px !important;
          height: 92px !important;
          max-width: 150px !important;
          max-height: 92px !important;
          object-fit: scale-down !important;
        }
        .prose .email-signature,
        .prose .email-signature p,
        .prose .email-signature span,
        .prose .email-signature em,
        .prose .email-signature strong {
          font-size: 0.9em !important;
          line-height: 0.6 !important;
        }
        .prose a {
          text-decoration: underline !important;
        }
        .mt-2.p-2.border-l-2.border-gray-200.dark\\:border-gray-700.text-muted-foreground {
          font-size: 0.8em !important;
          line-height: 1 !important;
        }
        .mt-2.p-2.border-l-2.border-gray-200.dark\\:border-gray-700.text-muted-foreground *,
        .gmail_quote_container,
        .gmail_quote,
        .gmail_quote * {
          font-size: 0.85em !important;
          line-height: 1 !important;
        }
        .gmail_attr {
          font-size: 0.8em !important;
          color: #6b7280 !important;
          margin-bottom: 0.5em !important;
          line-height: 1 !important;
        }
      `}</style>
    </div>
  );
}
