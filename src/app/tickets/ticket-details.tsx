"use client";

import React, { useState, useEffect } from "react"; 
import { useQueryClient } from "@tanstack/react-query"; 
import { X } from "lucide-react";
import BoringAvatar from 'boring-avatars';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ITicket, TicketStatus, TicketPriority } from "@/typescript/ticket";
import { Agent } from "@/typescript/agent";
import { formatRelativeTime } from "@/lib/utils";
import { TicketConversation } from './ticket-conversation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAgents } from "@/services/agent";
import { updateTicket } from "@/services/ticket";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth"; 

interface Props {
    ticket: ITicket | null;
    onClose: () => void;
    onTicketUpdate?: (updatedTicket: ITicket) => void; 
}

export function TicketDetail({ ticket, onClose, onTicketUpdate }: Props) {
    const queryClient = useQueryClient(); 
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoadingAgents, setIsLoadingAgents] = useState(true);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
    const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);
    useEffect(() => {
        const fetchAgents = async () => {
            setIsLoadingAgents(true);
            try {
                const fetchedAgents = await getAgents();
                setAgents(fetchedAgents);
            } catch (error) {
                console.error("Failed to fetch agents:", error);
            } finally {
                setIsLoadingAgents(false);
            }
        };
        fetchAgents();
    }, []);

    const handleUpdateField = async (field: 'status' | 'priority' | 'assignee_id', value: string | null) => {
        if (!ticket) return;
        if (field === 'status' && isUpdatingStatus) return;
        if (field === 'priority' && isUpdatingPriority) return;
        if (field === 'assignee_id' && isUpdatingAssignee) return;

        let updateValue: TicketStatus | TicketPriority | number | null;
        if (field === 'assignee_id') {
            updateValue = value === 'null' || value === null ? null : parseInt(value, 10);
             if (field === 'assignee_id' && typeof updateValue === 'number' && isNaN(updateValue)) {
                 console.error("Invalid assignee ID selected");
                 return;
             }
        } else {
            updateValue = value as TicketStatus | TicketPriority; 
        }
        if (ticket[field] === updateValue) {
            return;
        }
        if (field === 'status') setIsUpdatingStatus(true);
        if (field === 'priority') setIsUpdatingPriority(true);
        if (field === 'assignee_id') setIsUpdatingAssignee(true);
        const originalFieldValue = ticket[field];
        const optimisticTicket = {
            ...ticket,
            [field]: updateValue,
        };
        if (onTicketUpdate) {
            onTicketUpdate(optimisticTicket);
        }

        try {
            const updatedTicketData = await updateTicket(ticket.id, { [field]: updateValue });
            if (updatedTicketData) {
                if (onTicketUpdate) {
                    onTicketUpdate(updatedTicketData);
                }
               
                const currentUser = await getCurrentUser();
                const currentUserId = currentUser?.id;

                if (currentUserId) {
                    if (field === 'assignee_id') {
                        const previousAssigneeId = originalFieldValue; // Original assignee ID
                        const newAssigneeId = updateValue; 
                        if (previousAssigneeId === currentUserId || newAssigneeId === currentUserId) {
                            console.log(`Assignee changed for current user ${currentUserId}, invalidating assignedTickets query.`);
                            queryClient.invalidateQueries({ queryKey: ['assignedTickets', currentUserId] });
                        }
                    }
                   
                    else if (field === 'status' && ticket.assignee_id === currentUserId) {
                         console.log(`Status changed for ticket ${ticket.id} assigned to current user ${currentUserId}, invalidating assignedTickets query.`);
                         queryClient.invalidateQueries({ queryKey: ['assignedTickets', currentUserId] });
                    }
                }

            } else {

                 throw new Error(`API failed to update ticket ${field}`);
            }
        } catch (error) {
    
            console.error(`Error updating ticket ${field}:`, error);
            toast.error(`Failed to update ticket ${field}. Reverting changes for this field.`);
            if (onTicketUpdate && ticket) { // Ensure ticket exists before accessing it
               
                const revertedTicket = {
                    ...ticket, 
                    [field]: originalFieldValue // Revert only the field that failed
                };
                onTicketUpdate(revertedTicket);
            }
        } finally {
            if (field === 'status') setIsUpdatingStatus(false);
            if (field === 'priority') setIsUpdatingPriority(false);
            if (field === 'assignee_id') setIsUpdatingAssignee(false);
        }
    };

    const handleCloseTicket = async () => {
        console.log("Close ticket action placeholder:", ticket?.id);
        alert("Close functionality needs implementation.");
    };

    const handleDeleteTicket = async () => {
        console.log("Delete ticket action placeholder:", ticket?.id);
        alert("Delete functionality needs implementation.");
    };

    if (!ticket) {
        return null; // Don't render anything if no ticket is selected
    }

    const avatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/50 z-40" // Darker overlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                key={`overlay-${ticket.id}`}
            />
            <motion.div
                key={`panel-${ticket.id}`}
                // Slightly reduced width: full on small, 2/3 on md, 3/5 on lg+
                className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-3/5 bg-card border-l shadow-lg flex flex-col z-50 overflow-hidden"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
                <Button variant="ghost" size="icon" onClick={onClose} title="Close" className="absolute top-2 right-2 z-10">
                     <X className="h-5 w-5" />
                </Button>

                <div className="flex-1 flex gap-4 p-4 pt-10 overflow-y-auto"> 
                    <div className="flex-1 min-w-0">
                        <TicketConversation ticket={ticket} />
                    </div>

                    {/* Vertical Divider */}
                    <div className="border-l border-border"></div>

                    {/* Right Column: Details - Further reduced fixed width */}
                    {/* Added padding-right to separate from edge */}
                    <div className="w-56 flex-shrink-0 space-y-4 flex flex-col pr-2"> {/* Reduced width to w-56 */}
                         {/* Added Details Title */}
                         <h3 className="text-lg font-semibold text-center mb-4 flex-shrink-0">Details</h3>
                         {/* Details Content Scrollable Area */}
                         <div className="flex-1 space-y-4 overflow-y-auto">
                            {/* Status - Editable */}
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                                <Select
                                    value={ticket.status}
                                    onValueChange={(value) => handleUpdateField('status', value)}
                                    disabled={isUpdatingStatus} // Disable based on specific state
                                >
                                    {/* Add focus ring removal classes */}
                                    <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                                        <SelectValue placeholder={isUpdatingStatus ? "Updating..." : "Select status"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Unread">Unread</SelectItem>
                                        <SelectItem value="Open">Open</SelectItem>
                                        <SelectItem value="Closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Priority - Editable */}
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">Priority</h3>
                                 <Select
                                    value={ticket.priority}
                                    onValueChange={(value) => handleUpdateField('priority', value)}
                                    disabled={isUpdatingPriority} // Disable based on specific state
                                >
                                     {/* Add focus ring removal classes */}
                                    <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                                        <SelectValue placeholder={isUpdatingPriority ? "Updating..." : "Select priority"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Assigned to - Editable */}
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned to</h3>
                                <Select
                                    value={ticket.assignee_id?.toString() ?? 'null'} // Use 'null' string for unassigned option value
                                    onValueChange={(value) => handleUpdateField('assignee_id', value)}
                                    disabled={isLoadingAgents || isUpdatingAssignee} // Disable while loading agents OR updating assignee
                                >
                                     {/* Add focus ring removal classes */}
                                    <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                                        <SelectValue placeholder={isLoadingAgents ? "Loading..." : (isUpdatingAssignee ? "Updating..." : "Select agent")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">Unassigned</SelectItem>
                                        {agents.map((agent) => (
                                            <SelectItem key={agent.id} value={agent.id.toString()}>
                                                {agent.name} {/* Display only name */}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
        
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">User</h3>
                                <div className="flex items-center gap-2">
                                    <BoringAvatar
                                        size={24} // h-6 w-6
                                        name={ticket.user?.email || ticket.user?.name || `user-${ticket.user?.id}` || 'unknown-user'} // Identificador
                                        variant="beam"
                                        colors={avatarColors}
                                    />
                                    <span className="text-sm">{ticket.user?.name || "Unknown User"}</span>
                                </div>
                            </div>
                    
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                                <p className="text-sm">{formatRelativeTime(ticket.created_at)}</p>
                            </div>
                       </div> {/* End of scrollable details content */}

                       {/* Buttons moved to bottom of Details column */}
                       <div className="pt-4 border-t mt-auto flex-shrink-0">
                            <div className="flex flex-col items-center gap-2">
                                <Button size="sm" variant="outline" onClick={handleCloseTicket} className="w-fit">
                                    Close Ticket
                                </Button>
                                <Button
                                    size="sm"
                                    variant="link" // Change to link variant
                                    className="text-destructive h-auto p-0 w-fit" // Make it look like text, adjust padding/height
                                    onClick={handleDeleteTicket}
                                >
                                    Delete
                                </Button>
                            </div>
                       </div>
                    </div> 
                </div> 
            </motion.div> 
        </AnimatePresence>
    );
}
