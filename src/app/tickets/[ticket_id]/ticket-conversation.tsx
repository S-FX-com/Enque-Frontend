'use client';

import React, { useState, useEffect, useRef } from 'react';
//import { Separator } from '@radix-ui/react-separator';
import 'react-calendar/dist/Calendar.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Send, Mail, Clock, MessageSquare, Search, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ITicket } from '@/typescript/ticket';
import type { IComment } from '@/typescript/comment';
import type { Agent } from '@/typescript/agent';
import { getAgentById } from '@/services/agent';
import {
  getCommentsByTaskId,
  createComment,
  type CreateCommentPayload,
  type CommentResponseData,
} from '@/services/comment';
import { getTicketHtmlContent, type TicketHtmlContent } from '@/services/ticket';
import { ConversationMessageItem } from '@/components/conversation-message-item';
import { InitialTicketMessage } from '@/components/conversation-message-item';
import { useAuth } from '@/hooks/use-auth';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { uploadAttachments } from '@/services/attachmentService';
import { getEnabledGlobalSignature } from '@/services/global-signature';
import { getCannedReplies, type CannedReply } from '@/services/canned-replies';
import { formatRelativeTime } from '@/lib/utils';
import { ScheduleSendCalendar } from './scheduleSend/schedule-send-calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BoringAvatar from 'boring-avatars';

const addDarkModeStyles = () => {
  if (typeof document !== 'undefined') {
    const existingStyle = document.getElementById('dark-mode-message-styles');
    if (existingStyle) return;

    const style = document.createElement('style');
    style.id = 'dark-mode-message-styles';
    style.textContent = `
@media (prefers-color-scheme: dark) {
  .dark .user-message-content [style*="color:rgb(0,0,0)"],
  .dark .user-message-content [style*="color:#000000"],
  .dark .user-message-content [style*="color:#000"],
  .dark .user-message-content [style*="color:black"] {
    color: white !important;
  }
}
.dark .user-message-content [style*="color:rgb(0,0,0)"],
.dark .user-message-content [style*="color:#000000"],
.dark .user-message-content [style*="color:#000"],
.dark .user-message-content [style*="color:black"] {
  color: white !important;
}

/* Mention highlighting styles */
.mention {
  background-color: #e0ecff !important;
  color: #1d73f4 !important;
  border-radius: 0.375rem !important;
  padding: 0.125rem 0.375rem !important;
  font-weight: 500 !important;
  border: 1px solid #a7c9ff !important;
  display: inline-block !important;
  text-decoration: none !important;
}

.dark .mention {
  background-color: #312e81 !important;
  color: #c7d2fe !important;
  border-color: #4338ca !important;
}

/* Ensure mentions are visible in message content */
.message-content-container .mention,
.user-message-content .mention,
.prose .mention {
  background-color: #e0ecff !important;
  color: #1d73f4 !important;
  border-radius: 0.375rem !important;
  padding: 0.125rem 0.375rem !important;
  font-weight: 500 !important;
  border: 1px solid #a7c9ff !important;
  display: inline-block !important;
  text-decoration: none !important;
}

.dark .message-content-container .mention,
.dark .user-message-content .mention,
.dark .prose .mention {
  background-color: #312e81 !important;
  color: #c7d2fe !important;
  border-color: #4338ca !important;
}
`;
    document.head.appendChild(style);
  }
};

function processLinksForNewTab(htmlContent: string): string {
  return htmlContent.replace(
    /<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi,
    (match, beforeHref, url, afterHref) => {
      let attributes = beforeHref + afterHref;
      let processedUrl = url;

      try {
        if (processedUrl.includes('%')) {
          processedUrl = decodeURIComponent(processedUrl);
        }

        if (processedUrl.includes('safelinks.protection.outlook.com')) {
          const urlMatch = processedUrl.match(/url=([^&]+)/);
          if (urlMatch) {
            processedUrl = decodeURIComponent(urlMatch[1]);
          }
        }

        if (processedUrl.includes('streaklinks.com') || processedUrl.includes('gourl.es')) {
          const urlParams = processedUrl.match(/url=([^&]+)/g);
          if (urlParams && urlParams.length > 0) {
            const lastUrlParam = urlParams[urlParams.length - 1];
            const finalUrl = lastUrlParam.replace('url=', '');
            processedUrl = decodeURIComponent(finalUrl);
          }
        }

        processedUrl = processedUrl.replace(/&amp;/g, '&');
      } catch (e) {
        console.warn('Error procesando URL:', e);
        processedUrl = url;
      }

      const hasTarget = /target\s*=/i.test(attributes);
      const targetAttr = hasTarget ? '' : ' target="_blank" rel="noopener noreferrer"';

      const hasStyle = /style\s*=/i.test(attributes);
      if (hasStyle) {
        attributes = attributes.replace(
          /style\s*=\s*["']([^"']*?)["']/gi,
          (styleMatch: string, styleContent: string) => {
            let newStyle = styleContent;
            newStyle = newStyle.replace(/text-decoration\s*:\s*none\s*;?\s*/gi, '');
            newStyle = newStyle.trim();
            if (newStyle && !newStyle.endsWith(';')) newStyle += ';';
            return `style="${newStyle}" class="message-link"`;
          }
        );
      } else {
        attributes += ' class="message-link"';
      }

      return `<a ${attributes}href="${processedUrl}"${targetAttr}>`;
    }
  );
}

