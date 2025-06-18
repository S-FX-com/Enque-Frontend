'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Settings, MoreHorizontal, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { ITicket, TicketStatus, TicketPriority } from '@/typescript/ticket';
import type { Agent } from '@/typescript/agent';
import type { ICategory } from '@/typescript/category';
import type { Team } from '@/typescript/team';
import { getTickets, updateTicket } from '@/services/ticket';
import { getAgents } from '@/services/agent';
import { getTeams } from '@/services/team';
import { getCategories } from '@/services/category';
import { formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSocketContext } from '@/providers/socket-provider';
import { TicketConversation } from './ticket-conversation';
import BoringAvatar from 'boring-avatars';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  ticketId: number;
}

// Dynamic CC Input Component
function DynamicCCInput({
  existingEmails,
  onEmailsChange,
  placeholder = 'Enter email address',
}: {
  existingEmails: string[];
  onEmailsChange: (emails: string[]) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && validateEmail(trimmedEmail) && !existingEmails.includes(trimmedEmail)) {
      onEmailsChange([...existingEmails, trimmedEmail]);
      setInputValue('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    onEmailsChange(existingEmails.filter(email => email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && existingEmails.length > 0) {
      removeEmail(existingEmails[existingEmails.length - 1]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText.split(/[,;\s]+/).filter(email => email.trim());

    emails.forEach(email => {
      const trimmedEmail = email.trim();
      if (validateEmail(trimmedEmail) && !existingEmails.includes(trimmedEmail)) {
        onEmailsChange(prev => [...prev, trimmedEmail]);
      }
    });
    setInputValue('');
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 p-2 border rounded-md min-h-[40px] cursor-text',
        isInputFocused && 'ring-2 ring-ring ring-offset-2'
      )}
      onClick={() => document.getElementById('cc-input')?.focus()}
    >
      {existingEmails.map((email, index) => (
        <Badge key={index} variant="secondary" className="flex items-center gap-1 px-2 py-1">
          <span className="text-xs">{email}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={e => {
              e.stopPropagation();
              removeEmail(email);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <input
        id="cc-input"
        type="email"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)}
        placeholder={existingEmails.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
      />
      {inputValue && validateEmail(inputValue) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => addEmail(inputValue)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function TicketPageContent({ ticketId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { socket } = useSocketContext();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<ITicket | null>(null);
  const [isClosingTicket, setIsClosingTicket] = useState(false);
  const [isResolvingTicket, setIsResolvingTicket] = useState(false);
  const [showExtraRecipients, setShowExtraRecipients] = useState(false);
  const [existingCcEmails, setExistingCcEmails] = useState<string[]>([]);
  const [extraCcEmails, setExtraCcEmails] = useState<string[]>([]);

  // Fetch ticket data
  const {
    data: ticketData,
    isLoading: isLoadingTicket,
    error: ticketError,
  } = useQuery<ITicket[]>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const tickets = await getTickets({}, `/v1/tasks/${ticketId}`);
      return [tickets] as unknown as ITicket[];
    },
    enabled: !!ticketId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const currentTicket = ticketData?.[0] || null;

  useEffect(() => {
    if (currentTicket) {
      console.log(currentTicket);
      setTicket(currentTicket as unknown as ITicket);

      if (currentTicket?.cc_recipients) {
        const emails = currentTicket.cc_recipients
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0);
        setExistingCcEmails(emails);
      } else {
        setExistingCcEmails([]);
      }
    }
  }, [currentTicket]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !ticket) return;

    const handleTicketUpdated = (data: ITicket) => {
      if (data.id === ticket.id) {
        console.log('🚀 Ticket updated via socket:', data);
        setTicket(prev => (prev ? { ...prev, ...data } : data));
      }
    };

    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, [socket, ticket]);

  // Fetch related data
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
    queryFn: () => getCategories(),
    staleTime: 1000 * 60 * 5,
  });

  // Helper function to invalidate all counter queries
  const invalidateCounterQueries = () => {
    // Invalidate all tickets queries
    queryClient.invalidateQueries({ queryKey: ['tickets'] });

    // Invalidate counter queries
    queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'all'] });
    queryClient.invalidateQueries({ queryKey: ['ticketsCount', 'my', user?.id] });

    // Invalidate team queries (they contain ticket counts)
    queryClient.invalidateQueries({ queryKey: ['agentTeams', user?.id, user?.role] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  // Update field mutation
  const updateFieldMutation = useMutation<
    ITicket,
    Error,
    {
      field: 'priority' | 'assignee_id' | 'team_id' | 'category_id';
      value: string | null;
      originalFieldValue: string | number | null;
    },
    { previousTicket: ITicket | null }
  >({
    mutationFn: async ({ field, value }) => {
      if (!ticket) throw new Error('No ticket selected');
      let updateValue: TicketStatus | TicketPriority | number | null;

      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        updateValue = value === 'null' || value === null ? null : Number.parseInt(value, 10);
        if (typeof updateValue === 'number' && isNaN(updateValue)) {
          throw new Error(`Invalid ${field}: ${value}`);
        }
      } else {
        updateValue = value as TicketPriority;
      }

      return updateTicket(ticket.id, { [field]: updateValue });
    },
    onMutate: async ({ field, value }) => {
      if (!ticket) return { previousTicket: null };

      const previousTicket = ticket;
      let optimisticUpdateValue: TicketStatus | TicketPriority | number | null;

      if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
        optimisticUpdateValue =
          value === 'null' || value === null ? null : Number.parseInt(value, 10);
        if (typeof optimisticUpdateValue === 'number' && isNaN(optimisticUpdateValue)) {
          optimisticUpdateValue = null;
        }
      } else {
        optimisticUpdateValue = value as TicketPriority;
      }

      const optimisticTicket: ITicket = {
        ...previousTicket,
        [field]: optimisticUpdateValue,
      };

      setTicket(optimisticTicket);
      queryClient.setQueryData(['ticket', ticket.id], [optimisticTicket]);

      return { previousTicket };
    },
    onError: (error, { field }, context) => {
      toast.error(
        `Error updating ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (context?.previousTicket) {
        setTicket(context.previousTicket);
        queryClient.setQueryData(['ticket', ticketId], [context.previousTicket]);
      }
    },
    onSuccess: () => {
      invalidateCounterQueries();
    },
  });

  const handleUpdateField = (
    field: 'priority' | 'assignee_id' | 'team_id' | 'category_id',
    value: string | null
  ) => {
    if (!ticket) return;

    let optimisticUpdateValue: TicketStatus | TicketPriority | number | null;
    if (field === 'assignee_id' || field === 'team_id' || field === 'category_id') {
      optimisticUpdateValue =
        value === 'null' || value === null ? null : Number.parseInt(value, 10);
      if (typeof optimisticUpdateValue === 'number' && isNaN(optimisticUpdateValue)) {
        console.error(`Invalid ${field} selected: ${value}`);
        return;
      }
    } else {
      optimisticUpdateValue = value as TicketPriority;
    }

    if (ticket[field as keyof ITicket] === optimisticUpdateValue) {
      return;
    }

    const currentFieldValue = ticket[field] ?? null;
    updateFieldMutation.mutate({ field, value, originalFieldValue: currentFieldValue });
  };

  // Close ticket mutation
  const closeTicketMutation = useMutation<ITicket, Error, void, { previousTicket: ITicket | null }>(
    {
      mutationFn: async () => {
        if (!ticket) throw new Error('No ticket selected');
        return updateTicket(ticket.id, { status: 'Closed' });
      },
      onMutate: async () => {
        if (!ticket) return { previousTicket: null };

        setIsClosingTicket(true);
        const previousTicket = ticket;

        // Cancel any outgoing refetches for counter queries
        await queryClient.cancelQueries({ queryKey: ['ticketsCount'] });
        await queryClient.cancelQueries({ queryKey: ['agentTeams'] });

        const optimisticTicket: ITicket = {
          ...previousTicket,
          status: 'Closed' as TicketStatus,
        };

        setTicket(optimisticTicket);
        queryClient.setQueryData(['ticket', ticket.id], [optimisticTicket]);

        // Optimistically update counter queries
        queryClient.setQueryData<number>(['ticketsCount', 'all'], old =>
          Math.max(0, (old || 1) - 1)
        );

        if (ticket.assignee_id === user?.id) {
          queryClient.setQueryData<number>(['ticketsCount', 'my', user?.id], old =>
            Math.max(0, (old || 1) - 1)
          );
        }

        return { previousTicket };
      },
      onSuccess: updatedTicketData => {
        toast.success(`Ticket #${updatedTicketData.id} closed successfully.`);
        invalidateCounterQueries();
        router.push('/tickets');
      },
      onError: (error, _variables, context) => {
        toast.error(
          `Error closing ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        if (context?.previousTicket) {
          setTicket(context.previousTicket);
          queryClient.setQueryData(['ticket', ticketId], [context.previousTicket]);
        }
        // Revert optimistic updates on error
        invalidateCounterQueries();
      },
      onSettled: () => {
        setIsClosingTicket(false);
      },
    }
  );

  // Resolve ticket mutation
  const resolveTicketMutation = useMutation<
    ITicket,
    Error,
    void,
    { previousTicket: ITicket | null }
  >({
    mutationFn: async () => {
      if (!ticket) throw new Error('No ticket selected');
      return updateTicket(ticket.id, { status: 'Closed' });
    },
    onMutate: async () => {
      if (!ticket) return { previousTicket: null };

      setIsResolvingTicket(true);
      const previousTicket = ticket;

      // Cancel any outgoing refetches for counter queries
      await queryClient.cancelQueries({ queryKey: ['ticketsCount'] });
      await queryClient.cancelQueries({ queryKey: ['agentTeams'] });

      const optimisticTicket: ITicket = {
        ...previousTicket,
        status: 'Closed' as TicketStatus,
      };

      setTicket(optimisticTicket);
      queryClient.setQueryData(['ticket', ticket.id], [optimisticTicket]);

      // Optimistically update counter queries
      queryClient.setQueryData<number>(['ticketsCount', 'all'], old => Math.max(0, (old || 1) - 1));

      if (ticket.assignee_id === user?.id) {
        queryClient.setQueryData<number>(['ticketsCount', 'my', user?.id], old =>
          Math.max(0, (old || 1) - 1)
        );
      }

      return { previousTicket };
    },
    onSuccess: updatedTicketData => {
      toast.success(`Ticket #${updatedTicketData.id} resolved successfully.`);
      invalidateCounterQueries();
      router.push('/tickets');
    },
    onError: (error, _variables, context) => {
      toast.error(
        `Error resolving ticket #${ticket?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      if (context?.previousTicket) {
        setTicket(context.previousTicket);
        queryClient.setQueryData(['ticket', ticketId], [context.previousTicket]);
      }
      // Revert optimistic updates on error
      invalidateCounterQueries();
    },
    onSettled: () => {
      setIsResolvingTicket(false);
    },
  });

  const handleTicketUpdate = (updatedTicket: ITicket) => {
    setTicket(updatedTicket);
    queryClient.setQueryData(['ticket', ticketId], [updatedTicket]);
  };

  // Function to get combined CC recipients in comma-separated format
  const getCombinedCcRecipients = (): string => {
    const allEmails = [...existingCcEmails, ...extraCcEmails];
    const uniqueEmails = [...new Set(allEmails)];
    return uniqueEmails.join(', ');
  };

  // Mark ticket as read when viewed
  useEffect(() => {
    if (ticket && ticket.status === 'Unread') {
      // Update ticket status to 'Open' when viewed
      updateTicket(ticket.id, { status: 'Open' })
        .then(updatedTicket => {
          setTicket(updatedTicket);
          queryClient.setQueryData(['ticket', ticketId], [updatedTicket]);
          invalidateCounterQueries();
        })
        .catch(error => {
          console.error('Error marking ticket as read:', error);
        });
    }
  }, [ticket, ticketId, queryClient]);

  // Update page title with ticket subject
  useEffect(() => {
    if (ticket?.title) {
      document.title = `Ticket #${ticket.id}: ${ticket.title}`;

      // Cleanup: restore original title when component unmounts
      return () => {
        document.title = 'Support Tickets';
      };
    }
  }, [ticket?.id, ticket?.title]);

  if (isLoadingTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-96 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="space-y-4">
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!isLoadingTicket && (ticketError || !ticket)) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-muted-foreground mb-2">Ticket Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The ticket you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to
          view it.
        </p>
        <Button onClick={() => router.push('/tickets')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tickets
        </Button>
      </div>
    );
  }

  const avatarColors = ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">#{ticket?.id}</span>
            <h1 className="text-xl font-semibold">{ticket?.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Contact:</span>
              <BoringAvatar
                size={20}
                name={
                  ticket?.user?.email ||
                  ticket?.user?.name ||
                  `user-${ticket?.user?.id}` ||
                  'unknown-user'
                }
                variant="beam"
                colors={avatarColors}
              />
              <span className="text-sm font-medium">{ticket?.user?.name || 'Unknown User'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">CC:</span>
              {existingCcEmails.length > 0 && (
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {existingCcEmails.length} existing
                  </Badge>
                </div>
              )}
              {extraCcEmails.length > 0 && (
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {extraCcEmails.length} additional
                  </Badge>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowExtraRecipients(!showExtraRecipients)}
              >
                {showExtraRecipients ? 'Hide CC' : 'Manage CC'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => resolveTicketMutation.mutate()}
            disabled={isResolvingTicket}
          >
            {isResolvingTicket ? 'Resolving...' : 'Mark Resolved'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => closeTicketMutation.mutate()}
            disabled={isClosingTicket}
          >
            {isClosingTicket ? 'Closing...' : 'Mark Closed'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced CC Management Section */}
      {showExtraRecipients && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">CC Recipients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing CC Recipients */}
            {existingCcEmails.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current CC Recipients</Label>
                <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-md border">
                  {existingCcEmails.map((email, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="flex items-center gap-1 px-2 py-1 text-xs"
                    >
                      <span>{email}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={e => {
                          e.stopPropagation();
                          const updatedEmails = existingCcEmails.filter((_, i) => i !== index);
                          setExistingCcEmails(updatedEmails);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Additional Recipients */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {existingCcEmails.length > 0 ? 'Additional Recipients' : 'CC Recipients'}
              </Label>
              <DynamicCCInput
                existingEmails={extraCcEmails}
                onEmailsChange={setExtraCcEmails}
                placeholder="Type email and press Enter or comma to add"
              />
              <p className="text-xs text-muted-foreground">
                Type email addresses and press Enter, comma, or click the + button to add them. You
                can also paste multiple emails separated by commas.
              </p>
            </div>

            {/* Summary */}
            {(existingCcEmails.length > 0 || extraCcEmails.length > 0) && (
              <div className="pt-2 border-t">
                <Label className="text-sm font-medium text-muted-foreground">
                  Total Recipients: {existingCcEmails.length + extraCcEmails.length}
                </Label>
                {extraCcEmails.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Additional emails will be included when sending replies
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-2 w-2">
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full',
              ticket?.status === 'Open' && 'bg-green-500',
              ticket?.status === 'Closed' && 'bg-slate-500',
              ticket?.status === 'Unread' && 'bg-blue-500',
              ticket?.status === 'With User' && 'bg-purple-500',
              ticket?.status === 'In Progress' && 'bg-orange-500'
            )}
          />
          {ticket?.status === 'Unread' && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          )}
        </div>
        <span className="text-sm font-medium capitalize">{ticket?.status}</span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reply Section - Moved to top */}
        <div className="lg:col-span-2">
          {/* Conversation - Modified to show latest message without scroll */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Latest Message</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketConversation
                ticket={ticket as ITicket}
                onTicketUpdate={handleTicketUpdate}
                latestOnly={true}
                extraRecipients={getCombinedCcRecipients()}
                onExtraRecipientsChange={() => {}} // Not needed for display only
              />
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Reply</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketConversation
                ticket={ticket as ITicket}
                onTicketUpdate={handleTicketUpdate}
                replyOnly={true}
                extraRecipients={getCombinedCcRecipients()}
                onExtraRecipientsChange={() => {}} // CC is managed above
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Priority
                </label>
                <Select
                  value={ticket?.priority}
                  onValueChange={value => handleUpdateField('priority', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select priority">
                      {ticket?.priority && (
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              ticket?.priority === 'Low' && 'bg-slate-500',
                              ticket?.priority === 'Medium' && 'bg-green-500',
                              ticket?.priority === 'High' && 'bg-yellow-500',
                              ticket?.priority === 'Critical' && 'bg-red-500'
                            )}
                          />
                          {ticket?.priority}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="Medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="High">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="Critical">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Critical
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assigned to */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Assigned to
                </label>
                <Select
                  value={ticket?.assignee_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('assignee_id', value)}
                  disabled={isLoadingAgents}
                >
                  <SelectTrigger className="h-8 text-xs">
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

              {/* Team */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Team</label>
                <Select
                  value={ticket?.team_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('team_id', value)}
                  disabled={isLoadingTeams}
                >
                  <SelectTrigger className="h-8 text-xs">
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

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Category
                </label>
                <Select
                  value={ticket?.category_id?.toString() ?? 'null'}
                  onValueChange={value => handleUpdateField('category_id', value)}
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger className="h-8 text-xs">
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

              <Separator />

              {/* Timestamps */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Last Update
                </label>
                <p className="text-sm">{formatRelativeTime(ticket?.last_update)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Created
                </label>
                <p className="text-sm">{formatRelativeTime(ticket?.created_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
