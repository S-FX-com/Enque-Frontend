'use client';

import React, { useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
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
import NewTeamModal from '@/components/modals/new-team-modal';
import EditTeamModal from '@/components/modals/edit-team-modal';
import { getTeams, getTeamMembers, deleteTeam } from '@/services/team';
import { getTeamTasks } from '@/services/task';
import { Team } from '@/typescript/team';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/auth';

interface TeamWithCounts extends Team {
  agentCount: number | null;
  ticketCount: number | null;
}

const fetchTeamsWithCounts = async (): Promise<TeamWithCounts[]> => {
  const initialTeams = await getTeams();
  if (!initialTeams) {
    throw new Error('Initial teams fetch returned undefined');
  }

  if (initialTeams.length === 0) {
    return [];
  }

  const teamsWithInitialCounts: TeamWithCounts[] = initialTeams.map(team => ({
    ...team,
    agentCount: null,
    ticketCount: null,
  }));

  const countPromises = initialTeams.flatMap(team => [
    getTeamMembers(team.id),
    getTeamTasks(team.id),
  ]);

  const countResults = await Promise.allSettled(countPromises);

  const enrichedTeams = teamsWithInitialCounts.map((team, index) => {
    const membersResult = countResults[index * 2];
    const tasksResult = countResults[index * 2 + 1];

    const agentCount = membersResult.status === 'fulfilled' ? membersResult.value.length : null;
    const ticketCount = tasksResult.status === 'fulfilled' ? tasksResult.value.length : null;

    if (membersResult.status === 'rejected') {
      console.error(`Failed to fetch members for team ${team.id}:`, membersResult.reason);
    }
    if (tasksResult.status === 'rejected') {
      console.error(`Failed to fetch tasks for team ${team.id}:`, tasksResult.reason);
    }

    return {
      ...team,
      agentCount,
      ticketCount,
    };
  });

  return enrichedTeams;
};

const TeamsPage = () => {
  const queryClient = useQueryClient();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<TeamWithCounts | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<number>>(new Set());
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const {
    data: teams = [],
    isLoading,
    error,
  } = useQuery<TeamWithCounts[], Error>({
    queryKey: ['teamsWithCounts'],
    queryFn: fetchTeamsWithCounts,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  const handleEdit = (team: TeamWithCounts) => {
    setTeamToEdit(team);
    setIsEditModalOpen(true);
  };

  // --- Checkbox Handlers ---
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
  const deleteTeamsMutation = useMutation({
    mutationFn: async (teamIds: number[]) => {
      const results = await Promise.allSettled(teamIds.map(id => deleteTeam(id)));
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('Failed deletions:', failed);
        throw new Error(`Failed to delete ${failed.length} team(s).`);
      }
      return results;
    },
    onMutate: async (teamIdsToDelete: number[]) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['teamsWithCounts'] });

      // Snapshot the previous value
      const previousTeams = queryClient.getQueryData<TeamWithCounts[]>(['teamsWithCounts']);

      // Optimistically update to the new value
      queryClient.setQueryData<TeamWithCounts[]>(['teamsWithCounts'], old =>
        old ? old.filter(team => !teamIdsToDelete.includes(team.id)) : []
      );

      // Return a context object with the snapshotted value
      return { previousTeams };
    },
    onError: (err: Error, teamIdsToDelete, context) => {
      toast.error(`Error deleting teams: ${err.message}`);
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTeams) {
        queryClient.setQueryData(['teamsWithCounts'], context.previousTeams);
      }
      setIsBulkDeleteDialogOpen(false); // Keep dialog open or close based on preference
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.length} team(s) deleted successfully.`);
      setSelectedTeamIds(new Set()); // Clear selection on success
      setIsBulkDeleteDialogOpen(false); // Close dialog on success
    },
    onSettled: () => {
      // Always refetch after error or success:
      queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
      setSelectedTeamIds(new Set()); // Ensure selection is cleared
      // setIsBulkDeleteDialogOpen(false); // Ensure dialog is closed
    },
  });

  const handleBulkDeleteConfirm = () => {
    if (selectedTeamIds.size > 0) {
      deleteTeamsMutation.mutate(Array.from(selectedTeamIds));
    }
  };

  return (
    <>
      <div className="flex items-center justify-end py-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* <h1 className="text-2xl font-semibold">Teams</h1> REMOVED */}
          {selectedTeamIds.size > 0 && (
            <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleteTeamsMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedTeamIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected
                    {selectedTeamIds.size === 1 ? ' team' : ` ${selectedTeamIds.size} teams`}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteTeamsMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDeleteConfirm}
                    disabled={deleteTeamsMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteTeamsMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <Button size="sm" onClick={() => setIsNewModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New
        </Button>
      </div>

      <Card className="shadow-none border-0">
        <CardContent className="flex-1 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                <TableHead className="w-[50px] px-4">
                  <Checkbox
                    checked={headerCheckboxState}
                    onCheckedChange={handleSelectAllChange}
                    aria-label="Select all rows"
                    disabled={isLoading || teams.length === 0}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Tickets</TableHead>
                <TableHead className="text-center">Agents</TableHead>
                <TableHead className="text-right w-[50px]">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading teams...
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-red-600">
                    {error?.message || 'An error occurred'}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                teams.map(team => (
                  <TableRow
                    key={team.id}
                    className="hover:bg-card"
                    data-state={selectedTeamIds.has(team.id) ? 'selected' : ''}
                  >
                    <TableCell className="px-4">
                      <Checkbox
                        checked={selectedTeamIds.has(team.id)}
                        onCheckedChange={checked => handleRowSelectChange(team.id, checked)}
                        aria-label={`Select team ${team.name}`}
                        onClick={e => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.description || '-'}</TableCell>
                    <TableCell className="text-center">{team.ticketCount ?? '?'}</TableCell>
                    <TableCell className="text-center">{team.agentCount ?? '?'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(team)}
                        disabled={deleteTeamsMutation.isPending}
                        aria-label="Edit Team"
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

      <NewTeamModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSaveSuccess={async () => {
          console.log('New team saved successfully, invalidating queries.');
          queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
          queryClient.invalidateQueries({ queryKey: ['teams'] });
          const user = await getCurrentUser();
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: ['userTeams', user.id] });
            queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
            queryClient.invalidateQueries({ queryKey: ['agentTeams', user.id] });
          } else {
            queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
          }
        }}
      />

      {teamToEdit && (
        <EditTeamModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setTeamToEdit(null);
          }}
          onSaveSuccess={async () => {
            console.log('Team updated successfully, invalidating queries.');
            queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            const user = await getCurrentUser();
            if (user?.id) {
              queryClient.invalidateQueries({ queryKey: ['userTeams', user.id] });
              queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
              queryClient.invalidateQueries({ queryKey: ['agentTeams', user.id] });
            } else {
              queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
            }
          }}
          teamToEdit={teamToEdit}
        />
      )}
    </>
  );
};

export default TeamsPage;
