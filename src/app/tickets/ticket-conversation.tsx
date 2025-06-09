'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import {
  getCommentsByTaskId,
  createComment,
  CreateCommentPayload,
  CommentResponseData,
} from '@/services/comment';
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

// Componente optimizado para renderizar contenido HTML del ticket
interface OptimizedMessageItemProps {
  content: TicketHtmlContent;
  isInitial?: boolean;
}

// ✅ HELPER FUNCTION - copiada del componente original para detectar quoted text
function findQuoteStartIndex(html: string): number {
  const patterns = [
    // Common email quote headers
    /On .*? wrote:/i,
    /From:.*?</i, // Basic check for lines starting with From:
    /Sent from my /i, // e.g., Sent from my iPhone
    // HTML quote elements
    /<div class="gmail_quote/i, // Modified to catch any class that starts with gmail_quote
    /<blockquote class="gmail_quote/i, // Modified to catch any class that starts with gmail_quote
    /<blockquote/i, // Any blockquote element
    /<div class="gmail_attr"/i, // Gmail attribute div
    // Separators (look for one *after* the potential start)
    /<hr\s*style=["'][^"']*border-top:\s*1px\s*solid\s*[^;]+;["']/i, // Outlook HR
    /<hr/i, // General hr, check later if it's the first one
    // Forwarded message indicators
    /---------- Forwarded message ---------/i,
    /Begin forwarded message:/i,
  ];
  let earliestIndex = -1;

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      if (pattern.source === '<hr/i' && match.index < 10) {
        continue;
      }
      if (earliestIndex === -1 || match.index < earliestIndex) {
        earliestIndex = match.index;
      }
    }
  }
  return earliestIndex;
}

