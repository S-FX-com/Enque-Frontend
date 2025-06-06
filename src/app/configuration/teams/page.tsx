'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Pencil, Trash2, Users, ServerCrash } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import NewTeamModalMui from '@/components/modals/NewTeamModalMui';
import EditTeamModalMui from '@/components/modals/EditTeamModalMui';
import { getTeams, getTeamMembers, deleteTeam } from '@/services/team';
import { getAgents } from '@/services/agent';
import type { Team, TeamMember } from '@/typescript/team';
import type { Agent } from '@/typescript/agent';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// Simplified interface to avoid type conflicts
interface LocalTeamData extends Team {
  agents: TeamMember[] | null;
  members?: TeamMember[];
}

// Define more specific types for promise results
interface CountFailure {
  type: 'members' | 'tasks';
  teamId: number;
  error: Error; // error is present on captured failure
}

const fetchTeamsWithCounts = async (): Promise<LocalTeamData[]> => {
  const initialTeams = await getTeams();
  if (!initialTeams || initialTeams.length === 0) {
    return [];
  }

  const teamsMap = new Map<number, LocalTeamData>(
    initialTeams.map(team => [
      team.id,
      {
        ...team,
        agents: null,
        members: [],
      },
    ])
  );

  const countPromises = initialTeams.map(team =>
    getTeamMembers(team.id)
      .then(members => ({
        type: 'members' as const,
        teamId: team.id,
        data: members,
      }))
      .catch(
        (err: Error) => ({ type: 'members' as const, teamId: team.id, error: err }) as CountFailure
      )
  );

  const countResults = await Promise.allSettled(countPromises);

  countResults.forEach(settledResult => {
    if (settledResult.status === 'fulfilled') {
      const value = settledResult.value;
      const team = teamsMap.get(value.teamId);

      if (team) {
        if (value.type === 'members') {
          if ('data' in value) {
            // Store the team members directly
            team.members = value.data;
            team.agents = value.data;
          } else if ('error' in value) {
            console.error(`Error fetching members for team ${value.teamId}:`, value.error.message);
          }
        }
      }
    } else {
      console.error(
        'A promise for fetching team counts was rejected directly:',
        (settledResult.reason as Error)?.message || settledResult.reason
      );
    }
  });

  return Array.from(teamsMap.values());
};

