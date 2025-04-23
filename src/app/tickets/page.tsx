'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'; // Import Suspense
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2 } from 'lucide-react';
import { useInfiniteQuery, useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation'; 
import { getTickets, updateTicket } from '@/services/ticket';
import { getAgents } from '@/services/agent';
import { ITicket } from '@/typescript/ticket';

import { Agent } from '@/typescript/agent'; 
import { formatRelativeTime, cn } from '@/lib/utils'; 
import { TicketDetail } from './ticket-details';

const LOAD_LIMIT = 20;

type TicketPage = ITicket[];


function TicketsClientContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const [selectedTicket, setSelectedTicket] = useState<ITicket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { data: agentsData = [], isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 1000 * 60 * 5, 
  });

  const {
    data: ticketsQueryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTickets, 
    isError: isTicketsError,
    error: ticketsError,
  } = useInfiniteQuery<TicketPage, Error, InfiniteData<TicketPage, number>, readonly ["tickets"], number>({ // Explicit types
    queryKey: ['tickets'],
    queryFn: async ({ pageParam = 0 }) => { 
      console.log(`Fetching tickets with skip: ${pageParam}`);
     
      const tickets = await getTickets({ skip: pageParam, limit: LOAD_LIMIT }); 
      return tickets; 
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < LOAD_LIMIT) {
        console.log("No next page detected.");
        return undefined; 
      }
    
      const nextPageParam = allPages.flat().length;
      console.log(`Next page param (skip): ${nextPageParam}`);
      return nextPageParam;
    },
    initialPageParam: 0, 
    staleTime: 1000 * 60, 
    refetchInterval: 30000, 
    refetchIntervalInBackground: true, 
  });
  const ticketsData = React.useMemo(() => ticketsQueryData?.pages?.flat() ?? [], [ticketsQueryData]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetchingNextPage) {
          console.log("Fetching next page due to scroll...");
          fetchNextPage();
        }
      }
    };
    if (container) container.addEventListener('scroll', handleScroll);
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const ticketIdToOpen = searchParams.get('openTicket');
    if (ticketIdToOpen && ticketsData.length > 0) {
      const ticket = ticketsData.find(t => t.id === parseInt(ticketIdToOpen, 10));
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  
  }, [searchParams, ticketsData, router]); 

  const agentIdToNameMap = React.useMemo(() => {
    return agentsData.reduce((map, agent) => {
      map[agent.id] = agent.name;
      return map;
    }, {} as Record<number, string>);
  }, [agentsData]);

 
  const handleTicketUpdate = useCallback((updatedTicket: ITicket) => {
    queryClient.setQueryData<InfiniteData<TicketPage, number>>(['tickets'], (oldData) => {
        if (!oldData) return oldData;
        const newPages = oldData.pages.map((page: ITicket[]) =>
            page.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        );
        return { ...oldData, pages: newPages };
    });
    
    if (selectedTicket?.id === updatedTicket.id) {
      setSelectedTicket(updatedTicket);
    }
    
  }, [selectedTicket, queryClient]); 

   const handleTicketClick = useCallback(async (ticket: ITicket) => {
    setSelectedTicket(ticket);
    if (ticket.status === 'Unread') {
      console.log(`Ticket ${ticket.id} is Unread, updating to Open.`);
      const optimisticUpdate = { ...ticket, status: 'Open' as const };
      handleTicketUpdate(optimisticUpdate);
      try {
        await updateTicket(ticket.id, { status: 'Open' });
        console.log(`Backend updated successfully for ticket ${ticket.id}`);
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
          <CardHeader className="px-6 pt-6 pb-4"> 
            <CardTitle>All Tickets</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div ref={scrollContainerRef} className="h-full overflow-y-auto px-6">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                    <TableHead className="w-[50px] p-2">
                      <Checkbox />
                    </TableHead>
                    <TableHead className="w-[100px] p-2">ID</TableHead>
                    <TableHead className="p-2 max-w-xs md:max-w-sm">Subject</TableHead>
                    <TableHead className="p-2 w-[150px]">Status</TableHead>
                    <TableHead className="p-2 w-[150px]">Priority</TableHead>
                    <TableHead className="p-2 w-[150px]">Sent from</TableHead>
                    <TableHead className="p-2 w-[150px]">Assigned to</TableHead>
                    <TableHead className="p-2 w-[150px]">Created</TableHead> {/* Removed refresh button from here */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTickets && ticketsData.length === 0 ? ( // Use isLoadingTickets
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Loading tickets...
                      </TableCell>
                    </TableRow>
                  ) : isTicketsError ? ( // Handle error state
                    <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-red-500">
                            Error loading tickets: {ticketsError?.message || 'Unknown error'}
                        </TableCell>
                    </TableRow>
                  ) : ticketsData.length === 0 ? (
                     <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No tickets found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ticketsData.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className={cn(
                        "border-0 h-14 cursor-pointer hover:bg-muted/50",
                        ticket.status === 'Unread' && "font-semibold bg-slate-50 dark:bg-slate-800/50" // Added background
                      )}
                      onClick={() => handleTicketClick(ticket)}
                    >
                      <TableCell className="p-2 py-4">
                        <Checkbox onClick={(e) => e.stopPropagation()} />
                      </TableCell>
                      <TableCell className="font-medium p-2 py-4">{ticket.id}</TableCell>
                      <TableCell className="p-2 py-4 max-w-xs md:max-w-sm truncate">{ticket.title}</TableCell>
                      <TableCell className="p-2 py-4">
                        <Badge variant="outline" className={cn(
                          "whitespace-nowrap",
                          ticket.status === 'Open' && "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
                          ticket.status === 'Closed' && "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
                          ticket.status === 'Unread' && "border-blue-300 dark:border-blue-700" // Optional: different border for Unread
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
                      <TableCell className={cn("p-2 py-4", ticket.status === 'Unread' && "text-foreground")}>{ticket.priority}</TableCell> {/* Ensure priority text is not muted if row is bold */}
                      <TableCell className="p-2 py-4">
                        {ticket.user?.name || ticket.email_info?.email_sender || '-'}
                      </TableCell>
                      <TableCell className="p-2 py-4">{agentIdToNameMap[ticket.assignee_id as number] || '-'}</TableCell>
                      <TableCell className="p-2 py-4">{formatRelativeTime(ticket.created_at)}</TableCell>
                    </TableRow>
                  )))}
                  {isFetchingNextPage && ( // Use isFetchingNextPage for loading more indicator
                    <TableRow>
                      <TableCell colSpan={8} className="py-4 text-center text-muted-foreground">
                        Loading more tickets...
                      </TableCell>
                    </TableRow>
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
          <div>
            <Button variant="ghost" size="icon">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="subject-filter" className="text-sm font-medium">Subject</label>
            <Input id="subject-filter" placeholder="Search subject..." />
          </div>
          <div>
            <label htmlFor="status-filter" className="text-sm font-medium">Statuses</label>
            <Select>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="team-filter" className="text-sm font-medium">Teams</label>
            <Select>
              <SelectTrigger id="team-filter">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team1">IT Helpdesk</SelectItem>
                <SelectItem value="team2">CMT Association</SelectItem>
                <SelectItem value="team3">CareCentrix</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="agent-filter" className="text-sm font-medium">Agents</label>
            <Select>
              <SelectTrigger id="agent-filter">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingAgents ? (
                    <SelectItem value="loading" disabled>Loading agents...</SelectItem>
                ) : (
                    agentsData.map(agent => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>{agent.name}</SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="priority-filter" className="text-sm font-medium">Priorities</label>
            <Select>
              <SelectTrigger id="priority-filter">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="company-filter" className="text-sm font-medium">Companies</label>
            <Select>
              <SelectTrigger id="company-filter">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="comp1">Company A</SelectItem>
                <SelectItem value="comp2">Company B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="user-filter" className="text-sm font-medium">Users</label>
            <Select>
              <SelectTrigger id="user-filter">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user1">User 1</SelectItem>
                <SelectItem value="user2">User 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="category-filter" className="text-sm font-medium">Categories</label>
            <Select>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cat1">Category 1</SelectItem>
                <SelectItem value="cat2">Category 2</SelectItem>
              </SelectContent>
            </Select>
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
export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading page...</div>}>
      <TicketsClientContent />
    </Suspense>
  );
}
