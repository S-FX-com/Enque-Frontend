import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from 'boring-avatars'; 
import { IComment } from '@/typescript/comment';
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

export function ConversationMessageItem({ comment }: Props) {
    let senderName = 'Unknown Sender';
    let senderIdentifier = 'unknown';
    let displayContent = comment.content;
    let isUserReply = false;
    const isInitialMessage = comment.id === -1; 

    const parsedSender = parseSenderFromContent(comment.content);

    if (isInitialMessage && comment.user) {
         senderName = comment.user.name || 'User';
         senderIdentifier = comment.user.email || `user-${comment.user.id}`;
    } else if (parsedSender) {
        isUserReply = true;
        senderName = parsedSender.name;
        senderIdentifier = parsedSender.email; 
        const hrIndex = comment.content.indexOf('<hr>');
        displayContent = hrIndex !== -1 ? comment.content.substring(hrIndex + 4).trim() : '';
    } else if (comment.agent) {
        senderName = comment.agent.name || 'Agent';
        senderIdentifier = comment.agent.email || `agent-${comment.agent.id}`; 
    }

    let formattedDate = comment.created_at; 
    try {
        const dateString = comment.created_at;
        const hasTimezone = /Z|([+-]\d{2}:\d{2})$/.test(dateString);
        const dateStrToParse = hasTimezone ? dateString : `${dateString}Z`;
        formattedDate = formatDistanceToNow(new Date(dateStrToParse), { addSuffix: true }); 
    } catch (e) {
        console.error("Error formatting comment date:", comment.created_at, e);
    }

    const agentAvatarColors = ["#1D73F4", "#D4E4FA"]; // Original blue palette for agents
    const userAvatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989']; // Varied pastels for users/replies
    const avatarColors = (isInitialMessage || isUserReply) ? userAvatarColors : agentAvatarColors;

    return (
        <div className={`flex items-start space-x-3 py-4 border-b last:border-b-0 ${comment.is_private ? 'bg-yellow-50 dark:bg-yellow-900 p-3 rounded-lg' : ''}`}>

            <Avatar
                size={40} 
                name={senderIdentifier} 
                variant="beam" 
                colors={avatarColors} 
            />
            <div className="flex-1 min-w-0">
                <div className="mb-1">
                    <p className="text-sm font-medium leading-none">
                        {senderName}
                        {comment.is_private && (
                            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">(Private Note)</span>
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
                </div>
                <div
                    className={`max-w-none break-words overflow-x-auto`} 
                >
                    <div
                       className="text-sm text-foreground" 
                       dangerouslySetInnerHTML={{ __html: displayContent }}
                    />
                </div>
            </div>
        </div>
    );
}
