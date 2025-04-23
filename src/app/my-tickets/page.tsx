'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Settings2 } from 'lucide-react';
import { useInfiniteQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { getTickets, updateTicket } from '@/services/ticket';
import { ITicket } from '@/typescript/ticket';
import { formatRelativeTime, cn } from '@/lib/utils';
import { TicketDetail } from '@/app/tickets/ticket-details';
import { getCurrentUser, UserSession } from '@/lib/auth';

const LOAD_LIMIT = 20;

type TicketPage = ITicket[];

export default function MyTicketsPage() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser => setCurrentUser(setUser));
  }, []);

  const {
    data: ticketsQueryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    error: ticketsError,
  } = useInfiniteQuery<
      TicketPage,
      Error,
      InfiniteData<TicketPage, number>,
      readonly ["tickets", "my", number | undefined],
      number
    >({
    queryKey: ['tickets', 'my', currentUser?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentUser?.id) return [];
      const tickets = await getTickets(
        { skip: pageParam, limit: LOAD_LIMIT },
        `/v1/tasks/assignee/${currentUser.id}`
      );
      return tickets;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < LOAD_LIMIT) return undefined;
      return allPages.flat().length;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    enabled: !!currentUser?.id,
  });

  const ticketsData = React.useMemo(() => ticketsQueryData?.pages?.flat() ?? [], [ticketsQueryData]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }
    };
    if (container) container.addEventListener('scroll', handleScroll);
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTicketUpdate = useCallback((updatedTicket: ITicket) => {
    queryClient.setQueryData<InfiniteData<TicketPage, number>>(['tickets', 'my', currentUser?.id], (oldData) => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        );
        const filteredPages = newPages.map(page =>
            page.filter(t => t.assignee_id === currentUser?.id)
        );
        return { ...oldData, pages: filteredPages };
    });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });

    if (selectedTicket?.id === updatedTicket.id) {
        if (updatedTicket.assignee_id !== currentUser?.id) {
            setSelectedTicket(null);
        } else {
            setSelectedTicket(updatedTicket);
        }
    }
  }, [selectedTicket, queryClient, currentUser?.id]);

  const handleTicketClick = useCallback(async (ticket: ITicket) => {
    setSelectedTicket(ticket);
    if (ticket.status === 'Unread') {
      const optimisticUpdate = { ...ticket, status: 'Open' as const };
      handleTicketUpdate(optimisticUpdate);
      try {
        await updateTicket(ticket.id, { status: 'Open' });
      } catch (error) {
        console.error(`Failed to update ticket ${ticket.id} status to Open in backend:`, error);
      }
    }
  }, [handleTicketUpdate]);

  const handleCloseDetail = useCallback(() => {
    setSelectedTicket(null);
  }, []);

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 px-0 pb-6 flex flex-col">
        <Card className="shadow-none border-0 flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-hidden p-0">
            <div ref={scrollContainerRef} className="h-full overflow-y-auto px-6">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="w-[50px] p-2"><Checkbox /></TableHead>
                    <TableHead className="w-[100px] p-2">ID</TableHead>
                    <TableHead className="p-2 max-w-xs md:max-w-sm">Subject</TableHead>
                    <TableHead className="p-2 w-[150px]">Status</TableHead>
                    <TableHead className="p-2 w-[150px]">Priority</TableHead>
                    <TableHead className="p-2 w-[150px]">Sent from</TableHead>
                    <TableHead className="p-2 w-[150px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTickets && ticketsData.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center">Loading your tickets...</TableCell></TableRow>
                  ) : isTicketsError ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center text-red-500">Error loading tickets: {ticketsError?.message || 'Unknown error'}</TableCell></TableRow>
                  ) : ticketsData.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center">No tickets assigned to you.</TableCell></TableRow>
                  ) : (
                    ticketsData.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className={cn(
                          "border-0 h-14 cursor-pointer hover:bg-muted/50",
                          ticket.status === 'Unread' && "font-semibold bg-slate-50 dark:bg-slate-800/50"
                        )}
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <TableCell className="p-2 py-4"><Checkbox onClick={(e) => e.stopPropagation()} /></TableCell>
                        <TableCell className="font-medium p-2 py-4">{ticket.id}</TableCell>
                        <TableCell className="p-2 py-4 max-w-xs md:max-w-sm truncate">{ticket.title}</TableCell>
                        <TableCell className="p-2 py-4">
                          <Badge variant="outline" className={cn(
                            "whitespace-nowrap",
                            ticket.status === 'Open' && "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
                            ticket.status === 'Closed' && "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
                            ticket.status === 'Unread' && "border-blue-300 dark:border-blue-700"
                          )}>
                            {ticket.status === 'Unread' && (
                              <span className="relative flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                              </span>
                            )}
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("p-2 py-4", ticket.status === 'Unread' && "text-foreground")}>{ticket.priority}</TableCell>
                        <TableCell className="p-2 py-4">{ticket.user?.name || ticket.email_info?.email_sender || '-'}</TableCell>
                        <TableCell className="p-2 py-4">{formatRelativeTime(ticket.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  {isFetchingNextPage && (
                    <TableRow><TableCell colSpan={7} className="py-4 text-center text-muted-foreground">Loading more tickets...</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="w-80 border-l p-6 space-y-6 bg-card text-card-foreground rounded-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <div><Button variant="ghost" size="icon"><Settings2 className="h-4 w-4" /></Button></div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="subject-filter" className="text-sm font-medium">Subject</Label>
            <Input id="subject-filter" placeholder="Search subject..." />
          </div>
          <div>
            <Label htmlFor="status-filter" className="text-sm font-medium">Statuses</Label>
            <Select><SelectTrigger id="status-filter"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="closed">Closed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select>
          </div>
          <div>
            <Label htmlFor="priority-filter" className="text-sm font-medium">Priorities</Label>
            <Select><SelectTrigger id="priority-filter"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select>
          </div>
        </div>
      </aside>

      <TicketDetail
        ticket={selectedTicket}
        onClose={handleCloseDetail}
        onTicketUpdate={handleTicketUpdate}
      />
    </div>
  );
}
