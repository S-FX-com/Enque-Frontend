'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ITicket, TicketStatus, TicketPriority } from '@/typescript/ticket';
import { Agent } from '@/typescript/agent';
import { ICategory } from '@/typescript/category';
import { formatRelativeTime } from '@/lib/utils';
import { TicketConversation } from './ticket-conversation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAgents } from '@/services/agent';
import { getTeams } from '@/services/team';
import { getCategories } from '@/services/category';
import { Team } from '@/typescript/team';
import { updateTicket } from '@/services/ticket';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';
import { cn } from '@/lib/utils';

const PRIORITY_OPTIONS = [
  { value: 'Low', label: 'Low', color: 'bg-slate-500' },
  { value: 'Medium', label: 'Medium', color: 'bg-green-500' },
  { value: 'High', label: 'High', color: 'bg-yellow-500' },
  { value: 'Critical', label: 'Critical', color: 'bg-red-500' },
];

const AVATAR_COLORS = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

interface Props {
  ticket: ITicket | null;
  onClose: () => void;
  onTicketUpdate?: (updatedTicket: ITicket) => void;
}

export function TicketDetail({ ticket: initialTicket, onClose, onTicketUpdate }: Props) {
  const queryClient = useQueryClient();
  const [ticket, setTicket] = useState<ITicket | null>(initialTicket);

  // Data fetching
  const { data: agents = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 1000 * 60 * 5,
  });

  const { data: teams = [], isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<ICategory[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  const updateTicketField = useCallback(
    async (
      field: 'priority' | 'assignee_id' | 'team_id' | 'category_id',
      value: string | null,
      currentFieldValue: string | number | null
    ) => {
      if (!ticket) return;

      let updateValue: TicketStatus | TicketPriority | number | null;

      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        updateValue = value === 'null' || value === null ? null : parseInt(value, 10);
        if (typeof updateValue === 'number' && isNaN(updateValue)) {
          console.error(`Invalid ${field} selected: ${value}`);
          return;
        }
      } else {
        updateValue = value as TicketPriority;
      }

      if (ticket[field as keyof ITicket] === updateValue) return;

      try {
        const updatedTicket = await updateTicket(ticket.id, { [field]: updateValue });

        // Update local state
        setTicket(updatedTicket);

        // Notify parent
        if (onTicketUpdate) {
          onTicketUpdate(updatedTicket);
        }

        // Invalidate relevant queries
        const currentUser = await getCurrentUser();
        const currentUserId = currentUser?.id;

        queryClient.invalidateQueries({ queryKey: ['tickets'] });

        if (currentUserId) {
          if (field === 'assignee_id') {
            const previousAssigneeId = currentFieldValue;
            const newAssigneeId = updatedTicket.assignee_id;
            if (previousAssigneeId === currentUserId || newAssigneeId === currentUserId) {
              queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
            }
          } else if (field === 'team_id') {
            queryClient.invalidateQueries({ queryKey: ['tickets', 'my', currentUserId] });
            queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
            queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
            queryClient.invalidateQueries({ queryKey: ['agentTeams', currentUserId] });
          }
        }

        if (field === 'team_id') {
          queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
        }
      } catch (error) {
        toast.error(
          `Error updating ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [ticket, onTicketUpdate, queryClient]
  );

  const handleStatusChange = useCallback(
    async (newStatus: TicketStatus) => {
      if (!ticket) return;

      try {
        const updatedTicket = await updateTicket(ticket.id, { status: newStatus });

        // Update local state
        setTicket(updatedTicket);

        // Notify parent
        if (onTicketUpdate) {
          onTicketUpdate(updatedTicket);
        }

        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] });

        toast.success(`Ticket #${updatedTicket.id} ${newStatus.toLowerCase()} successfully.`);
        onClose();
      } catch (error) {
        toast.error(
          `Error updating ticket status: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [ticket, onTicketUpdate, queryClient, onClose]
  );

  if (!ticket) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        key={`overlay-${ticket.id}`}
      />
      <motion.div
        key={`panel-${ticket.id}`}
        className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-3/5 bg-card border-l shadow-lg flex flex-col z-50 overflow-hidden"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Close"
          className="absolute top-2 right-2 z-10"
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="flex-1 flex gap-4 p-4 pt-10 overflow-y-auto">
          <div className="flex-1 min-w-0">
            <TicketConversation
              ticket={ticket}
              onTicketUpdate={updatedTicket => {
                setTicket(updatedTicket);
                onTicketUpdate?.(updatedTicket);
              }}
            />
          </div>
          <div className="border-l border-border"></div>
          <div className="w-56 flex-shrink-0 space-y-4 flex flex-col pr-2">
            <h3 className="text-lg font-semibold text-center mb-4 flex-shrink-0">Details</h3>

            <div className="flex-1 space-y-4 overflow-y-auto">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Priority</h3>
                <Select
                  value={ticket.priority}
                  onValueChange={value => updateTicketField('priority', value, ticket.priority)}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Select priority">
                      {ticket.priority && (
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              PRIORITY_OPTIONS.find(p => p.value === ticket.priority)?.color
                            )}
                          />
                          {ticket.priority}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${option.color}`} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Assigned to</h3>
                <Select
                  value={ticket.assignee_id?.toString() ?? 'null'}
                  onValueChange={value =>
                    updateTicketField('assignee_id', value, ticket.assignee_id)
                  }
                  disabled={isLoadingAgents}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder={isLoadingAgents ? 'Loading...' : 'Select agent'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Team</h3>
                <Select
                  value={ticket.team_id?.toString() ?? 'null'}
                  onValueChange={value => updateTicketField('team_id', value, ticket.team_id)}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder={isLoadingTeams ? 'Loading...' : 'Select team'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Category</h3>
                <Select
                  value={ticket.category_id?.toString() ?? 'null'}
                  onValueChange={value =>
                    updateTicketField('category_id', value, ticket.category_id)
                  }
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger className="h-8 text-xs focus:ring-0 focus:ring-offset-0">
                    <SelectValue
                      placeholder={isLoadingCategories ? 'Loading...' : 'Select category'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">Unassigned</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">User</h3>
                <div className="flex items-center gap-2">
                  <BoringAvatar
                    size={24}
                    name={
                      ticket.user?.email ||
                      ticket.user?.name ||
                      `user-${ticket.user?.id}` ||
                      'unknown-user'
                    }
                    variant="beam"
                    colors={AVATAR_COLORS}
                  />
                  <span className="text-sm">{ticket.user?.name || 'Unknown User'}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Update</h3>
                <p className="text-sm">{formatRelativeTime(ticket.last_update)}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                <p className="text-sm">{formatRelativeTime(ticket.created_at)}</p>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleStatusChange('Closed')}
                    className="w-full"
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('Closed')}
                    className="w-full"
                  >
                    Mark Closed
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
