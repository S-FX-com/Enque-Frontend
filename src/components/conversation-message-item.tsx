import React, { useState, useEffect, useCallback, useRef } from 'react';
import '@cyntler/react-doc-viewer/dist/index.css';
import { formatDistanceToNow } from 'date-fns';
import { formatRelativeTime } from '@/lib/utils';
import Avatar from 'boring-avatars';
import Image from 'next/image';
import { IComment, IAttachment } from '@/typescript/comment';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Download as DownloadIcon } from 'lucide-react';
import {
  DocumentPdf24Regular as DocumentPdfIcon,
  Image24Regular as FluentImageIcon,
  PlayCircle24Regular as FluentVideoIcon,
  Speaker224Regular as FluentAudioIcon,
  Archive24Regular as FluentArchiveIcon,
  Attach24Regular as FluentAttachIcon,
  Document24Regular as FluentDocumentIcon,
} from '@fluentui/react-icons';
import DocViewer, { DocViewerRenderers } from '@cyntler/react-doc-viewer';

import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MuiCloseIcon from '@mui/icons-material/Close';
import { useAgentAvatar } from '@/hooks/use-agent-avatar';
import { getCommentS3Content } from '@/services/comment';
import { Skeleton } from '@/components/ui/skeleton';

const fileTypeColors: { [key: string]: string } = {
  pdf: '#D93025',
  word: '#2D5B9F',
  excel: '#1E7145',
  powerpoint: '#D0440B',
  image: '#753BBD',
  audio: '#C2185B',
  video: '#0078D4',
  archive: '#525252',
  text: '#737373',
  generic_document: '#737373',
  generic_attach: '#737373',
};

interface Props {
  comment: IComment;
  ticket?: {
    to_recipients?: string;
    cc_recipients?: string;
    bcc_recipients?: string;
  };
}

const parseSenderFromContent = (content: string): { name: string; email: string } | null => {
  // Primero buscar el nuevo formato especial
  const metadataMatch = content.match(/<original-sender>(.*?)\|(.*?)<\/original-sender>/);
  if (metadataMatch && metadataMatch[1] && metadataMatch[2]) {
    return { name: metadataMatch[1].trim(), email: metadataMatch[2].trim() };
  }

  const match = content.match(/<p><strong>From:<\/strong>\s*(.*?)\s*<(.*?)><\/p>(?:<hr>)?/);
  if (match && match[1] && match[2]) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return null;
};

