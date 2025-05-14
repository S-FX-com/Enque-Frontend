import React, { useState } from 'react';
import '@cyntler/react-doc-viewer/dist/index.css'; // Estilos para DocViewer
import { formatDistanceToNow } from 'date-fns';
import Avatar from 'boring-avatars';
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

// Importaciones de MUI
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MuiCloseIcon from '@mui/icons-material/Close'; // Alias para el icono de cierre de MUI

// Definición de colores para los tipos de archivo
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

// Interfaz Props restaurada a su posición original
interface Props {
  comment: IComment;
}

// Helper function to parse sender info from comment content
const parseSenderFromContent = (content: string): { name: string; email: string } | null => {
  const match = content.match(/<p><strong>From:<\/strong>\s*(.*?)\s*<(.*?)><\/p><hr>/);
  if (match && match[1] && match[2]) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return null;
};

// Helper to find the start of the quoted text
function findQuoteStartIndex(html: string): number {
  const patterns = [
    // Common email quote headers
    /On .*? wrote:/i,
    /From:.*?</i, // Basic check for lines starting with From:
    /Sent from my /i, // e.g., Sent from my iPhone
    // HTML quote elements
    /<div class="gmail_quote">/i,
    /<blockquote class="gmail_quote">/i,
    /<blockquote.*?type="cite">/i,
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
      // Avoid matching the <hr> added by our backend parser if it's right at the start
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

// Helper para obtener el icono del archivo
const getFileIcon = (contentType: string, className: string = 'h-5 w-5 mr-1.5 flex-shrink-0') => {
  let fileTypeKey = 'generic_attach'; // Clave por defecto
  let iconComponent; // Variable para el componente del icono

  // Determinar la clave del tipo de archivo y el componente del icono
  if (contentType === 'application/pdf') {
    fileTypeKey = 'pdf';
    iconComponent = DocumentPdfIcon;
  } else if (
    contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/msword'
  ) {
    fileTypeKey = 'word';
    iconComponent = FluentDocumentIcon; // Usando genérico, pero se coloreará como Word
  } else if (
    contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    contentType === 'application/vnd.ms-excel'
  ) {
    fileTypeKey = 'excel';
    iconComponent = FluentDocumentIcon; // Usando genérico, pero se coloreará como Excel
  } else if (
    contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    contentType === 'application/vnd.ms-powerpoint'
  ) {
    fileTypeKey = 'powerpoint';
    iconComponent = FluentDocumentIcon; // Usando genérico, pero se coloreará como PowerPoint
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
  const PassThroughComponent = iconComponent; // Para que JSX lo interprete como componente

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

// Helper function to clean specific reply preamble lines
const cleanReplyPreamble = (html: string): string => {
  if (!html) return '';
  // Pattern for: "El [día], [dd] [mes] [aaaa] a la(s) [hh:mm] [a.m./p.m.], [Nombre] ([Email]) escribió:"
  const spanishReplyHeaderPattern =
    /El (?:lun|mar|mié|jue|vie|sáb|dom), \d{1,2} (?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic) \d{4} a la\(s\) \d{1,2}:\d{2}(?:&#8239;|\s)?(?:a\.m\.|p\.m\.), [^<]+ \([^)]+\) escribió:/i;

  let cleanedHtml = html.replace(spanishReplyHeaderPattern, '');

  // Remove potentially empty <p> tags that might result from the replacement
  cleanedHtml = cleanedHtml.replace(/<p>\s*<\/p>/gi, '');
  // Trim leading <br> tags that might be left alone
  cleanedHtml = cleanedHtml.replace(/^\s*(?:<br\s*\/?>\s*)+/i, '');
  // Trim trailing <br> tags that might be left alone (corregido)
  cleanedHtml = cleanedHtml.replace(/(?:<br\s*\/?>\s*)+$/i, '');

  return cleanedHtml.trim();
};

// Estilos para el Box del Modal de MUI
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

export function ConversationMessageItem({ comment }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<IAttachment | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  let senderName = 'Unknown Sender';
  let senderIdentifier = 'unknown';
  let fullContent = comment.content;
  let isUserReply = false;
  const isInitialMessage = comment.id === -1;
  const isAgentMessage = !!comment.agent;

  const parsedSender = parseSenderFromContent(fullContent);

  if (isInitialMessage && comment.user) {
    senderName = comment.user.name || 'User';
    senderIdentifier = comment.user.email || `user-${comment.user.id}`;
  } else if (parsedSender) {
    isUserReply = true;
    senderName = parsedSender.name;
    senderIdentifier = parsedSender.email;
    const hrIndex = fullContent.indexOf('<hr>');
    fullContent = hrIndex !== -1 ? fullContent.substring(hrIndex + 4).trim() : fullContent;
  } else if (isAgentMessage) {
    senderName = comment.agent?.name || 'Agent';
    senderIdentifier = comment.agent?.email || `agent-${comment.agent?.id}`;
  } else if (comment.user) {
    senderName = comment.user.name || 'User';
    senderIdentifier = comment.user.email || `user-${comment.user.id}`;
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
    // Añadido check para fullContent por si acaso
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
    // Si no es UserReply (podría ser initialMessage o solo Agent), displayReplyPart es fullContent
    displayReplyPart = fullContent;
  } else {
    displayReplyPart = ''; // Asegurar que displayReplyPart sea siempre un string
  }

  // Asegurar que displayReplyPart es un string antes de limpiarlo
  let currentDisplayReplyPart = typeof displayReplyPart === 'string' ? displayReplyPart : '';

  // Clean the Spanish reply header from the determined reply part
  if (currentDisplayReplyPart && (isUserReply || isInitialMessage)) {
    currentDisplayReplyPart = cleanReplyPreamble(currentDisplayReplyPart);
  }

  // Determinar si el contenido del comentario es solo el mensaje de "contenía adjuntos"
  // y hay adjuntos reales para mostrar. Si es así, no mostramos este mensaje.
  const isOnlyAttachmentPlaceholder =
    comment.content?.startsWith('Correo original contenía') &&
    comment.content?.endsWith('adjunto(s).') &&
    comment.attachments &&
    comment.attachments.length > 0;

  const handlePreviewAttachment = (attachment: IAttachment) => {
    setSelectedAttachment(attachment);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedAttachment(null); // Limpiar el adjunto seleccionado al cerrar
  };

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app/v1';

  const handleDownloadAttachment = (attachment: IAttachment) => {
    const fullDownloadUrl = `${apiBaseUrl}${attachment.download_url.startsWith('/') ? attachment.download_url : '/' + attachment.download_url}`;
    console.log(
      'Attempting to download from absolute URL:',
      fullDownloadUrl,
      'Filename:',
      attachment.file_name
    );
    const link = document.createElement('a');
    link.href = fullDownloadUrl;
    link.setAttribute('download', attachment.file_name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        className={cn(
          'flex items-start space-x-3 py-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0',
          comment.is_private
            ? 'bg-yellow-50 dark:bg-yellow-800/30 p-3 rounded-md'
            : applyAgentBackground
              ? 'bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md'
              : 'p-3 rounded-md'
        )}
      >
        <Avatar size={40} name={senderIdentifier} variant="beam" colors={avatarColors} />
        <div className="flex-1 min-w-0">
          <div className="mb-1">
            <p className="text-sm font-medium leading-none">
              {senderName}
              {comment.is_private && !isOnlyAttachmentPlaceholder && (
                <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-400">
                  (Private Note)
                </span>
              )}
              {/* Si es el placeholder de adjuntos, y el comentario es privado, mostrar "Archivos Adjuntos" */}
              {isOnlyAttachmentPlaceholder && comment.is_private && (
                <span className="ml-2 text-xs text-muted-foreground">(Archivos Adjuntos)</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
          </div>
          <div className={`max-w-none break-words overflow-x-auto`}>
            {!isOnlyAttachmentPlaceholder && (
              <div
                className="text-sm text-foreground prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: currentDisplayReplyPart }}
              />
            )}

            {showToggleButton && !isOnlyAttachmentPlaceholder && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1 p-1 rounded bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50"
                aria-label={isExpanded ? 'Show less' : 'Show full message'}
              >
                <ChevronsUpDown className="h-3 w-3 flex-shrink-0" />
                {isExpanded ? 'Show less' : 'Show full message'}
              </button>
            )}

            {showToggleButton &&
              isExpanded &&
              displayQuotedPart &&
              !isOnlyAttachmentPlaceholder && (
                <div
                  className="mt-2 pt-2 border-t border-dashed border-slate-300 dark:border-slate-600 text-muted-foreground text-xs prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: displayQuotedPart || '' }}
                />
              )}

            {/* Sección para mostrar adjuntos */}
            {comment.attachments && comment.attachments.length > 0 && (
              <div
                className={cn('mt-3 pt-3 border-t border-slate-200 dark:border-slate-700', {
                  'mt-0 pt-0 border-t-0': isOnlyAttachmentPlaceholder, // No añadir margen ni borde superior si solo son adjuntos
                })}
              >
                <p
                  className={cn('text-xs font-medium text-muted-foreground mb-2', {
                    'sr-only': isOnlyAttachmentPlaceholder, // Ocultar "Attachments:" si es el único contenido
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
                              {formatFileSize(att.file_size)}
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

      {/* Modal de MUI para la vista previa del documento */}
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
                p: { xs: 0.5, sm: 1 }, // Reducir un poco el padding para dar más espacio
                width: '100%', // Asegurar ancho completo
                height: '100%', // Asegurar altura completa para que el DocViewer se expanda
                minHeight: 0, // Importante en contextos flex para que el hijo no se desborde
              }}
            >
              <DocViewer
                key={selectedAttachment.id}
                documents={[
                  {
                    uri: `${apiBaseUrl}${selectedAttachment.download_url.startsWith('/') ? selectedAttachment.download_url : '/' + selectedAttachment.download_url}`,
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

      {/* Estilos globales JSX para el iframe de DocViewer y sus contenedores */}
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
        /* Si #msdoc-renderer es el padre directo y necesita ser block para que el iframe se expanda */
        #msdoc-renderer {
          display: block !important; /* O podrías probar flex si el de arriba no funciona solo */
        }
      `}</style>
    </>
  );
}
