import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from 'boring-avatars';
import { IComment } from '@/typescript/comment';
import { cn } from '@/lib/utils';
import { ChevronsUpDown } from 'lucide-react';

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

export function ConversationMessageItem({ comment }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  if (isUserReply) {
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
    }
  }

  return (
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
            {comment.is_private && (
              <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-400">
                (Private Note)
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>
        <div className={`max-w-none break-words overflow-x-auto`}>
          <div
            className="text-sm text-foreground"
            dangerouslySetInnerHTML={{ __html: displayReplyPart }}
          />

          {showToggleButton && (
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

          {showToggleButton && isExpanded && displayQuotedPart && (
            <div
              className="mt-2 pt-2 border-t border-dashed border-slate-300 dark:border-slate-600 text-muted-foreground text-xs"
              dangerouslySetInnerHTML={{ __html: displayQuotedPart }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