const editorStyles = `
.auto-expand-editor .ProseMirror {
min-height: 120px;
max-height: 1200px;
overflow-y: auto;
resize: none;
}

.auto-expand-editor .tiptap {
min-height: 120px;
overflow-y: visible;
}

.enque-quote {
border-left: 3px solid #e5e7eb;
padding-left: 12px;
margin-bottom: 16px;
color: #6b7280;
font-style: italic;
background-color: #f9fafb;
padding: 8px 12px;
border-radius: 4px;
}

.dark .enque-quote {
border-left-color: #374151;
color: #9ca3af;
background-color: #1f2937;
}
`;

interface Props {
  ticket: ITicket;
  onTicketUpdate?: (updatedTicket: ITicket) => void;
  replyOnly?: boolean;
  latestOnly?: boolean;
  extraRecipients?: string;
  onExtraRecipientsChange?: (recipients: string) => void;
  extraBccRecipients?: string;
  onExtraBccRecipientsChange?: (recipients: string) => void;
}

interface OptimizedMessageItemProps {
  content: TicketHtmlContent;
  isInitial?: boolean;
  ticket?: {
    to_recipients?: string | null;
    cc_recipients?: string | null;
    bcc_recipients?: string | null;
    user?: {
      name?: string;
      email?: string;
    } | null;
  };
}

export interface DateScheduleSend {
  hours: number;
  minutes: number;
  day: number;
  month: number;
  year: number;
}

function findQuoteStartIndex(html: string): number {
  const patterns = [
    /<p[^>]*><strong>From:<\/strong>/i,
    /<div[^>]*>From:\s+[^<]+@[^>]+>/i,
    /^From:\s+[^<]+@[^>]+>/m,
    /<[^>]*>\s*<b>From:<\/b>/i,
    /Sent from my \w+/i,

    /<div id="appendonsend"><\/div>/i,

    // HTML quote elements
    /<div[^>]*class="gmail_quote/i,
    /<blockquote[^>]*class="gmail_quote/i,
    /<blockquote[^>]*type="cite"/i,
    /<div[^>]*class="gmail_attr"/i,

    /<hr\s*style=["'][^"']*border-top:\s*1px\s*solid\s*[^;]+;["']/i,

    /---------- Forwarded message ---------/i,
    /Begin forwarded message:/i,

    /<div[^>]*style=["'][^"']*border:none;\s*border-top:solid\s+#E1E1E1/i,

    /^On\s+\w{3},\s+\w{3,9}\s+\d{1,2},\s+\d{4}\s+at\s+\d{1,2}:\d{2}\s*(AM|PM|am|pm)?\s+.+@[^>]+>\s+wrote:/m,
  ];

  let earliestIndex = -1;

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      if (pattern.source.includes('<hr') && match.index < 50) {
        continue;
      }

      if (pattern.source.includes('From:')) {
        const textBeforeMatch = html
          .substring(0, match.index)
          .replace(/<[^>]*>/g, '')
          .trim();
        if (textBeforeMatch.length < 30) {
          continue;
        }
      }

      if (earliestIndex === -1 || match.index < earliestIndex) {
        earliestIndex = match.index;
      }
    }
  }

  return earliestIndex;
}

