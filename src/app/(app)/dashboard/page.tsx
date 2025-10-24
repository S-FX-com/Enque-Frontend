'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TaskStatus } from '@/typescript/task';
import { useAgentAvatar } from '@/hooks/use-agent-avatar';
import { useAuth } from '@/hooks/use-auth';
import { useSocketContext } from '@/providers/socket-provider';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { isConnected } = useSocketContext();
  const { userData, assignedTickets, stats, isLoading, isError } = useDashboardData(user?.id);

  const { AvatarComponent: UserAvatarComponent } = useAgentAvatar({
    agent: userData,
    size: 80,
    variant: 'beam',
    className: 'w-full h-full',
  });

  if (isError || (!isLoading && !user)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium">Could not load dashboard data</h3>
          <p className="text-slate-500 mt-2">
            {isError ? 'Failed to load user information.' : 'User not found.'} Please try logging in
            again.
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
          <div className="w-20 h-20 rounded-full">{UserAvatarComponent}</div>
          <div
            className={cn(
              'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-black',
              isConnected ? 'bg-green-500' : 'bg-slate-400'
            )}
          ></div>
        </div>

        <h2 className="text-xl font-semibold text-center">{userData?.name || user.name}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-center capitalize">
          {userData?.role || user.role}
        </p>

        <div className="flex justify-between w-full">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.ticketsAssignedCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Tickets Assigned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.ticketsCompletedCount}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Tickets Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.teamsCount}</div>
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
                assignedTickets.slice(0, 10).map(ticket => (
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
          {stats.teamsStats.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-4">You are not assigned to any teams.</p>
          ) : (
            stats.teamsStats.map(team => (
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
