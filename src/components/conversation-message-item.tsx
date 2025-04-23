import React from 'react';
import { formatDistanceToNow } from 'date-fns'; // Revert back to formatDistanceToNow
import Avatar from 'boring-avatars'; // Importar de boring-avatars
import { IComment } from '@/typescript/comment';
// Removed unused imports: IUser, IAgent
// import { IUser, IAgent } from '@/typescript/user'; 

interface Props {
    comment: IComment;
    // Optional: Add a prop if we need to display the initial message differently
    // isInitialMessage?: boolean;
    // initialSender?: IUser | null; // Pass initial sender if needed
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
    const isInitialMessage = comment.id === -1; // Use const as it's not reassigned

    const parsedSender = parseSenderFromContent(comment.content);

    if (isInitialMessage && comment.user) {
         // Handle the initial message created in the frontend
         senderName = comment.user.name || 'User';
         senderIdentifier = comment.user.email || `user-${comment.user.id}`;
         // displayContent remains comment.content (which is the email body)
    } else if (parsedSender) {
        // It's a user reply parsed from content
        isUserReply = true;
        senderName = parsedSender.name;
        senderIdentifier = parsedSender.email; // Use email for avatar consistency
        // Extract content after the <hr> tag
        const hrIndex = comment.content.indexOf('<hr>');
        displayContent = hrIndex !== -1 ? comment.content.substring(hrIndex + 4).trim() : '';
    } else if (comment.agent) {
        // It's a comment from an agent (or a system comment associated with an agent)
        senderName = comment.agent.name || 'Agent';
        // Use agent's email as primary identifier for consistency, fallback to ID
        senderIdentifier = comment.agent.email || `agent-${comment.agent.id}`; 
    }
    // Fallback if no sender identified (should ideally not happen)

    let formattedDate = comment.created_at; // Fallback
    try {
        // Ensure the date string is treated as UTC by appending 'Z' if no timezone info exists
        const dateString = comment.created_at;
        const hasTimezone = /Z|([+-]\d{2}:\d{2})$/.test(dateString);
        const dateStrToParse = hasTimezone ? dateString : `${dateString}Z`;
        // Remove includeSeconds: true
        formattedDate = formatDistanceToNow(new Date(dateStrToParse), { addSuffix: true }); 
    } catch (e) {
        console.error("Error formatting comment date:", comment.created_at, e);
    }

    // Assume content is always HTML from Tiptap or initial email body
    // const isHtmlContent = isUserReply || isInitialMessage || /<[a-z][\s\S]*>/i.test(displayContent);

    // Define color palettes
    const agentAvatarColors = ["#1D73F4", "#D4E4FA"]; // Original blue palette for agents
    const userAvatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989']; // Varied pastels for users/replies

    // Determine which palette to use
    const avatarColors = (isInitialMessage || isUserReply) ? userAvatarColors : agentAvatarColors;

    return (
        <div className="flex items-start space-x-3 py-4 border-b last:border-b-0">
            {/* Usar el componente Avatar de boring-avatars */}
            <Avatar
                size={40} // Tamaño del avatar
                name={senderIdentifier} // Identificador único para generar el avatar
                variant="beam" // Variante solicitada
                colors={avatarColors} // Paleta de colores claros
            />
            {/* Add min-w-0 to allow content to shrink and scroll */}
            <div className="flex-1 min-w-0">
                {/* Container for Name and Timestamp */}
                <div className="mb-1">
                    {/* Sender Name */}
                    <p className="text-sm font-medium leading-none">
                        {senderName}
                        {comment.is_private && (
                            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">(Private Note)</span>
                        )}
                    </p>
                    {/* Timestamp below name */}
                    <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
                </div>
                {/* Message Content - Remove prose classes, always render HTML */}
                <div
                    className={`max-w-none break-words overflow-x-auto ${comment.is_private ? 'bg-yellow-50 dark:bg-yellow-900 p-2 rounded-md' : ''}`}
                >
                    {/* Render content using dangerouslySetInnerHTML */}
                    {/* Apply text size and color classes here if needed, or rely on global styles */}
                    <div
                       className="text-sm text-foreground" /* Apply base text styles */
                       dangerouslySetInnerHTML={{ __html: displayContent }}
                    />
                </div>
            </div>
        </div>
    );
}