function OptimizedMessageItem({ content, isInitial = false, ticket }: OptimizedMessageItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Aplicar estilos CSS para modo oscuro
  useEffect(() => {
    addDarkModeStyles();
  }, []);

  const senderInfo = React.useMemo(() => {
    const htmlContent = content.content || '';
    const metadataMatch = htmlContent.match(/<original-sender>(.*?)\|(.*?)<\/original-sender>/);

    if (metadataMatch && metadataMatch[1] && metadataMatch[2]) {
      return {
        name: metadataMatch[1].trim(),
        email: metadataMatch[2].trim(),
        isUserReply: true,
        type: 'user',
        avatar_url: content.sender.avatar_url,
      };
    }

    const isAgentMessage = content.sender.type === 'agent';
    return {
      name: content.sender.name || (isAgentMessage ? 'Agent' : 'User'),
      email: content.sender.email || 'unknown',
      isUserReply: !isAgentMessage && !isInitial,
      type: isAgentMessage ? 'agent' : 'user',
      avatar_url: content.sender.avatar_url,
    };
  }, [content.content, content.sender, isInitial]);

  const processedContent = React.useMemo(() => {
    let htmlContent = content.content || '';

    if (htmlContent.includes('<original-sender>')) {
      htmlContent = htmlContent.replace(/<original-sender>.*?<\/original-sender>/g, '');
    }

    htmlContent = htmlContent.replace(/<meta[^>]*>/gi, '');
    htmlContent = htmlContent.replace(/^\s*<html[^>]*>/gi, '');
    htmlContent = htmlContent.replace(/<\/html>\s*$/gi, '');
    htmlContent = htmlContent.replace(/^\s*<head[^>]*>[\s\S]*?<\/head>/gi, '');
    htmlContent = htmlContent.replace(/^\s*<body[^>]*>/gi, '');
    htmlContent = htmlContent.replace(/<\/body>\s*$/gi, '');
    htmlContent = htmlContent.replace(/<p[^>]*>\s*<\/p>/gi, '<p><br></p>');
    htmlContent = htmlContent.replace(
      /(<p\s+style=["']margin:\s*0\s*!important["']>[\s\S]*?)(<br\s*\/?>)(\s*<\/p>)/gi,
      '$1</p>$2'
    );
    htmlContent = htmlContent.replace(/^\s*(?:<br\s*\/?>\s*)+/i, '');
    htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*)+$/i, '');

    htmlContent = processLinksForNewTab(htmlContent);

    return htmlContent.trim();
  }, [content.content]);

  const { displayReplyPart, displayQuotedPart, showToggleButton } = React.useMemo(() => {
    let displayReplyPart = processedContent;
    let displayQuotedPart: string | null = null;
    let showToggleButton = false;

    if (senderInfo.isUserReply && processedContent) {
      const quoteStartIndex = findQuoteStartIndex(processedContent);
      if (quoteStartIndex !== -1) {
        displayReplyPart = processedContent.substring(0, quoteStartIndex);
        displayQuotedPart = processedContent.substring(quoteStartIndex);

        if (displayQuotedPart.replace(/<[^>]*>/g, '').trim().length > 20) {
          showToggleButton = true;
        } else {
          displayReplyPart = processedContent;
          displayQuotedPart = null;
        }
      }
    }

    return { displayReplyPart, displayQuotedPart, showToggleButton };
  }, [processedContent, senderInfo.isUserReply]);

  const agentAvatarColors = ['#1D73F4', '#D4E4FA'];
  const userAvatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

  const avatarColors =
    isInitial || senderInfo.isUserReply || senderInfo.type === 'user'
      ? userAvatarColors
      : agentAvatarColors;

  const isAgentMessage = senderInfo.type === 'agent';
  const applyAgentBackground = isAgentMessage && !isInitial && !senderInfo.isUserReply;

  const renderEmailRecipients = () => {
    if (content.is_private) return null;
    if (!ticket) return null;

    const isAgentMessage = senderInfo.type === 'agent';

    let toRecipients = '';
    if (isAgentMessage && ticket.user?.email) {
      const userName = ticket.user.name
        ? `${ticket.user.name} <${ticket.user.email}>`
        : ticket.user.email;
      toRecipients = userName;
    } else {
      toRecipients = ticket.to_recipients || '';
    }

    const recipients = [];

    if (toRecipients) {
      recipients.push(
        <div key="to" className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">To:</span>
          {toRecipients.split(',').map((email, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {email.trim()}
            </span>
          ))}
        </div>
      );
    }

    if (ticket.cc_recipients) {
      recipients.push(
        <div key="cc" className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cc:</span>
          {ticket.cc_recipients.split(',').map((email, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {email.trim()}
            </span>
          ))}
        </div>
      );
    }

    if (ticket.bcc_recipients) {
      recipients.push(
        <div key="bcc" className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Bcc:</span>
          {ticket.bcc_recipients.split(',').map((email, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {email.trim()}
            </span>
          ))}
        </div>
      );
    }

    if (recipients.length === 0) return null;

    return (
      <div className="mb-3 p-2 border-l-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-r-md">
        <div className="space-y-1">{recipients}</div>
      </div>
    );
  };

  const containerClasses = content.is_private
    ? 'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 bg-yellow-50 dark:bg-yellow-800/30 p-3 rounded-md'
    : applyAgentBackground
      ? 'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md'
      : 'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 p-3 rounded-md';

  return (
    <div className={containerClasses}>
      <div className="flex-shrink-0">
        {senderInfo.avatar_url ? (
          <Avatar className="w-10 h-10">
            <AvatarImage
              src={senderInfo.avatar_url || '/placeholder.svg'}
              alt={senderInfo.name || 'Avatar'}
            />
            <AvatarFallback>
              {senderInfo.name ? senderInfo.name.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <BoringAvatar size={40} name={senderInfo.email} variant="beam" colors={avatarColors} />
        )}
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

        {renderEmailRecipients()}

        <div className="max-w-none break-words overflow-x-auto">
          <div
            className={`text-sm text-black dark:text-white prose dark:prose-invert max-w-none whitespace-pre-line prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline message-content-container ${
              isAgentMessage && !isInitial && !senderInfo.isUserReply
                ? '[&_*:not(.mention)]:!text-black dark:[&_*:not(.mention)]:!text-white'
                : 'user-message-content'
            }`}
            dangerouslySetInnerHTML={{
              __html:
                displayReplyPart ||
                (content.content && content.content.trim()
                  ? processLinksForNewTab(content.content)
                  : '<p>Message content could not be loaded</p>'),
            }}
            style={{
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              color: 'inherit',
            }}
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
                  className={`mt-2 p-2 border-l-2 border-gray-200 dark:border-gray-700 text-muted-foreground text-sm quoted-content message-content-container ${
                    isAgentMessage && !isInitial && !senderInfo.isUserReply
                      ? '[&_*]:!text-muted-foreground'
                      : ''
                  }`}
                  dangerouslySetInnerHTML={{ __html: displayQuotedPart || '' }}
                  style={{ color: 'inherit' }}
                />
              )}
            </div>
          )}
        </div>

        {content.attachments && content.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Attachments:</p>
            <div className="flex flex-wrap gap-2 items-start">
              {content.attachments.map(attachment => {
                const getFileIcon = (contentType: string) => {
                  if (contentType === 'application/pdf') {
                    return (
                      <svg
                        className="h-5 w-5 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                    );
                  } else if (contentType.startsWith('image/')) {
                    return (
                      <svg
                        className="h-5 w-5 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21,15 16,10 5,21" />
                      </svg>
                    );
                  } else {
                    return (
                      <svg
                        className="h-5 w-5 flex-shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                    );
                  }
                };

                const formatFileSize = (bytes: number) => {
                  if (bytes === 0) return '0 Bytes';
                  const k = 1024;
                  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                };

                const getIconColor = (contentType: string) => {
                  if (contentType === 'application/pdf') return 'text-red-600';
                  if (contentType.includes('word')) return 'text-blue-600';
                  if (contentType.includes('excel')) return 'text-green-600';
                  if (contentType.startsWith('image/')) return 'text-purple-600';
                  if (contentType.startsWith('video/')) return 'text-blue-500';
                  return 'text-gray-600';
                };

                return (
                  <div
                    key={attachment.id}
                    className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors max-w-xs cursor-pointer"
                    onClick={() => window.open(attachment.download_url, '_blank')}
                    title={`Open ${attachment.file_name}`}
                  >
                    <div className={`${getIconColor(attachment.content_type)} mr-2`}>
                      {getFileIcon(attachment.content_type)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-grow">
                      <span
                        className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate"
                        title={attachment.file_name}
                      >
                        {attachment.file_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(attachment.file_size)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TicketConversation({
  ticket,
  onTicketUpdate,
  replyOnly = false,
  latestOnly = false,
  extraRecipients = '',
  onExtraRecipientsChange,
  extraBccRecipients = '',
}: Props) {
  type ValuePiece = Date | null;
  type Value = ValuePiece | [ValuePiece, ValuePiece];

  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [replyContent, setReplyContent] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const prevTicketIdRef = useRef<number | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendNow, setSendNow] = useState<boolean>(true);
  const [popCalendar, setPopCalendar] = useState<boolean>(false);
  const now: Date = new Date();
  const [date, setDate] = useState<Value>(null);
  const [time, setTime] = useState<string>('');
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
    staleTime: 2 * 60 * 1000,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    placeholderData: previousData => previousData,
    notifyOnChangeProps: ['data', 'error', 'isError'],
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
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const currentAgentId = currentUser?.id;
  const { data: currentAgentData } = useQuery<Agent>({
    queryKey: ['agent', currentAgentId],
    queryFn: () => getAgentById(currentAgentId!),
    enabled: !!currentAgentId,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const workspaceId = currentUser?.workspace_id;
  const { data: globalSignatureData } = useQuery({
    queryKey: ['globalSignature', workspaceId, 'enabled'],
    queryFn: () => getEnabledGlobalSignature(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: cannedReplies = [], isLoading: isLoadingCannedReplies } = useQuery<CannedReply[]>({
    queryKey: ['cannedReplies', workspaceId],
    queryFn: () => getCannedReplies(workspaceId!, { enabledOnly: true }),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const filteredCannedReplies = React.useMemo(() => {
    let filtered = cannedReplies;
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

  const conversationItems = React.useMemo(() => {
    if (htmlContent?.contents) {
      const finalContents = [...htmlContent.contents].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return {
        items: finalContents as (TicketHtmlContent | IComment)[],
        isOptimized: true,
        hasInitialMessage: htmlContent.contents.some(item => item.id === 'initial'),
        totalItems: htmlContent.total_items,
        initialMessageContent: undefined,
        initialMessageSender: undefined,
      };
    }

    const items: IComment[] = [...comments];
    let initialMessageContent: string | null | undefined = null;
    let initialMessageSender: IComment['user'] = null;
    let hasInitialMessage = false;

    if (ticket.description) {
      initialMessageContent = ticket.description;
      initialMessageSender = ticket.user;
      hasInitialMessage = true;
    } else if (ticket.body?.email_body) {
      initialMessageContent = ticket.body.email_body;
      initialMessageSender = ticket.user;
      hasInitialMessage = true;
    }

    if (
      initialMessageContent &&
      ticket.created_at &&
      !initialMessageContent.startsWith('[MIGRATED_TO_S3]')
    ) {
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

    return {
      items: items as (TicketHtmlContent | IComment)[],
      isOptimized: false,
      hasInitialMessage,
      initialMessageContent,
      initialMessageSender,
      totalItems: items.length,
    };
  }, [htmlContent, comments, ticket]);

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

      signatureToUse = signatureToUse.replace(
        /<img([^>]*?)width="300"([^>]*?)height="200"([^>]*?)>/g,
        '<img$1width="120"$2height="75"$3style="width: 120px; height: 75px; max-width: 120px; max-height: 75px; object-fit: scale-down; border-radius: 4px;">'
      );

      signatureToUse = `<div class="email-signature text-gray-500" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; clear: both;">${signatureToUse}</div>`;
    }

    const currentTicketId = ticket.id;
    const prevTicketId = prevTicketIdRef.current;
    const initialContent = signatureToUse
      ? `<p style="margin-block: 10px !important"><p>${signatureToUse}`
      : ``;

    setReplyContent(initialContent);
    setEditorKey(prevKey => prevKey + 1);

    if (currentTicketId !== prevTicketId) {
      setIsPrivateNote(false);
      setSendNow(true);
      setPopCalendar(false);
      setDate(null);
      setTime('');
      if (onExtraRecipientsChange) {
        onExtraRecipientsChange('');
      }
    }

    prevTicketIdRef.current = currentTicketId;
  }, [
    ticket.id,
    ticket.user?.name,
    currentAgentData,
    globalSignatureData,
    onExtraRecipientsChange,
  ]);

  const handleAttachmentsChange = (files: File[]) => {
    setSelectedAttachments(files);
  };

  const handleCannedReplySelect = (cannedReply: CannedReply) => {
    let content = cannedReply.content;
    const userName = ticket.user?.name || 'there';
    const agentName = currentAgentData?.name || '';

    content = content
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
          .replace(/\[Agent Name\]/g, currentAgentData?.name || '')
          .replace(/\[Agent Role\]/g, currentAgentData?.job_title || '-');
      } else if (currentAgentData?.email_signature) {
        signatureToUse = currentAgentData.email_signature;
      }

      if (signatureToUse) {
        signatureToUse = `<div class="email-signature text-gray-500">${signatureToUse}</div>`;
      }

      const fullContent = signatureToUse
        ? `${greeting}${content}<p><br></p>${signatureToUse}`
        : `${greeting}${content}`;

      setReplyContent(fullContent);
    }

    setCannedRepliesOpen(false);
    setCannedSearchTerm('');
    setEditorKey(prev => prev + 1);
  };

  // Function to validate email addresses
  const validateEmails = (emailString: string): boolean => {
    if (!emailString.trim()) return true; // Empty is valid
    const emails = emailString.split(',').map(email => email.trim());

    return emails.every(email => {
      // ✅ Handle both formats: "email@domain.com" and "Name <email@domain.com>"
      const emailMatch = email.match(/<([^>]+)>/) || [null, email];
      const extractedEmail = emailMatch[1]?.trim() || email.trim();

      // Basic email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(extractedEmail);
    });
  };

  const sendComment = async (
    content: string,
    isPrivate: boolean

    //sendNow: boolean
  ): Promise<CommentResponseData> => {
    if (sendNow) console.log('Send now');
    console.log(time);
    if (!currentUser) {
      toast.error('Authentication error. User not found.');
      throw new Error('Authentication error. User not found.');
    }
    if (extraRecipients.trim() && !validateEmails(extraRecipients)) {
      toast.error('Please enter valid email addresses separated by commas.');
      throw new Error('Invalid email addresses in extra recipients.');
    }
    if (extraBccRecipients.trim() && !validateEmails(extraBccRecipients)) {
      toast.error('Please enter valid BCC email addresses separated by commas.');
      throw new Error('Invalid email addresses in BCC recipients.');
    }

    // Extract latest message content and prepend it with enque-quote class
    const finalContent = content;
    // let finalContent = content;
    // if (conversationItems.items.length > 0 && !isPrivate) {
    //   const latestMessage = conversationItems.items[0];
    //   let latestMessageContent = '';

    //   if (conversationItems.isOptimized) {
    //     const optimizedMessage = latestMessage as TicketHtmlContent;
    //     latestMessageContent = optimizedMessage.content || '';
    //   } else {
    //     const commentMessage = latestMessage as IComment;
    //     latestMessageContent = commentMessage.content || '';
    //   }

    //   // 🔧 MODIFICACIÓN PRINCIPAL: Limpiar contenido citado antes de agregarlo como quote
    //   if (latestMessageContent.trim()) {
    //     // Usar la nueva función para limpiar el contenido citado
    //     const cleanedLatestContent = cleanQuotedContent(latestMessageContent);

    //     // Solo agregar como quote si queda contenido después de la limpieza
    //     if (cleanedLatestContent.trim()) {
    //       // Wrap the cleaned latest message in enque-quote div
    //       const quotedContent = `<div class="enque-quote" style="border-left: 3px solid #e5e7eb; padding-left: 12px; margin-top: 16px; color: #6b7280; font-style: italic;">${cleanedLatestContent}</div>`;
    //       // Prepend to the current content
    //       finalContent = content + quotedContent;
    //     }
    //   }
    // }

    let attachmentIds: number[] = [];
    if (selectedAttachments && selectedAttachments.length > 0) {
      try {
        console.log(`Uploading ${selectedAttachments.length} attachments...`);
        const uploaded = await uploadAttachments(selectedAttachments);
        attachmentIds = uploaded.map(file => file.id);
        console.log(`Successfully uploaded attachments: ${attachmentIds}`);
      } catch (error) {
        console.error('Error uploading attachments:', error);
        toast.error('Failed to upload attachments');
        throw new Error('Failed to upload attachments');
      }
    }
    let scheduledSendAt: string | undefined = undefined;
    if (!sendNow && date && time) {
      try {
        // Parse the date and time to create ISO string
        const selectedDate = date as Date;
        const timeMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!timeMatch) {
          throw new Error('Invalid time format');
        }

        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();

        if (period === 'AM' && hours === 12) {
          hours = 0;
        } else if (period === 'PM' && hours !== 12) {
          hours += 12;
        }

        console.log('🕐 Converted time:', { hours, minutes, period });

        const scheduledDateTime = new Date(selectedDate);
        scheduledDateTime.setHours(hours, minutes, 0, 0);
        const now = new Date();
        if (scheduledDateTime <= now) {
          toast.error('Scheduled time must be in the future');
          throw new Error('Scheduled time must be in the future');
        }
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');

        scheduledSendAt = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00.000Z`;

        console.log('📅 Local scheduled time:', scheduledDateTime.toString());
        console.log('📅 Sending to backend (as ET):', scheduledSendAt);
      } catch (error) {
        console.error('Error parsing scheduled time:', error);
        toast.error('Invalid scheduled time');
        throw error;
      }
    }
    const payload: CreateCommentPayload = {
      content: finalContent,
      ticket_id: ticket.id,
      agent_id: currentUser.id,
      workspace_id: currentUser.workspace_id,
      is_private: isPrivate,
      attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      other_destinaries: extraRecipients.trim() || undefined,
      bcc_recipients: extraBccRecipients.trim() || undefined,
      scheduled_send_at: scheduledSendAt,
    };

    return createComment(ticket.id, payload);
  };

  useEffect(() => {
    const handleCommentSyncCompleted = (event: CustomEvent) => {
      if (event.detail.ticket_id === ticket.id) {
        setIsSending(false);
      }
    };

    window.addEventListener('commentSyncCompleted', handleCommentSyncCompleted as EventListener);

    return () => {
      window.removeEventListener(
        'commentSyncCompleted',
        handleCommentSyncCompleted as EventListener
      );
    };
  }, [ticket.id]);

  const createCommentMutation = useMutation({
    mutationFn: () => sendComment(replyContent, isPrivateNote),
    onMutate: async () => {
      setIsSending(true);
      return { replyContent, isPrivateNote };
    },
    onSuccess: (data: CommentResponseData) => {
      setIsSending(false);
      setReplyContent('');
      setSelectedAttachments([]);
      setIsPrivateNote(false);
      if (onExtraRecipientsChange) {
        onExtraRecipientsChange('');
      }
      setEditorKey(prev => prev + 1);

      if (data.is_scheduled) {
        toast.success('Comment scheduled successfully! It will be sent at the specified time.');
        console.log('📅 Comment scheduled:', data.scheduled_comment);
      } else {
        toast.success('Reply sent successfully.');
      }

      if (data.task && onTicketUpdate) {
        onTicketUpdate(data.task);
        queryClient.setQueryData(['ticket', ticket.id], [data.task]);
        queryClient.invalidateQueries({ queryKey: ['tickets'] });

        if (data.assignee_changed && currentUser) {
          toast.info(`You were automatically assigned to this ticket.`);
        }
      }
    },
    onError: error => {
      setIsSending(false);
      console.error('Failed to send reply:', error);
      toast.error(`Failed to send reply: ${error.message}`);
    },
  });

  const handleSendReply = () => {
    if (!replyContent.trim() || !ticket?.id || isSending) return;
    if (popCalendar) {
      setPopCalendar(false);
    }
    createCommentMutation.mutate();
  };

  const handlePrivateNoteChange = (checked: boolean) => {
    setIsPrivateNote(checked);
    if (checked) {
      setReplyContent('');
    } else {
      // Restore signature when switching back from private note
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

        signatureToUse = signatureToUse.replace(
          /<img([^>]*?)width="300"([^>]*?)height="200"([^>]*?)>/g,
          '<img$1width="120"$2height="75"$3style="width: 120px; height: 75px; max-width: 120px; max-height: 75px; object-fit: scale-down; border-radius: 4px;">'
        );

        signatureToUse = `<div class="email-signature text-gray-500" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; clear: both;">${signatureToUse}</div>`;
      }

      const initialContent = signatureToUse
        ? `<p style="margin-block: 10px !important"><p>${signatureToUse}`
        : ``;

      setReplyContent(initialContent);
      setEditorKey(prev => prev + 1);
    }
  };

  const [showAllMessages, setShowAllMessages] = useState(false);

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = editorStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="space-y-6">
      {!replyOnly && !latestOnly && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">#{ticket.id}</span>
              <span>- {ticket.title}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {replyOnly ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="auto-expand-editor">
              <RichTextEditor
                key={editorKey}
                content={replyContent}
                onChange={setReplyContent}
                placeholder={isPrivateNote ? 'Write a private note...' : 'Type your reply here...'}
                disabled={createCommentMutation.isPending}
                onAttachmentsChange={handleAttachmentsChange}
                ableMentioning={isPrivateNote}
              />
            </div>

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
                                <h4 className="font-medium text-sm truncate flex-1">
                                  {reply.name}
                                </h4>
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
              <div className="flex">
                <Button
                  className="rounded-r-none px-4" // Added px-4 for consistent padding
                  onClick={handleSendReply}
                  disabled={
                    (!replyContent.trim() ||
                      !ticket?.id ||
                      isSending ||
                      createCommentMutation.isPending ||
                      (extraRecipients.trim() && !validateEmails(extraRecipients))) as boolean
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
                <ScheduleSendCalendar
                  day={now.getDate()}
                  month={now.getMonth()}
                  year={now.getFullYear()}
                  popCalendar={popCalendar}
                  setPopCalendar={setPopCalendar}
                  setSendNow={setSendNow}
                  handleSendReply={handleSendReply}
                  date={date}
                  setDate={setDate}
                  setTime={setTime}
                >
                  {/* This button will be the trigger for the dropdown */}
                  <Button
                    variant="default" // Changed to default variant for consistent color
                    className="rounded-l-none px-3" // Adjusted padding to match the Send button's visual size
                    disabled={
                      (!replyContent.trim() ||
                        !ticket?.id ||
                        isSending ||
                        createCommentMutation.isPending ||
                        (extraRecipients.trim() && !validateEmails(extraRecipients))) as boolean
                    }
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </ScheduleSendCalendar>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : latestOnly ? (
        <div className="ticket-conversation space-y-4">
          <div className="space-y-4">
            {isHtmlContentError &&
              isCommentsError &&
              !isLoadingHtmlContent &&
              !isLoadingComments && (
                <div className="text-center text-red-500 py-4">
                  Failed to load conversation:{' '}
                  {htmlContentError?.message || commentsError?.message || 'Unknown error'}
                </div>
              )}

            {isLoadingHtmlContent && !htmlContent && conversationItems.totalItems === 0 && (
              <div className="space-y-4 animate-pulse">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 h-20"></div>
              </div>
            )}

            {conversationItems.totalItems === 0 &&
            !isLoadingHtmlContent &&
            !isLoadingComments &&
            !(isHtmlContentError && isCommentsError) ? (
              <div className="text-center text-muted-foreground py-10">
                No conversation history found.
              </div>
            ) : (
              <>
                {/* Show only the latest message */}
                {conversationItems.isOptimized ? (
                  conversationItems.items.length > 0 && (
                    <OptimizedMessageItem
                      key={(conversationItems.items[0] as TicketHtmlContent).id}
                      content={conversationItems.items[0] as TicketHtmlContent}
                      isInitial={(conversationItems.items[0] as TicketHtmlContent).id === 'initial'}
                      ticket={{
                        to_recipients: ticket.to_recipients,
                        cc_recipients: ticket.cc_recipients,
                        bcc_recipients: ticket.bcc_recipients,
                        user: ticket.user,
                      }}
                    />
                  )
                ) : (
                  <>
                    {conversationItems.hasInitialMessage &&
                    conversationItems.initialMessageContent &&
                    conversationItems.items.length > 0 &&
                    (conversationItems.items[0] as IComment).id === -1 ? (
                      <InitialTicketMessage
                        key="initial-message-latest"
                        ticketId={ticket.id}
                        initialContent={conversationItems.initialMessageContent}
                        user={conversationItems.initialMessageSender}
                        createdAt={ticket.created_at}
                        ticket={{
                          to_recipients: ticket.to_recipients,
                          cc_recipients: ticket.cc_recipients,
                          bcc_recipients: ticket.bcc_recipients,
                          user: ticket.user,
                        }}
                      />
                    ) : (
                      conversationItems.items.length > 0 && (
                        <ConversationMessageItem
                          key={(conversationItems.items[0] as IComment).id}
                          comment={conversationItems.items[0] as IComment}
                          ticket={{
                            to_recipients: ticket.to_recipients,
                            cc_recipients: ticket.cc_recipients,
                            bcc_recipients: ticket.bcc_recipients,
                            user: ticket.user,
                          }}
                        />
                      )
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {conversationItems.totalItems > 1 && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllMessages(!showAllMessages)}
              >
                {showAllMessages
                  ? 'Hide Previous Messages'
                  : `View Previous Correspondence (${conversationItems.totalItems - 1} messages)`}
              </Button>
            </div>
          )}

          {showAllMessages && (
            <div className="space-y-4 border-t pt-4">
              {conversationItems.isOptimized
                ? (conversationItems.items as TicketHtmlContent[])
                    .slice(1)
                    .map((item: TicketHtmlContent) => (
                      <OptimizedMessageItem
                        key={item.id}
                        content={item}
                        isInitial={item.id === 'initial'}
                        ticket={{
                          to_recipients: ticket.to_recipients,
                          cc_recipients: ticket.cc_recipients,
                          bcc_recipients: ticket.bcc_recipients,
                          user: ticket.user,
                        }}
                      />
                    ))
                : (conversationItems.items as IComment[])
                    .slice(1)
                    .filter((item: IComment) => item.id !== -1)
                    .map((item: IComment) => (
                      <ConversationMessageItem
                        key={item.id}
                        comment={item}
                        ticket={{
                          to_recipients: ticket.to_recipients,
                          cc_recipients: ticket.cc_recipients,
                          bcc_recipients: ticket.bcc_recipients,
                          user: ticket.user,
                        }}
                      />
                    ))}
            </div>
          )}
        </div>
      ) : (
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 max-h-96">
            {/* Original conversation content */}
            {isHtmlContentError &&
              isCommentsError &&
              !isLoadingHtmlContent &&
              !isLoadingComments && (
                <div className="text-center text-red-500 py-4">
                  Failed to load conversation:{' '}
                  {htmlContentError?.message || commentsError?.message || 'Unknown error'}
                </div>
              )}

            {isLoadingHtmlContent && !htmlContent && conversationItems.totalItems === 0 && (
              <div className="space-y-4 animate-pulse">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 h-20"></div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 h-16"></div>
              </div>
            )}

            {conversationItems.totalItems === 0 &&
            !isLoadingHtmlContent &&
            !isLoadingComments &&
            !(isHtmlContentError && isCommentsError) ? (
              <div className="text-center text-muted-foreground py-10">
                No conversation history found.
              </div>
            ) : (
              <>
                {conversationItems.isOptimized ? (
                  (conversationItems.items as TicketHtmlContent[]).map(
                    (item: TicketHtmlContent) => (
                      <OptimizedMessageItem
                        key={item.id}
                        content={item}
                        isInitial={item.id === 'initial'}
                        ticket={{
                          to_recipients: ticket.to_recipients,
                          cc_recipients: ticket.cc_recipients,
                          bcc_recipients: ticket.bcc_recipients,
                          user: ticket.user,
                        }}
                      />
                    )
                  )
                ) : (
                  <>
                    {conversationItems.hasInitialMessage &&
                      conversationItems.initialMessageContent && (
                        <InitialTicketMessage
                          key="initial-message"
                          ticketId={ticket.id}
                          initialContent={conversationItems.initialMessageContent}
                          user={conversationItems.initialMessageSender}
                          createdAt={ticket.created_at}
                          ticket={{
                            to_recipients: ticket.to_recipients,
                            cc_recipients: ticket.cc_recipients,
                            bcc_recipients: ticket.bcc_recipients,
                            user: ticket.user,
                          }}
                        />
                      )}
                    {(conversationItems.items as IComment[])
                      .filter((item: IComment) => item.id !== -1)
                      .map((item: IComment) => (
                        <ConversationMessageItem
                          key={item.id}
                          comment={item}
                          ticket={{
                            to_recipients: ticket.to_recipients,
                            cc_recipients: ticket.cc_recipients,
                            bcc_recipients: ticket.bcc_recipients,
                            user: ticket.user,
                          }}
                        />
                      ))}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