const TeamsPage = () => {
  const queryClient = useQueryClient();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<LocalTeamData | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const { data: allAgents = [], isLoading: isLoadingAgents } = useQuery<Agent[], Error>({
    queryKey: ['allAgents'],
    queryFn: getAgents,
    staleTime: 1000 * 60 * 15,
  });

  const {
    data: teams = [],
    isLoading: isLoadingTeams,
    error: teamsError,
  } = useQuery<LocalTeamData[], Error>({
    queryKey: ['teamsWithCounts'],
    queryFn: fetchTeamsWithCounts,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  const handleEdit = (team: LocalTeamData) => {
    setTeamToEdit(team);
    setIsEditModalOpen(true);
  };

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedTeamIds(new Set(teams.map(team => team.id)));
    } else {
      setSelectedTeamIds(new Set());
    }
  };

  const handleRowSelectChange = (teamId: number, checked: boolean | 'indeterminate') => {
    setSelectedTeamIds(prev => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(teamId);
      } else {
        next.delete(teamId);
      }
      return next;
    });
  };

  const isAllSelected = teams.length > 0 && selectedTeamIds.size === teams.length;
  const isIndeterminate = selectedTeamIds.size > 0 && selectedTeamIds.size < teams.length;
  const headerCheckboxState = isAllSelected ? true : isIndeterminate ? 'indeterminate' : false;

  const deleteTeamsMutation = useMutation<
    unknown,
    Error,
    number[],
    { previousTeams?: LocalTeamData[] }
  >({
    mutationFn: async (teamIds: number[]) => {
      const results = await Promise.allSettled(teamIds.map(id => deleteTeam(id)));
      const failedDeletions = results.filter(r => r.status === 'rejected');
      if (failedDeletions.length > 0) {
        console.error('Failed deletions:', failedDeletions);
        const errorMessages = failedDeletions
          .map(
            fail => ((fail as PromiseRejectedResult).reason as Error)?.message || 'Unknown error'
          )
          .join(', ');
        throw new Error(`Failed to delete ${failedDeletions.length} team(s): ${errorMessages}`);
      }
      return results;
    },
    onMutate: async (teamIdsToDelete: number[]) => {
      await queryClient.cancelQueries({ queryKey: ['teamsWithCounts'] });
      const previousTeams = queryClient.getQueryData<LocalTeamData[]>(['teamsWithCounts']);
      queryClient.setQueryData<LocalTeamData[]>(['teamsWithCounts'], old =>
        old ? old.filter(team => !teamIdsToDelete.includes(team.id)) : []
      );
      return { previousTeams };
    },
    onError: (err, _teamIdsToDelete, context) => {
      toast.error(err.message || 'Error deleting teams. Some teams may not have been deleted.');
      if (context?.previousTeams) {
        queryClient.setQueryData(['teamsWithCounts'], context.previousTeams);
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(`${variables.length} team(s) deleted successfully.`);
      setSelectedTeamIds(new Set());
      setIsBulkDeleteDialogOpen(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
      setSelectedTeamIds(new Set());
    },
  });

  const handleBulkDeleteConfirm = () => {
    if (selectedTeamIds.size > 0) {
      deleteTeamsMutation.mutate(Array.from(selectedTeamIds));
    }
  };

  // Exponer la función para abrir el modal al objeto window para el layout principal
  useEffect(() => {
    (window as Window & typeof globalThis & { openNewTeamModal?: () => void }).openNewTeamModal =
      () => setIsNewModalOpen(true);
    return () => {
      delete (window as Window & typeof globalThis & { openNewTeamModal?: () => void })
        .openNewTeamModal;
    };
  }, []);

  if (isLoadingTeams || isLoadingAgents) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between py-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Skeleton className="h-5 w-5" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-5 w-32" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-5 w-48" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-5 w-48" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Skeleton className="h-5 w-20" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-5" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full mr-2" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-16" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (teamsError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <ServerCrash className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <CardTitle className="text-2xl">Oops! Something went wrong.</CardTitle>
            <CardDescription className="text-muted-foreground">
              We couldn&apos;t load your teams data. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => queryClient.refetchQueries({ queryKey: ['teamsWithCounts'] })}>
              Try Again
            </Button>
            <p className="text-xs text-muted-foreground mt-4">Error: {teamsError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between py-4 px-4 md:px-0 flex-shrink-0">
        <div className="flex items-center">
          {/* <h1 className="text-2xl font-semibold">Teams Management</h1> */}
        </div>
        <div className="flex items-center gap-2">
          {selectedTeamIds.size > 0 && (
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteTeamsMutation.isPending || selectedTeamIds.size === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedTeamIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected team(s)
                    and all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteTeamsMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDeleteConfirm}
                    disabled={deleteTeamsMutation.isPending}
                  >
                    {deleteTeamsMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {!isLoadingTeams && !teamsError && teams.length === 0 && (
        <Card className="mt-4">
          <CardHeader className="text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <CardTitle className="mt-2">No Teams Found</CardTitle>
            <CardDescription>
              Get started by creating a new team using the &quot;New Team&quot; button in the top
              bar.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isLoadingTeams && !teamsError && teams.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] px-3 py-3.5">
                    <Checkbox
                      checked={headerCheckboxState}
                      onCheckedChange={handleSelectAllChange}
                      aria-label="Select all rows"
                      disabled={deleteTeamsMutation.isPending}
                    />
                  </TableHead>
                  <TableHead className="w-[180px] max-w-[200px] px-3 py-3.5">Name</TableHead>
                  <TableHead className="hidden md:table-cell w-[220px] max-w-[250px] px-3 py-3.5">
                    Description
                  </TableHead>
                  <TableHead className="hidden sm:table-cell px-3 py-3.5">Agents</TableHead>
                  <TableHead className="text-right w-[80px] px-3 py-3.5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map(team => (
                  <TableRow
                    key={team.id}
                    data-state={selectedTeamIds.has(team.id) ? 'selected' : undefined}
                  >
                    <TableCell className="px-3 py-2">
                      <Checkbox
                        checked={selectedTeamIds.has(team.id)}
                        onCheckedChange={checked => handleRowSelectChange(team.id, checked)}
                        aria-label={`Select row for ${team.name}`}
                        disabled={deleteTeamsMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="font-medium px-3 py-2">
                      <div className="flex items-center">
                        {team.icon_name ? (
                          <span className="mr-2 text-xl">{team.icon_name}</span>
                        ) : (
                          <Users className="mr-2 h-5 w-5 text-muted-foreground" />
                        )}
                        {team.name}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground px-3 py-2">
                      {team.description ? (
                        team.description.length > 60 ? (
                          team.description.substring(0, 60) + '...'
                        ) : (
                          team.description
                        )
                      ) : (
                        <span className="text-gray-400 italic">No description</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell px-3 py-2">
                      {team.agents !== null ? (
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                          {team.agents?.length > 0 ? (
                            <span>{team.agents.length} agent(s)</span>
                          ) : (
                            <span className="text-gray-400 italic">No agents</span>
                          )}
                        </div>
                      ) : (
                        <Skeleton className="h-5 w-20 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(team)}
                        disabled={deleteTeamsMutation.isPending}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isNewModalOpen && (
        <NewTeamModalMui
          open={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          agents={allAgents}
        />
      )}
      {isEditModalOpen && teamToEdit && (
        <EditTeamModalMui
          open={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setTeamToEdit(null);
          }}
          teamToEdit={{
            ...teamToEdit,
            agentCount: teamToEdit.agents?.length ?? 0,
            ticketCount: teamToEdit.ticket_count ?? 0,
          }}
          allAgents={allAgents}
        />
      )}
    </>
  );
};

export default TeamsPage;
