import { useQuery, useQueries } from '@tanstack/react-query';
import { getAgentById } from '@/services/agent';
import { getAssignedTasks, getTeamTasks } from '@/services/task';
import { getAgentTeams } from '@/services/agent';
import { Team } from '@/typescript/team';
import { Task, TaskStatus } from '@/typescript/task';

interface TeamStats extends Team {
  ticketsOpen: number;
  ticketsWithUser: number;
  ticketsAssigned: number;
}

export function useDashboardData(userId?: number) {
  const userData = useQuery({
    queryKey: ['agent', userId],
    queryFn: () => getAgentById(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 15,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const assignedTickets = useQuery<Task[], Error>({
    queryKey: ['agentTickets', userId],
    queryFn: () => (userId ? getAssignedTasks(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const userTeams = useQuery<Team[], Error>({
    queryKey: ['userTeams', userId],
    queryFn: () => (userId ? getAgentTeams(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 1000 * 60 * 15,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const teamTasksQueries = useQueries({
    queries: (userTeams.data || []).map(team => ({
      queryKey: ['teamTasks', team.id],
      queryFn: () => getTeamTasks(team.id),
      enabled: !!userId && (userTeams.data?.length || 0) > 0,
      staleTime: 1000 * 60 * 10,
    })),
  });

  const isLoading =
    userData.isLoading ||
    assignedTickets.isLoading ||
    userTeams.isLoading ||
    teamTasksQueries.some(q => q.isLoading);
  const isError =
    userData.isError ||
    assignedTickets.isError ||
    userTeams.isError ||
    teamTasksQueries.some(q => q.isError);

  const stats = {
    ticketsAssignedCount: assignedTickets.data?.length || 0,
    ticketsCompletedCount:
      assignedTickets.data?.filter(t => t.status === TaskStatus.CLOSED).length || 0,
    teamsCount: userTeams.data?.length || 0,
    teamsStats: (userTeams.data || []).map((team, index): TeamStats => {
      const queryResult = teamTasksQueries[index];
      const teamTasks = queryResult?.isSuccess ? queryResult.data : [];

      const ticketsOpen = teamTasks.filter(
        t => t.status === TaskStatus.OPEN || t.status === TaskStatus.UNREAD
      ).length;
      const ticketsWithUser = teamTasks.filter(t => t.user_id === userId).length;
      const ticketsAssigned = teamTasks.length;

      return {
        ...team,
        ticketsOpen,
        ticketsWithUser,
        ticketsAssigned,
      };
    }),
  };

  return {
    userData: userData.data,
    assignedTickets: assignedTickets.data || [],
    userTeams: userTeams.data || [],
    stats,
    isLoading,
    isError,
  };
}