// Helper to find the start of the quoted text
function findQuoteStartIndex(html: string): number {
  const patterns = [
    // Common email quote headers - más específicos
    /On .+? wrote:\s*</i,
    // From patterns - más específicos para evitar falsos positivos  
    /<p[^>]*><strong>From:<\/strong>/i, // HTML From header
    /<div[^>]*>From:\s+[^<]+<[^@]+@[^>]+>/i, // From with email format
    /^From:\s+[^<]+<[^@]+@[^>]+>/m, // From at line start with email
    /Sent from my \w+/i, // e.g., Sent from my iPhone
    // HTML quote elements
    /<div[^>]*class="gmail_quote/i,
    /<blockquote[^>]*class="gmail_quote/i,
    /<blockquote[^>]*type="cite"/i,
    /<div[^>]*class="gmail_attr"/i,
    // Outlook separators
    /<hr\s*style=["'][^"']*border-top:\s*1px\s*solid\s*[^;]+;["']/i,
    // Forwarded message indicators
    /---------- Forwarded message ---------/i,
    /Begin forwarded message:/i,
    // Outlook quote indicators
    /<div[^>]*style=["'][^"']*border:none;\s*border-top:solid\s+#E1E1E1/i,
  ];
  
  let earliestIndex = -1;

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match.index !== undefined) {
      // Para HR, asegurarse que no esté al principio del mensaje
      if (pattern.source.includes('<hr') && match.index < 50) {
        continue;
      }
      
      // Para patrones From, asegurarse que esté en un contexto apropiado
      if (pattern.source.includes('From:')) {
        // Verificar que hay suficiente contenido antes para justificar un corte
        const textBeforeMatch = html.substring(0, match.index).replace(/<[^>]*>/g, '').trim();
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

const getFileIcon = (contentType: string, className: string = 'h-5 w-5 mr-1.5 flex-shrink-0') => {
  let fileTypeKey = 'generic_attach';
  let iconComponent;

  if (contentType === 'application/pdf') {
    fileTypeKey = 'pdf';
    iconComponent = DocumentPdfIcon;
  } else if (
    contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/msword'
  ) {
    fileTypeKey = 'word';
    iconComponent = FluentDocumentIcon;
  } else if (
    contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    contentType === 'application/vnd.ms-excel'
  ) {
    fileTypeKey = 'excel';
    iconComponent = FluentDocumentIcon;
  } else if (
    contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    contentType === 'application/vnd.ms-powerpoint'
  ) {
    fileTypeKey = 'powerpoint';
    iconComponent = FluentDocumentIcon;
  } else if (contentType.startsWith('image/')) {
    fileTypeKey = 'image';
    iconComponent = FluentImageIcon;
  } else if (contentType.startsWith('audio/')) {
    fileTypeKey = 'audio';
    iconComponent = FluentAudioIcon;
  } else if (contentType.startsWith('video/')) {
    fileTypeKey = 'video';
    iconComponent = FluentVideoIcon;
  } else if (
    contentType === 'application/zip' ||
    contentType === 'application/x-zip-compressed' ||
    contentType.includes('archive')
  ) {
    fileTypeKey = 'archive';
    iconComponent = FluentArchiveIcon;
  } else if (contentType.startsWith('text/')) {
    fileTypeKey = 'text';
    iconComponent = FluentDocumentIcon;
  } else {
    iconComponent = FluentAttachIcon; // Fallback a adjunto genérico
  }

  const iconColor = fileTypeColors[fileTypeKey] || fileTypeColors.generic_attach;
  const iconStyle = { fontSize: '20px', color: iconColor };
  const PassThroughComponent = iconComponent;

  return <PassThroughComponent className={className} style={iconStyle} />;
};

// Helper to format file size
const formatFileSize = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const cleanReplyPreamble = (html: string): string => {
  if (!html) return '';

  // Traducir encabezados de citas en español a inglés
  const spanishReplyHeaderPattern =
    /El (?:lun|mar|mié|jue|vie|sáb|dom), \d{1,2} (?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) \d{4} a la\(s\) \d{1,2}:\d{2}(?:&#8239;|\s)?(?:a\.m\.|p\.m\.), ([^<]+) \(([^)]+)\) escribió:/i;

  // Reemplazar encabezados en español con formato en inglés
  let cleanedHtml = html.replace(spanishReplyHeaderPattern, (match, name, email) => {
    return `On [DATE], ${name} (${email}) wrote:`;
  });

  cleanedHtml = cleanedHtml.replace(/<p>\s*<\/p>/gi, '<p><br></p>');
  cleanedHtml = cleanedHtml.replace(/^\s*(?:<br\s*\/?>\s*)+/i, '');
  cleanedHtml = cleanedHtml.replace(/(?:<br\s*\/?>\s*)+$/i, '');

  return cleanedHtml.trim();
};

const preserveEmptyParagraphs = (html: string): string => {
  // Si está vacío, devuelve el HTML tal cual
  if (!html) return '';

  // Reemplazar párrafos vacíos con párrafos que tengan <br>
  const fixedHtml = html.replace(/<p>\s*<\/p>/gi, '<p><br></p>');

  return fixedHtml;
};

// Function to process links to open in new tab and ensure they are clickable
const processLinksForNewTab = (htmlContent: string): string => {
  return htmlContent.replace(
    /<a\s+([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi,
    (match, beforeHref, url, afterHref) => {
      let attributes = beforeHref + afterHref;
      let processedUrl = url;
      
      // 🔧 NUEVA FUNCIONALIDAD: Decodificar URLs complejas de Outlook SafeLinks
      try {
        // Decodificar URL si está codificada
        if (processedUrl.includes('%')) {
          processedUrl = decodeURIComponent(processedUrl);
        }
        
        // Extraer URL real de Outlook SafeLinks
        if (processedUrl.includes('safelinks.protection.outlook.com')) {
          const urlMatch = processedUrl.match(/url=([^&]+)/);
          if (urlMatch) {
            processedUrl = decodeURIComponent(urlMatch[1]);
          }
        }
        
        // Extraer URL de otros servicios de protección
        if (processedUrl.includes('streaklinks.com') || processedUrl.includes('gourl.es')) {
          // Buscar parámetros url= en la cadena
          const urlParams = processedUrl.match(/url=([^&]+)/g);
          if (urlParams && urlParams.length > 0) {
            // Tomar el último parámetro url= que suele ser el destino final
            const lastUrlParam = urlParams[urlParams.length - 1];
            const finalUrl = lastUrlParam.replace('url=', '');
            processedUrl = decodeURIComponent(finalUrl);
          }
        }
        
        // Limpiar encoding adicional
        processedUrl = processedUrl.replace(/&amp;/g, '&');
        
      } catch (e) {
        // Si hay error decodificando, usar URL original
        console.warn('Error procesando URL:', e);
        processedUrl = url;
      }
      
      // Check if target attribute already exists
      const hasTarget = /target\s*=/i.test(attributes);
      const targetAttr = hasTarget ? '' : ' target="_blank" rel="noopener noreferrer"';
      
      // Check if style attribute exists
      const hasStyle = /style\s*=/i.test(attributes);
      
      if (hasStyle) {
        // Update existing style attribute to include link styling
        attributes = attributes.replace(/style\s*=\s*["']([^"']*?)["']/gi, (styleMatch: string, styleContent: string) => {
          let newStyle = styleContent;
          
          // Remove text-decoration:none if present
          newStyle = newStyle.replace(/text-decoration\s*:\s*none\s*;?\s*/gi, '');
          
          // Add link styling - CORREGIDO: Usar clases CSS en lugar de estilos inline con !important
          newStyle = newStyle.trim();
          if (newStyle && !newStyle.endsWith(';')) newStyle += ';';
          
          return `style="${newStyle}" class="message-link"`;
        });
      } else {
        // Add style attribute with link styling - CORREGIDO: Usar clase CSS
        attributes += ' class="message-link"';
      }
      
      return `<a ${attributes}href="${processedUrl}"${targetAttr}>`;
    }
  );
};

const muiModalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90vw',
  maxWidth: '900px',
  height: '85vh',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 0,
  display: 'flex',
  flexDirection: 'column',
} as const;

// Componente específico para el mensaje inicial del ticket
interface InitialTicketMessageProps {
  ticketId: number;
  initialContent: string;
  user: IComment['user'];
  createdAt: string;
  ticket?: {
    to_recipients?: string;
    cc_recipients?: string;
    bcc_recipients?: string;
  };
}

function InitialTicketMessage({
  ticketId,
  initialContent,
  user,
  createdAt,
  ticket,
}: InitialTicketMessageProps) {
  const [s3Content, setS3Content] = useState<string | null>(null);
  const [isLoadingS3, setIsLoadingS3] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to render email recipients
  const renderEmailRecipients = () => {
    if (!ticket) return null;
    
    const recipients: { label: string; emails: string; show: boolean }[] = [
      { 
        label: 'To:', 
        emails: ticket.to_recipients || '', 
        show: Boolean(ticket.to_recipients?.trim()) 
      },
      { 
        label: 'Cc:', 
        emails: ticket.cc_recipients || '', 
        show: Boolean(ticket.cc_recipients?.trim()) 
      },
      { 
        label: 'Bcc:', 
        emails: ticket.bcc_recipients || '', 
        show: Boolean(ticket.bcc_recipients?.trim()) 
      }
    ];

    const hasAnyRecipients = recipients.some(r => r.show);
    if (!hasAnyRecipients) return null;

    return (
      <div className="mb-3 text-xs text-muted-foreground space-y-1 border-l-2 border-muted pl-2">
        {recipients.map(recipient => {
          if (!recipient.show) return null;
          
          return (
            <div key={recipient.label} className="flex items-start gap-2">
              <span className="font-medium min-w-[30px] text-slate-600 dark:text-slate-400">
                {recipient.label}
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-300">
                {recipient.emails}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Detectar si el contenido inicial está migrado a S3
  const isMigratedToS3 = initialContent?.startsWith('[MIGRATED_TO_S3]');

  // Función para cargar contenido inicial desde S3
  const loadInitialS3Content = useCallback(async () => {
    if (!isMigratedToS3 || s3Content || isLoadingS3) {
      return;
    }

    setIsLoadingS3(true);
    try {
      const { getTicketInitialContent } = await import('@/services/ticket');
      const response = await getTicketInitialContent(ticketId);

      if (response.status === 'loaded_from_s3' && response.content) {
        setS3Content(response.content);
      } else {
        // Fallback al contenido procesado
        let cleanContent = response.content;
        if (cleanContent.startsWith('[MIGRATED_TO_S3]')) {
          cleanContent = cleanContent.replace(/^\[MIGRATED_TO_S3\][^"]*"[^"]*"/, '').trim() || '';
        }
        setS3Content(cleanContent || 'Content temporarily unavailable');
      }
    } catch (error) {
      console.error('Error loading initial S3 content:', error);
      // Usar el contenido original pero limpio
      const cleanContent =
        initialContent?.replace(/^\[MIGRATED_TO_S3\][^"]*"[^"]*"/, '').trim() || initialContent;
      setS3Content(cleanContent);
    } finally {
      setIsLoadingS3(false);
    }
  }, [ticketId, initialContent, isMigratedToS3, s3Content, isLoadingS3]);

  useEffect(() => {
    if (isMigratedToS3 && !s3Content && !isLoadingS3) {
      loadInitialS3Content();
    }
  }, [isMigratedToS3, loadInitialS3Content, s3Content, isLoadingS3]);

  useEffect(() => {
    addDarkModeStyles();
  }, []);

  let displayContent: string;
  if (isMigratedToS3) {
    if (isLoadingS3) {
      displayContent =
        '<div class="flex items-center gap-2 text-muted-foreground"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>Loading content...</div>';
    } else {
      displayContent = s3Content || initialContent;
    }
  } else {
    displayContent = initialContent;
  }

  const senderName = user?.name || 'Unknown User';
  const senderIdentifier = user?.email || 'unknown';

  const truncateLength = 300;
  const shouldTruncate = displayContent && displayContent.length > truncateLength;
  const truncatedContent =
    shouldTruncate && !isExpanded
      ? displayContent.substring(0, truncateLength) + '...'
      : displayContent;

  return (
    <div className="flex gap-3 p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
      <div className="flex-shrink-0">
        <Avatar
          size={32}
          name={senderIdentifier}
          variant="beam"
          colors={['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989']}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{senderName}</span>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(createdAt)}</span>
        </div>

        {/* Email Recipients - TO, CC, BCC */}
        {renderEmailRecipients()}

        <div className="message-content">
          {isLoadingS3 ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Loading content from S3...</span>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none dark:prose-invert text-black dark:text-white user-message-content message-content-container"
              dangerouslySetInnerHTML={{ __html: processLinksForNewTab(truncatedContent || '') }}
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                color: 'inherit'
              }}
            />
          )}

          {shouldTruncate && !isLoadingS3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Export the InitialTicketMessage component for use in ticket conversation
export { InitialTicketMessage };

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
    `;
    document.head.appendChild(style);
  }
};

export function ConversationMessageItem({ comment, ticket }: Props) {
  const [s3Content, setS3Content] = useState<string | null>(null);
  const [isLoadingS3, setIsLoadingS3] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<IAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);
  

  const renderEmailRecipients = () => {
    if (comment.is_private) return null;
    const toRecipients = ticket?.to_recipients || '';
    const ccRecipients = comment.other_destinaries || ticket?.cc_recipients || '';
    const bccRecipients = comment.bcc_recipients || ticket?.bcc_recipients || '';
    
    const recipients: { label: string; emails: string; show: boolean }[] = [
      { 
        label: 'To:', 
        emails: toRecipients, 
        show: Boolean(toRecipients.trim()) 
      },
      { 
        label: 'Cc:', 
        emails: ccRecipients, 
        show: Boolean(ccRecipients.trim()) 
      },
      { 
        label: 'Bcc:', 
        emails: bccRecipients, 
        show: Boolean(bccRecipients.trim()) 
      }
    ];

    const hasAnyRecipients = recipients.some(r => r.show);
    if (!hasAnyRecipients) return null;

    return (
      <div className="mb-3 p-2 border-l-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-r-md">
        <div className="space-y-1">
          {recipients.map(recipient => {
            if (!recipient.show) return null;
            
            return (
              <div key={recipient.label} className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {recipient.label}
                </span>
                {recipient.emails.split(',').map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {email.trim()}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  useEffect(() => {
    addDarkModeStyles();
  }, []);

  const isMigratedToS3 = comment.s3_html_url && comment.content?.startsWith('[MIGRATED_TO_S3]');
  const loadS3Content = useCallback(async () => {
    if (!isMigratedToS3 || comment.id === -1 || s3Content || isLoadingS3) {
      return;
    }

    setIsLoadingS3(true);
    try {
      const response = await getCommentS3Content(comment.id);

      if (response.status === 'loaded_from_s3' && response.content) {
        if (response.content.startsWith('[MIGRATED_TO_S3]')) {
          const cleanContent =
            comment.content?.replace(/^\[MIGRATED_TO_S3\][^"]*"[^"]*"/, '').trim() || '';
          setS3Content(cleanContent || 'Content temporarily unavailable');
        } else {
          setS3Content(response.content);
        }
      } else {
        setS3Content(response.content);
      }
    } catch (error) {
      console.error('Error loading S3 content:', error);
      const cleanContent =
        comment.content?.replace(/^\[MIGRATED_TO_S3\][^"]*"[^"]*"/, '').trim() || comment.content;
      setS3Content(cleanContent);
    } finally {
      setIsLoadingS3(false);
    }
  }, [comment.id, comment.content, isMigratedToS3, s3Content, isLoadingS3]);

  useEffect(() => {
    if (isMigratedToS3 && !s3Content && !isLoadingS3) {
      loadS3Content();
    }
  }, [isMigratedToS3, loadS3Content, s3Content, isLoadingS3]);

  let senderName = 'Unknown Sender';
  let senderIdentifier = 'unknown';
  let fullContent = comment.content;
  let isUserReply = false;
  const isInitialMessage = comment.id === -1;
  const isAgentMessage = !!comment.agent;
  if (isMigratedToS3 && s3Content) {
    fullContent = s3Content;
  }
  const autoResponseMatch = fullContent.match(/<auto-response>(.*?)<\/auto-response>/);
  const isAutoResponse = !!autoResponseMatch;
  const autoResponseType = autoResponseMatch ? autoResponseMatch[1] : null;
  if (isAutoResponse) {
    fullContent = fullContent.replace(/<auto-response>.*?<\/auto-response>/, '').trim();
  }

  const parsedSender = parseSenderFromContent(fullContent);

  if (isInitialMessage && comment.user) {
    senderName = comment.user.name || 'User';
    senderIdentifier = comment.user.email || `user-${comment.user.id}`;
  } else if (parsedSender) {
    isUserReply = true;
    senderName = parsedSender.name;
    senderIdentifier = parsedSender.email;

    if (fullContent.includes('<original-sender>')) {
      fullContent = fullContent.replace(/<original-sender>.*?<\/original-sender>/g, '');
    } else {
      const hrIndex = fullContent.indexOf('<hr>');
      fullContent = hrIndex !== -1 ? fullContent.substring(hrIndex + 4).trim() : fullContent;
    }
  } else if (isAgentMessage) {
    senderName = comment.agent?.name || 'Agent';
    senderIdentifier = comment.agent?.email || `agent-${comment.agent?.id}`;
  } else if (comment.user) {
    senderName = comment.user.name || 'User';
    senderIdentifier = comment.user.email || `user-${comment.user.id}`;
  }
  if (isAutoResponse) {
    senderName = 'System';
    senderIdentifier = 'system@enque.cc';
  }

  let formattedDate = comment.created_at;
  try {
    const dateString = comment.created_at;
    const hasTimezone = /Z|([+-]\d{2}:\d{2})$/.test(dateString);
    const dateStrToParse = hasTimezone ? dateString : `${dateString}Z`;
    formattedDate = formatDistanceToNow(new Date(dateStrToParse), { addSuffix: true });
  } catch (e) {
    console.error('Error formatting comment date:', comment.created_at, e);
  }

  const agentAvatarColors = ['#1D73F4', '#D4E4FA'];
  const userAvatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];
  const avatarColors = isInitialMessage || isUserReply ? userAvatarColors : agentAvatarColors;

  const applyAgentBackground = isAgentMessage && !isInitialMessage && !isUserReply;

  let displayReplyPart = fullContent;
  let displayQuotedPart: string | null = null;
  let showToggleButton = false;

  if (isUserReply && fullContent) {
    const quoteStartIndex = findQuoteStartIndex(fullContent);
    if (quoteStartIndex !== -1) {
      displayReplyPart = fullContent.substring(0, quoteStartIndex);
      displayQuotedPart = fullContent.substring(quoteStartIndex);
      if (displayQuotedPart.replace(/<[^>]*>/g, '').trim().length > 20) {
        showToggleButton = true;
      } else {
        displayReplyPart = fullContent;
        displayQuotedPart = null;
      }
    } else {
      displayReplyPart = fullContent;
    }
  } else if (fullContent) {
    displayReplyPart = fullContent;
  } else {
    displayReplyPart = '';
  }

  let currentDisplayReplyPart = typeof displayReplyPart === 'string' ? displayReplyPart : '';

  if (currentDisplayReplyPart && (isUserReply || isInitialMessage)) {
    currentDisplayReplyPart = cleanReplyPreamble(currentDisplayReplyPart);
    currentDisplayReplyPart = preserveEmptyParagraphs(currentDisplayReplyPart);
  }
  
  // Procesar enlaces para que sean clicables y se abran en nueva pestaña
  if (currentDisplayReplyPart) {
    currentDisplayReplyPart = processLinksForNewTab(currentDisplayReplyPart);
  }

  const isOnlyAttachmentPlaceholder =
    comment.content?.startsWith('Correo original contenía') &&
    comment.content?.endsWith('adjunto(s).') &&
    comment.attachments &&
    comment.attachments.length > 0;

  useEffect(() => {
    const makeImagesClickable = () => {
      if (!currentDisplayReplyPart) {
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(currentDisplayReplyPart, 'text/html');

      // Hacer clickeable tanto las imágenes de email como las subidas por agentes
      const imgElements = doc.querySelectorAll('img');

      imgElements.forEach(img => {
        const imgElement = img as HTMLImageElement;
        imgElement.style.cursor = 'pointer';
        // Mejorar el tamaño de las imágenes de agentes
        if (!imgElement.classList.contains('email-extracted-image')) {
          imgElement.style.maxWidth = '300px';
          imgElement.style.maxHeight = '200px';
          imgElement.style.width = 'auto';
          imgElement.style.height = 'auto';
          imgElement.style.objectFit = 'contain';
        }
      });
    };

    makeImagesClickable();
  }, [currentDisplayReplyPart]);

  // Prepare agent data for avatar hook when dealing with agent messages
  const agentForAvatar = isAgentMessage ? comment.agent : null;

  // Use the agent avatar hook to get the appropriate avatar component
  const { AvatarComponent: AgentAvatarComponent } = useAgentAvatar({
    agent: agentForAvatar,
    size: 40,
    variant: 'beam',
    className: 'border',
  });

  // AHORA, después de todos los hooks, verificar si mostrar skeleton
  // Si es contenido S3 y aún no se ha cargado, mostrar skeleton
  if (isMigratedToS3 && !s3Content) {
    return (
      <div className="flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 p-3 rounded-md">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  const handleImageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = target.getAttribute('src');
      if (src) {
        setSelectedImageSrc(src);
        setIsImageModalOpen(true);
      }
    }
  };

  const handleCloseImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImageSrc(null);
  };

  const handlePreviewAttachment = (attachment: IAttachment) => {
    setSelectedAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedAttachment(null);
  };

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app/v1';

  const handleDownloadAttachment = (attachment: IAttachment) => {
    // Determinar si es URL completa (S3) o relativa (API)
    let downloadUrl: string;

    if (attachment.download_url.startsWith('http')) {
      // Es una URL completa de S3, usar directamente
      downloadUrl = attachment.download_url;
    } else {
      // Es URL relativa de API, construir URL completa
      downloadUrl = `${apiBaseUrl}${attachment.download_url.startsWith('/') ? attachment.download_url : '/' + attachment.download_url}`;
    }

    console.log('Downloading attachment:', attachment.file_name, 'from URL:', downloadUrl);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', attachment.file_name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine which avatar to render
  const renderAvatar = () => {
    // Always use user colors for initial messages and user replies, regardless of comment.agent
    if (isInitialMessage || isUserReply) {
      return <Avatar size={40} name={senderIdentifier} variant="beam" colors={userAvatarColors} />;
    }

    // For auto-responses and system messages, use system colors
    if (isAutoResponse) {
      return <Avatar size={40} name={senderIdentifier} variant="beam" colors={avatarColors} />;
    }

    // Only use agent avatar for messages that are ACTUALLY from agents (not user messages with comment.agent set)
    // This means: has comment.agent AND is not a user reply AND is not initial message AND is not auto-response
    if (isAgentMessage && !isUserReply && !isInitialMessage && !isAutoResponse) {
      return AgentAvatarComponent;
    }

    // For any other case (including users that might have comment.agent set), use user colors
    return <Avatar size={40} name={senderIdentifier} variant="beam" colors={userAvatarColors} />;
  };

  return (
    <>
      <div
        ref={commentRef}
        className={cn(
          'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0',
          comment.is_private
            ? 'bg-yellow-50 dark:bg-yellow-800/30 p-3 rounded-md'
            : isAutoResponse
              ? 'bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md border-l-4 border-blue-500'
              : applyAgentBackground
                ? 'bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md'
                : 'p-3 rounded-md'
        )}
      >
        {renderAvatar()}
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <p className="text-sm font-medium leading-none">
              {senderName}
              {isAutoResponse && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  🤖 Auto Response {autoResponseType && `(${autoResponseType.replace('_', ' ')})`}
                </span>
              )}
              {comment.is_private && !isOnlyAttachmentPlaceholder && !isAutoResponse && (
                <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-400">
                  (Private Note)
                </span>
              )}
              {isOnlyAttachmentPlaceholder && comment.is_private && (
                <span className="ml-2 text-xs text-muted-foreground">(Archivos Adjuntos)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
          </div>

          {/* ✅ Show email recipients for ALL comments (not just first message) */}
          {renderEmailRecipients()}

          <div className={`max-w-none break-words overflow-x-auto`}>
            {!isOnlyAttachmentPlaceholder && (
              <div
                className={`text-sm text-black dark:text-white prose dark:prose-invert max-w-none whitespace-pre-line prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:underline ${
                  isAgentMessage && !isUserReply && !isInitialMessage && !isAutoResponse
                    ? '[&_*]:!text-black dark:[&_*]:!text-white'
                    : 'user-message-content'
                }`}
                dangerouslySetInnerHTML={{ __html: currentDisplayReplyPart }}
                onClick={handleImageClick}
                style={{
                  color: 'inherit',
                }}
              />
            )}

            {showToggleButton && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1 p-1 rounded bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50"
                >
                  <ChevronsUpDown className="h-3 w-3 flex-shrink-0" />
                  {isExpanded ? 'Show less' : 'Show quoted text'}
                </button>

                {isExpanded && displayQuotedPart && (
                  <div
                    className={`mt-2 p-2 border-l-2 border-gray-200 dark:border-gray-700 text-muted-foreground quoted-content message-content-container ${
                      isAgentMessage && !isUserReply && !isInitialMessage && !isAutoResponse
                        ? '[&_*]:!text-muted-foreground'
                        : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: processLinksForNewTab(displayQuotedPart) }}
                    style={{ 
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      color: 'inherit'
                    }}
                  />
                )}
              </div>
            )}

            {comment.attachments && comment.attachments.length > 0 && (
              <div
                className={cn('mt-3 pt-3 border-t border-slate-200 dark:border-slate-700', {
                  'mt-0 pt-0 border-t-0': isOnlyAttachmentPlaceholder,
                })}
              >
                <p
                  className={cn('text-xs font-medium text-muted-foreground mb-2', {
                    'sr-only': isOnlyAttachmentPlaceholder,
                  })}
                >
                  Attachments:
                </p>
                <div className="flex flex-wrap gap-2 items-start">
                  {comment.attachments.map(att => {
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors max-w-xs group relative"
                      >
                        <div
                          className="flex items-center min-w-0 mr-2 cursor-pointer flex-grow"
                          onClick={() => handlePreviewAttachment(att)}
                          title={`Preview ${att.file_name}`}
                        >
                          {getFileIcon(
                            att.content_type,
                            'h-5 w-5 mr-1.5 text-muted-foreground flex-shrink-0'
                          )}
                          <div className="flex flex-col min-w-0">
                            <span
                              className="text-xs font-medium text-foreground truncate"
                              title={att.file_name}
                            >
                              {att.file_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {att.size_text || formatFileSize(att.file_size)}
                            </span>
                          </div>
                        </div>
                        <IconButton
                          onClick={() => handleDownloadAttachment(att)}
                          aria-label={`Download ${att.file_name}`}
                          title={`Download ${att.file_name}`}
                          size="small"
                          sx={{ p: '2px' }}
                        >
                          <DownloadIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        </IconButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedAttachment && (
        <Modal
          open={isPreviewOpen}
          onClose={handleClosePreview}
          aria-labelledby="attachment-preview-title"
          aria-describedby="attachment-preview-content"
        >
          <Box sx={muiModalStyle}>
            <Box
              sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #eee',
              }}
            >
              <Typography
                id="attachment-preview-title"
                variant="h6"
                component="h2"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={selectedAttachment.file_name}
              >
                {selectedAttachment.file_name}
              </Typography>
              <IconButton onClick={handleClosePreview} aria-label="Close preview">
                <MuiCloseIcon />
              </IconButton>
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                p: { xs: 0.5, sm: 1 },
                width: '100%',
                height: '100%',
                minHeight: 0,
              }}
            >
              <DocViewer
                key={selectedAttachment.id}
                documents={[
                  {
                    uri: selectedAttachment.download_url.startsWith('http')
                      ? selectedAttachment.download_url
                      : `${apiBaseUrl}${selectedAttachment.download_url.startsWith('/') ? selectedAttachment.download_url : '/' + selectedAttachment.download_url}`,
                    fileName: selectedAttachment.file_name,
                    fileType: selectedAttachment.content_type,
                  },
                ]}
                pluginRenderers={DocViewerRenderers}
                config={{
                  header: { disableHeader: true },
                  csvDelimiter: ',',
                  pdfZoom: { defaultZoom: 1, zoomJump: 0.1 },
                  pdfVerticalScrollByDefault: true,
                }}
                className="w-full h-full"
              />
            </Box>
          </Box>
        </Modal>
      )}

      {selectedImageSrc && (
        <Modal
          open={isImageModalOpen}
          onClose={handleCloseImageModal}
          aria-labelledby="image-preview-title"
          aria-describedby="image-preview-content"
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: '900px',
              height: '85vh',
              bgcolor: 'background.paper',
              border: '2px solid #000',
              boxShadow: 24,
              p: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <div></div>
              <IconButton onClick={handleCloseImageModal} aria-label="Cerrar vista previa">
                <MuiCloseIcon />
              </IconButton>
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              <Image
                src={selectedImageSrc}
                alt="Image Preview"
                width={1000}
                height={1000}
                unoptimized={true}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
              />
            </Box>
          </Box>
        </Modal>
      )}

      <style jsx global>{`
        #msdoc-iframe {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          border: none !important;
        }
        #react-doc-viewer,
        #proxy-renderer,
        #msdoc-renderer {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        #msdoc-renderer {
          display: block !important;
        }

        /* Estilos para el cuerpo del mensaje en la conversación */
        .prose p:not(.email-signature p):not(.email-signature) {
          line-height: 1.2; /* Reducir el interlineado general */
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }

        /* Añadir estilo específico para párrafos vacíos para preservar espaciado */
        .prose p:empty,
        .prose p:has(br:only-child) {
          min-height: 1.2em; /* Asegurar que los párrafos vacíos tengan altura */
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }

        /* Estilos específicos para la firma en la conversación */
        .prose .email-signature p,
        .prose .email-signature {
          color: #6b7280 !important; /* text-gray-500 */
          margin-top: 0 !important;
          margin-bottom: 0.1em !important; /* Reducido para ajustarse a line-height: 0.6 */
          line-height: 0.6 !important; /* Ajustado a 0.6 */
        }
        .prose .email-signature br {
          line-height: 1 !important;
        }
        .prose .email-signature img {
          margin-top: 0.25em !important; /* Reducido para acercar la imagen */
          margin-bottom: 0 !important;
          width: 150px !important;
          height: 92px !important;
          max-width: 150px !important;
          max-height: 92px !important;
          object-fit: scale-down !important;
        }
        /* Asegurar que el subrayado se muestre correctamente */
        .prose a {
          text-decoration: underline !important;
        }
        /* Para asegurar que el texto dentro de la firma sea mas pequeño */
        .prose .email-signature,
        .prose .email-signature p,
        .prose .email-signature span,
        .prose .email-signature em,
        .prose .email-signature strong {
          font-size: 0.9em !important; /* Hacemos la fuente un poco más pequeña */
          line-height: 0.6 !important; /* Aplicar también aquí para consistencia */
        }

        /* Estilos para el texto citado */
        .mt-2.p-2.border-l-2.border-gray-200.dark\\:border-gray-700.text-muted-foreground {
          font-size: 0.8em !important;
          line-height: 1 !important;
        }

        /* Asegurar que todos los elementos dentro del texto citado sean más pequeños */
        .mt-2.p-2.border-l-2.border-gray-200.dark\\:border-gray-700.text-muted-foreground *,
        .gmail_quote_container,
        .gmail_quote,
        .gmail_quote * {
          font-size: 0.85em !important;
          line-height: 1 !important;
        }

        /* Estilos específicos para el encabezado de citas */
        .gmail_attr {
          font-size: 0.8em !important;
          color: #6b7280 !important; /* text-gray-500 */
          margin-bottom: 0.5em !important;
          line-height: 1 !important;
        }
      `}</style>
    </>
  );
}