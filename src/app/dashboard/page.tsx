// frontend/src/app/dashboard/page.tsx
'use client';

import React from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getCurrentUser, UserSession } from '@/lib/auth';
import { getAssignedTasks, getTeamTasks } from '@/services/task';
import { getAgentTeams } from '@/services/agent';
import { Task, TaskStatus } from '@/typescript/task';
import { Team } from '@/typescript/team';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import BoringAvatar from 'boring-avatars';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeamStats extends Team {
  ticketsOpen: number;
  ticketsWithUser: number;
  ticketsAssigned: number;
}

export default function DashboardPage() {
  const useBoringAvatar = true;

  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isUserError,
  } = useQuery<UserSession | null, Error>({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: Infinity,
  });

  const { data: assignedTickets = [], isLoading: isLoadingAssignedTickets } = useQuery<
    Task[],
    Error
  >({
    queryKey: ['assignedTickets', user?.id],
    queryFn: () => (user?.id ? getAssignedTasks(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });

  const { data: userTeams = [], isLoading: isLoadingUserTeams } = useQuery<Team[], Error>({
    queryKey: ['userTeams', user?.id],
    queryFn: () => (user?.id ? getAgentTeams(user.id) : Promise.resolve([])),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const teamTasksQueries = useQueries({
    queries: userTeams.map(team => ({
      queryKey: ['teamTasks', team.id],
      queryFn: () => getTeamTasks(team.id),
      enabled: !!user?.id,
      staleTime: 1000 * 60,
    })),
  });

  const isLoadingTeamTasks = teamTasksQueries.some(query => query.isLoading);

  const ticketsAssignedCount = assignedTickets.length;
  const ticketsCompletedCount = assignedTickets.filter(t => t.status === TaskStatus.CLOSED).length;
  const teamsCount = userTeams.length;

  const teamsStats: TeamStats[] = userTeams.map((team, index) => {
    const queryResult = teamTasksQueries[index];
    const teamTasks = queryResult.isSuccess ? queryResult.data : [];

    const ticketsOpen = teamTasks.filter(
      t => t.status === TaskStatus.OPEN || t.status === TaskStatus.UNREAD
    ).length;
    const ticketsWithUser = teamTasks.filter(t => t.user_id === user?.id).length;
    const ticketsAssigned = teamTasks.length;

    return {
      ...team,
      ticketsOpen,
      ticketsWithUser,
      ticketsAssigned,
    };
  });

  const isLoading =
    isLoadingUser ||
    (!!user?.id && (isLoadingAssignedTickets || isLoadingUserTeams || isLoadingTeamTasks));

  if (isUserError || (!isLoadingUser && !user)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium">Could not load dashboard data</h3>
          <p className="text-slate-500 mt-2">
            {isUserError ? 'Failed to load user information.' : 'User not found.'} Please try
            logging in again.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-black rounded-lg p-6 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full">
            {useBoringAvatar ? (
              <BoringAvatar
                size={80}
                name={user.email || user.name || ''}
                variant="beam"
                colors={['#1D73F4', '#D4E4FA']}
              />
            ) : (
              <Avatar className="w-full h-full">
                <AvatarImage src="https://via.placeholder.com/96" alt={user.name} />
                <AvatarFallback>{user.name?.charAt(0) || ''}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-black"></div>
        </div>

        <h2 className="text-xl font-semibold text-center">{user.name}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center capitalize">
          {user.role}
        </p>

        <div className="flex justify-between w-full">
          <div className="text-center">
            <div className="text-2xl font-bold">{ticketsAssignedCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Tickets Assigned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{ticketsCompletedCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Tickets Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{teamsCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Teams</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-black rounded-lg p-6 flex flex-col">
        <h3 className="text-lg font-semibold mb-4 flex-shrink-0">My Tickets</h3>
        <div className="overflow-y-auto h-72 flex-grow">
          <table className="w-full">
            <thead className="sticky top-0 bg-white dark:bg-black z-10">
              <tr className="text-left text-slate-500 dark:text-slate-400 text-sm border-b dark:border-slate-700">
                <th className="pb-2 font-medium w-20">Date</th>
                <th className="pb-2 font-medium">Subject</th>
                <th className="pb-2 font-medium w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignedTickets.length === 0 ? (
                <tr className="border-0">
                  <td colSpan={3} className="text-center py-4 text-muted-foreground">
                    No assigned tickets
                  </td>
                </tr>
              ) : (
                assignedTickets.map(ticket => (
                  <tr
                    key={ticket.id}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <td className="py-3 text-sm">
                      {ticket.created_at ? format(parseISO(ticket.created_at), 'MMM dd') : '-'}
                    </td>
                    <td className="py-3 text-sm truncate max-w-[200px]">{ticket.title}</td>
                    <td className="py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'whitespace-nowrap text-xs',
                          ticket.status === TaskStatus.OPEN &&
                            'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
                          ticket.status === TaskStatus.CLOSED &&
                            'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
                          ticket.status === TaskStatus.UNREAD &&
                            'border-blue-300 dark:border-blue-700'
                        )}
                      >
                        {ticket.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-black rounded-lg p-6 flex flex-col">
        <h3 className="text-lg font-semibold mb-4 flex-shrink-0">My Teams</h3>
        <div className="space-y-6 overflow-y-auto h-72 flex-grow pr-2">
          {teamsStats.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-4">You are not assigned to any teams.</p>
          ) : (
            teamsStats.map(team => (
              <div
                key={team.id}
                className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0"
              >
                <h4 className="font-medium mb-2">{team.name}</h4>
                <div className="flex items-center justify-between text-sm flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center">
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Open:</span>
                    <span className="font-medium">{team.ticketsOpen}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-slate-500 dark:text-slate-400 mr-1">With You:</span>
                    <span className="font-medium">{team.ticketsWithUser}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-slate-500 dark:text-slate-400 mr-1">Total:</span>
                    <span className="font-medium">{team.ticketsAssigned}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