function OptimizedMessageItem({ content, isInitial = false }: OptimizedMessageItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // ✅ EXTRAER INFORMACIÓN DEL SENDER DESDE EL HTML (como hacía el componente original)
  const senderInfo = React.useMemo(() => {
    const htmlContent = content.content || '';

    // 1. Extraer información del tag original-sender ANTES de limpiarlo
    const metadataMatch = htmlContent.match(/<original-sender>(.*?)\|(.*?)<\/original-sender>/);
    if (metadataMatch && metadataMatch[1] && metadataMatch[2]) {
      return {
        name: metadataMatch[1].trim(),
        email: metadataMatch[2].trim(),
        isUserReply: true,
        type: 'user',
      };
    }

    // 2. Si no hay original-sender, usar información del sender del endpoint
    const isAgentMessage = content.sender.type === 'agent';
    return {
      name: content.sender.name || (isAgentMessage ? 'Agent' : 'User'),
      email: content.sender.email || 'unknown',
      isUserReply: !isAgentMessage && !isInitial,
      type: isAgentMessage ? 'agent' : 'user',
    };
  }, [content.content, content.sender, isInitial]);

  // ✅ PROCESAR EL CONTENIDO HTML igual que el componente original
  const processedContent = React.useMemo(() => {
    let htmlContent = content.content || '';

    // 1. Limpiar el tag original-sender (DESPUÉS de extraer la información)
    if (htmlContent.includes('<original-sender>')) {
      htmlContent = htmlContent.replace(/<original-sender>.*?<\/original-sender>/g, '');
    }

    // 2. Limpiar meta tags y elementos HTML innecesarios
    htmlContent = htmlContent.replace(/<meta[^>]*>/gi, '');
    htmlContent = htmlContent.replace(/^\s*<html[^>]*>/gi, '');
    htmlContent = htmlContent.replace(/<\/html>\s*$/gi, '');
    htmlContent = htmlContent.replace(/^\s*<head[^>]*>[\s\S]*?<\/head>/gi, '');
    htmlContent = htmlContent.replace(/^\s*<body[^>]*>/gi, '');
    htmlContent = htmlContent.replace(/<\/body>\s*$/gi, '');

    // 3. Preservar párrafos vacíos
    htmlContent = htmlContent.replace(/<p>\s*<\/p>/gi, '<p><br></p>');

    // 4. Limpiar espacios en blanco excesivos
    htmlContent = htmlContent.replace(/^\s*(?:<br\s*\/?>\s*)+/i, '');
    htmlContent = htmlContent.replace(/(?:<br\s*\/?>\s*)+$/i, '');

    return htmlContent.trim();
  }, [content.content]);

  // ✅ USAR LA INFORMACIÓN EXTRAÍDA PARA SENDER Y AVATAR
  const senderName = senderInfo.name;
  const senderIdentifier = senderInfo.email;

  // ✅ LÓGICA CORRECTA PARA QUOTED TEXT (como el componente original)
  const { displayReplyPart, displayQuotedPart, showToggleButton } = React.useMemo(() => {
    let displayReplyPart = processedContent;
    let displayQuotedPart: string | null = null;
    let showToggleButton = false;

    // Solo buscar quoted text en user replies
    if (senderInfo.isUserReply && processedContent) {
      const quoteStartIndex = findQuoteStartIndex(processedContent);
      if (quoteStartIndex !== -1) {
        displayReplyPart = processedContent.substring(0, quoteStartIndex);
        displayQuotedPart = processedContent.substring(quoteStartIndex);

        // Solo mostrar toggle si el quoted text tiene contenido real (>20 chars sin HTML)
        if (displayQuotedPart.replace(/<[^>]*>/g, '').trim().length > 20) {
          showToggleButton = true;
        } else {
          // Si quoted text es muy corto, mostrar todo junto
          displayReplyPart = processedContent;
          displayQuotedPart = null;
        }
      }
    }

    return { displayReplyPart, displayQuotedPart, showToggleButton };
  }, [processedContent, senderInfo.isUserReply]);

  // ✅ CONFIGURAR COLORES DE AVATAR según el tipo (como el componente original)
  const agentAvatarColors = ['#1D73F4', '#D4E4FA'];
  const userAvatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

  // Usar colores de usuario para mensajes iniciales y user replies, agente para el resto
  const avatarColors =
    isInitial || senderInfo.isUserReply || senderInfo.type === 'user'
      ? userAvatarColors
      : agentAvatarColors;

  // ✅ APLICAR FONDO GRIS SOLO PARA AGENTES (como el componente original)
  const isAgentMessage = senderInfo.type === 'agent';
  const applyAgentBackground = isAgentMessage && !isInitial && !senderInfo.isUserReply;

  // ✅ TODOS LOS MENSAJES USAN EL MISMO ESTILO BASE (sin azul especial para inicial)
  const containerClasses = content.is_private
    ? 'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 bg-yellow-50 dark:bg-yellow-800/30 p-3 rounded-md'
    : applyAgentBackground
      ? 'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md'
      : 'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 p-3 rounded-md';

  return (
    <div className={containerClasses}>
      <div className="flex-shrink-0">
        <BoringAvatar size={40} name={senderIdentifier} variant="beam" colors={avatarColors} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="mb-1">
          <p className="text-sm font-medium leading-none">
            {senderName}
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
            dangerouslySetInnerHTML={{ 
              __html: displayReplyPart || 
                      (content.content && content.content.trim() ? content.content : '<p>Message content could not be loaded</p>')
            }}
          />

          {/* ✅ SHOW QUOTED TEXT BUTTON - Solo para user replies con quoted content */}
          {showToggleButton && (
            <div className="mt-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 p-1 rounded bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50"
              >
                <span className="h-3 w-3 flex-shrink-0">⏷</span>
                {isExpanded ? 'Show less' : 'Show quoted text'}
              </button>

              {/* ✅ MOSTRAR QUOTED TEXT cuando está expandido */}
              {isExpanded && displayQuotedPart && (
                <div
                  className="mt-2 p-2 border-l-2 border-gray-200 dark:border-gray-700 text-muted-foreground text-sm"
                  dangerouslySetInnerHTML={{ __html: displayQuotedPart }}
                />
              )}
            </div>
          )}
        </div>

        {/* Render attachments if any */}
        {content.attachments && content.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Attachments:</p>
            <div className="flex flex-wrap gap-2 items-start">
              {content.attachments.map(attachment => {
                // Helper para obtener icono según tipo de archivo
                const getFileIcon = (contentType: string) => {
                  if (contentType === 'application/pdf') {
                    return (
                      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <line x1="10" y1="9" x2="8" y2="9"/>
                      </svg>
                    );
                  } else if (contentType.includes('word') || contentType.includes('document')) {
                    return (
                      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <line x1="10" y1="9" x2="8" y2="9"/>
                      </svg>
                    );
                  } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
                    return (
                      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <path d="M8 13h8M8 17h8M8 9h2"/>
                      </svg>
                    );
                  } else if (contentType.startsWith('image/')) {
                    return (
                      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                    );
                  } else if (contentType.startsWith('video/')) {
                    return (
                      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                    );
                  } else {
                    return (
                      <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                      </svg>
                    );
                  }
                };

                // Helper para formatear tamaño de archivo
                const formatFileSize = (bytes: number) => {
                  if (bytes === 0) return '0 Bytes';
                  const k = 1024;
                  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                };

                // Determinar color del icono según tipo
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
                    title={`Abrir ${attachment.file_name}`}
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

// ✅ ESTILOS CSS GLOBALES para firmas y imágenes (copiados del componente original)
const GlobalConversationStyles = () => (
  <style jsx global>{`
    /* Estilos para el cuerpo del mensaje en la conversación */
    .prose p:not(.email-signature p):not(.email-signature) {
      line-height: 1.2;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    /* Párrafos vacíos */
    .prose p:empty,
    .prose p:has(br:only-child) {
      min-height: 1.2em;
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    /* ✅ ESTILOS ESPECÍFICOS PARA LA FIRMA */
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

    /* ✅ ESTILOS PARA IMÁGENES DE FIRMA - ESTE ERA EL PROBLEMA */
    .prose .email-signature img {
      margin-top: 0.25em !important;
      margin-bottom: 0 !important;
      width: 150px !important;
      height: 92px !important;
      max-width: 150px !important;
      max-height: 92px !important;
      object-fit: scale-down !important;
    }

    /* Texto de firma más pequeño */
    .prose .email-signature,
    .prose .email-signature p,
    .prose .email-signature span,
    .prose .email-signature em,
    .prose .email-signature strong {
      font-size: 0.9em !important;
      line-height: 0.6 !important;
    }

    /* Links con subrayado */
    .prose a {
      text-decoration: underline !important;
    }

    /* Estilos para quoted text */
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
);

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

  // 🚀 QUERY OPTIMIZADA CON PRECARGA: Carga instantánea si está en cache
  const {
    data: htmlContent,
    isLoading: isLoadingHtmlContent,
    error: htmlContentError,
    isError: isHtmlContentError,
  } = useQuery({
    queryKey: ['ticketHtml', ticket.id],
    queryFn: () => getTicketHtmlContent(ticket.id),
    enabled: !!ticket?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos - datos más frescos gracias a Socket.IO
    refetchInterval: false, // Sin polling - usar Socket.IO
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // ✅ OPTIMIZADO: No refetch si ya está en cache (precargado)
    networkMode: 'online',
    // ✅ CLAVE: Mostrar datos instantáneamente si están en cache
    placeholderData: previousData => previousData,
    notifyOnChangeProps: ['data', 'error', 'isError'],
  });

  // 📉 QUERY FALLBACK: Solo si falla la query optimizada
  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
    isError: isCommentsError,
  } = useQuery<IComment[]>({
    queryKey: ['comments', ticket.id],
    queryFn: () => getCommentsByTaskId(ticket.id),
    enabled: !!ticket?.id && isHtmlContentError, // Solo si falla la query principal
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

  // Fetch canned replies
  const { data: cannedReplies = [], isLoading: isLoadingCannedReplies } = useQuery<CannedReply[]>({
    queryKey: ['cannedReplies', workspaceId],
    queryFn: () => getCannedReplies(workspaceId!, { enabledOnly: true }),
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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

  // 🎯 LÓGICA PRINCIPAL: Usar contenido HTML optimizado o fallback a comentarios
  const conversationItems = React.useMemo(() => {
    // Si tenemos contenido HTML optimizado, usarlo
    if (htmlContent?.contents) {
      // ✅ ORDENAR EN ORDEN DESCENDENTE: más recientes arriba, inicial abajo
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

    // Fallback a la lógica anterior con comentarios
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

    // ✅ ORDEN DESCENDENTE: mensajes más recientes arriba, inicial abajo
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

  // Remove the S3 preloading effect since we're now using the optimized endpoint
  // useEffect for S3 preloading is no longer needed

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

    // ✅ RÁPIDO: Procesar attachments si existen, pero no hacerlo súper lento
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

    // Enviar comentario con attachments
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

  // Estado para controlar el botón más precisamente
  const [isSending, setIsSending] = useState(false);

  // ✅ ESCUCHAR EVENTO DE SINCRONIZACIÓN COMPLETADA
  useEffect(() => {
    const handleCommentSyncCompleted = (event: CustomEvent) => {
      if (event.detail.ticket_id === ticket.id) {
        setIsSending(false);
      }
    };

    window.addEventListener('commentSyncCompleted', handleCommentSyncCompleted as EventListener);
    
    return () => {
      window.removeEventListener('commentSyncCompleted', handleCommentSyncCompleted as EventListener);
    };
  }, [ticket.id]);

  const createCommentMutation = useMutation({
    mutationFn: () => sendComment(replyContent, isPrivateNote),
    // ✅ PROFESIONAL: Solo mostrar estado de envío, NO actualización optimista
    onMutate: async () => {
      setIsSending(true);
      // No hacer actualización optimista - esperar confirmación del servidor
      return { replyContent, isPrivateNote };
    },
    onSuccess: (data: CommentResponseData) => {
      // ⚡ INSTANTÁNEO: Resetear botón inmediatamente al recibir respuesta
      setIsSending(false);

      // Solo limpiar el formulario ya que los datos se actualizarán por Socket.IO
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

      // Los datos se actualizarán automáticamente por Socket.IO cuando llegue la confirmación
    },
    onError: (error) => {
      setIsSending(false); // Resetear estado en caso de error
      console.error('Failed to send reply:', error);
      toast.error(`Failed to send reply: ${error.message}`);
    },
  });

  const handleSendReply = () => {
    if (!replyContent.trim() || !ticket?.id || isSending) return;
    createCommentMutation.mutate();
  };

  const handlePrivateNoteChange = (checked: boolean) => {
    setIsPrivateNote(checked);
    if (checked) {
      setReplyContent('');
    }
  };

  // ✅ Variables de loading ya no necesarias, manejadas directamente en JSX

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
          {/* ✅ LOADING OPTIMIZADO: Solo mostrar error si realmente falló */}
          {isHtmlContentError && isCommentsError && !isLoadingHtmlContent && !isLoadingComments && (
            <div className="text-center text-red-500 py-4">
              Failed to load conversation:{' '}
              {htmlContentError?.message || commentsError?.message || 'Unknown error'}
            </div>
          )}

          {/* 🎯 SKELETON DISCRETO: Solo para carga inicial real sin datos previos */}
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
              {/* 🚀 RENDERIZADO OPTIMIZADO */}
              {conversationItems.isOptimized ? (
                // Usar el nuevo componente optimizado
                (conversationItems.items as TicketHtmlContent[]).map((item: TicketHtmlContent) => (
                  <OptimizedMessageItem
                    key={item.id}
                    content={item}
                    isInitial={item.id === 'initial'}
                  />
                ))
              ) : (
                // Fallback al renderizado anterior
                <>
                  {conversationItems.hasInitialMessage &&
                    conversationItems.initialMessageContent?.startsWith('[MIGRATED_TO_S3]') && (
                      <InitialTicketMessage
                        key="initial-message-s3"
                        ticketId={ticket.id}
                        initialContent={conversationItems.initialMessageContent}
                        user={conversationItems.initialMessageSender}
                        createdAt={ticket.created_at}
                      />
                    )}

                  {(conversationItems.items as IComment[]).map((item: IComment) => (
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
              disabled={
                !replyContent || replyContent === '<p></p>' || isSending
              }
            >
              {isSending ? (
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

      {/* ✅ ESTILOS GLOBALES PARA FIRMAS E IMÁGENES */}
      <GlobalConversationStyles />
    </div>
  );
}
