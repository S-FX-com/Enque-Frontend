"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import NewTeamModal from '@/components/modals/new-team-modal';
import EditTeamModal from '@/components/modals/edit-team-modal';
import { getTeams, getTeamMembers, deleteTeam } from '@/services/team';
import { getTeamTasks } from '@/services/task';
import { Team } from '@/typescript/team';
import { toast } from "sonner";
import { getCurrentUser } from '@/lib/auth';

interface TeamWithCounts extends Team {
  agentCount: number | null;
  ticketCount: number | null;
}

const fetchTeamsWithCounts = async (): Promise<TeamWithCounts[]> => {
    const initialTeams = await getTeams();
    if (!initialTeams) {
        throw new Error("Initial teams fetch returned undefined");
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
        getTeamTasks(team.id)
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
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

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

  const confirmDeleteTeam = async (teamId: number) => {
      setIsDeleting(teamId);
      try {
          await deleteTeam(teamId);
          toast.success(`Team successfully deleted.`);
          queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
          const user = await getCurrentUser();
          if (user?.id) {
              queryClient.invalidateQueries({ queryKey: ['userTeams', user.id] });
              queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
          }
      } catch (err) {
          console.error("Failed to delete team:", err);
          toast.error(err instanceof Error ? err.message : "Failed to delete team.");
      } finally {
          setIsDeleting(null);
      }
  };

  const handleDeleteClick = (teamId: number, teamName: string) => {
    toast.warning(`Delete the team "${teamName}"?`, {
        description: "This action cannot be undone.",
        action: {
            label: "Delete",
            onClick: () => confirmDeleteTeam(teamId),
        },
        cancel: {
            label: "Cancel",
            onClick: () => console.log("Delete cancelled"),
        },
        duration: 10000,
    });
  };


  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
       <div className="flex items-center justify-between">
         <h1 className="text-2xl font-semibold">Teams</h1>
         <Button onClick={() => setIsNewModalOpen(true)}>+ New Team</Button>
       </div>

      <Card className="shadow-none border-0">
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Tickets</TableHead>
                <TableHead className="text-center">Agents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading teams...</TableCell>
                </TableRow>
              )}
              {error && (
                 <TableRow>
                   <TableCell colSpan={5} className="text-center text-red-600">{error?.message || 'An error occurred'}</TableCell>
                 </TableRow>
              )}
              {!isLoading && !error && teams.map((team) => (
                <TableRow key={team.id} className="hover:bg-card">
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.description || '-'}</TableCell>
                  <TableCell className="text-center">{team.ticketCount ?? '?'}</TableCell>
                  <TableCell className="text-center">{team.agentCount ?? '?'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isDeleting === team.id}>
                          <span className="sr-only">Open menu</span>
                          {isDeleting === team.id ? (
                              <div className="h-4 w-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin"></div>
                          ) : (
                              <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(team)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(team.id, team.name)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
          console.log("New team saved successfully, invalidating queries.");
          queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
          const user = await getCurrentUser();
          if (user?.id) {
              queryClient.invalidateQueries({ queryKey: ['userTeams', user.id] });
              queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
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
              console.log("Team updated successfully, invalidating queries.");
              queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
              const user = await getCurrentUser();
              if (user?.id) {
                  queryClient.invalidateQueries({ queryKey: ['userTeams', user.id] });
                  queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
              }
            }}
            teamToEdit={teamToEdit}
          />
      )}
    </div>
  );
};

export default TeamsPage;
