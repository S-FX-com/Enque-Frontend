"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Remove Textarea import
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
// Remove formatting icons, they are in the toolbar now
import { Send, Mail } from 'lucide-react';
import { ITicket } from '@/typescript/ticket';
import { IComment } from '@/typescript/comment';
// Import the specific interface for creating comments if defined, or use inline object
import { getCommentsByTaskId, createComment, CreateCommentPayload } from '@/services/comment';
import { ConversationMessageItem } from '@/components/conversation-message-item';
import { getCurrentUser } from '@/lib/auth';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor'; // Import the new editor
// import { useToast } from "@/components/ui/use-toast";

interface Props {
    ticket: ITicket;
    // Add props for handling reply, fetching conversation, etc. later
}

export function TicketConversation({ ticket }: Props) {
    // replyContent now stores HTML from Tiptap
    const [replyContent, setReplyContent] = useState('');
    const [isPrivateNote, setIsPrivateNote] = useState(false);
    const [comments, setComments] = useState<IComment[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Loading for initial fetch
    const [isSending, setIsSending] = useState(false); // Loading for sending reply
    const [error, setError] = useState<string | null>(null);
    // const { toast } = useToast(); // Initialize toast if using

    // Use useCallback for fetchComments
    const fetchComments = useCallback(async () => {
        if (!ticket?.id) {
            setComments([]); // Clear comments if no ticket id
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fetchedComments = await getCommentsByTaskId(ticket.id);
            setComments(fetchedComments);
        } catch (err) {
            console.error("Failed to fetch comments:", err instanceof Error ? err.message : err);
            setError("Failed to load conversation history.");
        } finally {
            setIsLoading(false);
        }
    }, [ticket?.id]); // Dependency: ticket.id

    // Fetch comments when the component mounts or ticket ID changes
    useEffect(() => {
        fetchComments();
    }, [fetchComments]); // Dependency: fetchComments callback

    const handleSendReply = async () => { // Make async
        if (!replyContent.trim() || !ticket?.id || isSending) return; // Prevent sending empty or while sending

        setIsSending(true);
        setError(null); // Clear previous errors

        try {
            // Get current user data to include agent_id and workspace_id
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                throw new Error("User not authenticated"); // Or handle appropriately
            }

            // Construct the full payload required by the backend validation schema
            const payload: CreateCommentPayload = {
                content: replyContent,
                ticket_id: ticket.id, // Get ticket_id from the ticket prop
                agent_id: currentUser.id, // Get agent_id from the current user session
                workspace_id: currentUser.workspace_id, // Get workspace_id from the current user session
                is_private: isPrivateNote,
            };

            const newComment = await createComment(ticket.id, payload);
            // Add the new comment to the list
            setComments((prevComments) => [...prevComments, newComment]);
            setReplyContent(''); // Clear the editor content (will trigger useEffect in RichTextEditor)
            setIsPrivateNote(false); // Reset private note switch
            // Optional: Show success toast
            // toast({ title: "Success", description: "Reply sent successfully." });
        } catch (err) {
            console.error("Failed to send reply:", err instanceof Error ? err.message : err);
            setError("Failed to send reply. Please try again."); // Set error state
            // Optional: Show error toast
            // toast({ variant: "destructive", title: "Error", description: "Failed to send reply." });
        } finally {
            setIsSending(false);
        }
    };

    return (
        // Increased vertical spacing between cards
        <div className="flex flex-col h-full space-y-6">
            {/* Subject Section - Updated Format */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"> {/* Use flex container */}
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" /> {/* Mail icon */}
                        {/* Apply gray color to ticket ID */}
                        <span className="text-muted-foreground">#{ticket.id}</span> 
                        <span>- {ticket.title}</span> {/* Separator and title */}
                    </div>
                </CardContent>
            </Card>

            {/* Conversation History Section */}
            <Card className="flex-1 flex flex-col min-h-0">
                <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="text-lg">Conversation</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto space-y-4">
                    {/* Display initial message */}
                    {ticket.body?.email_body && ticket.user && (
                        <ConversationMessageItem
                            key="initial-message"
                            comment={{
                                id: -1, 
                                content: ticket.body.email_body,
                                created_at: ticket.created_at,
                                updated_at: ticket.created_at,
                                user: ticket.user, 
                                agent: null, 
                                ticket_id: ticket.id,
                                workspace_id: ticket.user.workspace_id,
                            }}
                        />
                    )}
                    {/* Separator */}
                    {ticket.body?.email_body && ticket.user && (isLoading || comments.length > 0) && (
                        <div className="border-b my-2"></div> // Added margin for separator
                    )}

                    {/* Loading Skeletons */}
                    {isLoading && (
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !isLoading && (
                         // Display error related to fetching or sending
                        <div className="text-center text-red-500 py-4">{error}</div>
                    )}

                    {/* Display Comments */}
                    {!isLoading && comments.length === 0 && !(ticket.body?.email_body && ticket.user) && (
                        <div className="text-center text-muted-foreground py-10">
                            No conversation history found.
                        </div>
                    )}
                    {/* Display Comments in original order (oldest first) */}
                    {!isLoading && comments.map((comment) => (
                        <ConversationMessageItem key={comment.id} comment={comment} />
                    ))}
                </CardContent>
            </Card>

            {/* Reply Area Section */}
            <Card>
                <CardContent className="p-4 space-y-3">
                    {/* Replace Textarea and static toolbar with RichTextEditor */}
                    <RichTextEditor
                        content={replyContent}
                        onChange={setReplyContent} // Pass the state setter directly
                        placeholder={isPrivateNote ? "Write a private note..." : "Type your reply here..."}
                        disabled={isSending} // Disable editor while sending
                    />
                    {/* Display sending error */}
                    {error && ( // Show error regardless of isSending state here
                         <p className="text-xs text-red-500 pt-1">{error}</p>
                    )}
                    <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="private-note"
                                checked={isPrivateNote}
                                onCheckedChange={setIsPrivateNote}
                                disabled={isSending} // Disable switch while sending
                            />
                            <Label htmlFor="private-note">Private Note</Label>
                        </div>
                        {/* Disable button if content is empty (check HTML for empty tags) or sending */}
                        <Button onClick={handleSendReply} disabled={!replyContent || replyContent === '<p></p>' || isSending}>
                            {isSending ? (
                                <>
                                    {/* Loading indicator */}
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
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
