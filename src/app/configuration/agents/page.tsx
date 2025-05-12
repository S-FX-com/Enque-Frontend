'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgents, deleteAgent } from '@/services/agent';
import { Agent } from '@/typescript/agent';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import BoringAvatar from 'boring-avatars';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { NewAgentModal } from '@/components/modals/new-agent-modal'; // Import the new modal
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

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone_number', header: 'Phone number' },
  { accessorKey: 'job_title', header: 'Job title' },
  { accessorKey: 'role', header: 'Admin' },
];

export default function AgentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    data: agents = [],
    isLoading,
    isError,
    error,
  } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 5 * 60 * 1000,
  });
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<number>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false); // State for the new agent modal

  const avatarColors = ['#1D73F4', '#D4E4FA'];

  const handleRowClick = (agentId: number) => {
    router.push(`/configuration/agents/${agentId}`);
  };

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedAgentIds(new Set(agents.map(agent => agent.id)));
    } else {
      setSelectedAgentIds(new Set());
    }
  };

  const handleRowSelectChange = (agentId: number, checked: boolean | 'indeterminate') => {
    setSelectedAgentIds(prev => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(agentId);
      } else {
        next.delete(agentId);
      }
      return next;
    });
  };

  const isAllSelected = agents.length > 0 && selectedAgentIds.size === agents.length;
  const isIndeterminate = selectedAgentIds.size > 0 && selectedAgentIds.size < agents.length;
  const headerCheckboxState = isAllSelected ? true : isIndeterminate ? 'indeterminate' : false;

  const deleteAgentsMutation = useMutation({
    mutationFn: async (agentIds: number[]) => {
      const results = await Promise.allSettled(agentIds.map(id => deleteAgent(id)));
      const failedDeletions = results.filter(result => result.status === 'rejected');
      if (failedDeletions.length > 0) {
        console.error('Some agent deletions failed:', failedDeletions);
        throw new Error(`Failed to delete ${failedDeletions.length} agent(s).`);
      }
      return results;
    },
    onMutate: async agentIdsToDelete => {
      await queryClient.cancelQueries({ queryKey: ['agents'] });
      const previousAgents = queryClient.getQueryData<Agent[]>(['agents']);
      queryClient.setQueryData<Agent[]>(['agents'], old =>
        old ? old.filter(agent => !agentIdsToDelete.includes(agent.id)) : []
      );
      setSelectedAgentIds(new Set());
      setIsDeleteDialogOpen(false);
      return { previousAgents };
    },
    onError: (err, agentIdsToDelete, context) => {
      toast.error(`Error deleting agents: ${err.message}`);
      if (context?.previousAgents) {
        queryClient.setQueryData(['agents'], context.previousAgents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const handleDeleteConfirm = () => {
    if (selectedAgentIds.size > 0) {
      deleteAgentsMutation.mutate(Array.from(selectedAgentIds));
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 flex flex-col h-full">
      <div className="flex items-center justify-end py-4 flex-shrink-0"> {/* Adjusted to justify-end if title is removed */}
        {/* <h1 className="text-2xl font-bold">Agents</h1> REMOVED */}
        <div className="flex items-center gap-2">
          {selectedAgentIds.size > 0 && (
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleteAgentsMutation.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedAgentIds.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the selected
                    {selectedAgentIds.size === 1 ? ' agent' : ' agents'} and associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteAgentsMutation.isPending}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    disabled={deleteAgentsMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteAgentsMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button size="sm" onClick={() => setIsNewAgentModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New
          </Button>
        </div>
      </div>

      <Card className="bg-white dark:bg-black flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-black z-10">
                <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                  <TableHead className="w-[50px] px-4">
                    <Checkbox
                      checked={headerCheckboxState}
                      onCheckedChange={handleSelectAllChange}
                      aria-label="Select all rows"
                      disabled={isLoading || agents.length === 0}
                    />
                  </TableHead>
                  {columns.map(column => (
                    <TableHead key={column.accessorKey} className="px-6 py-4">{column.header}</TableHead> 
                  ))}
                  <TableHead className="w-[50px] text-right px-6 py-4"> 
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 2}
                      className="h-24 text-center text-red-500"
                    >
                      Error loading agents:{' '}
                      {error instanceof Error ? error.message : 'Unknown error'}
                    </TableCell>
                  </TableRow>
                ) : agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                      No agents found.
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map(agent => (
                    <TableRow
                      key={agent.id}
                      className="hover:bg-muted/50"
                      data-state={selectedAgentIds.has(agent.id) ? 'selected' : ''}
                    >
                      <TableCell className="px-4">
                        <Checkbox
                          checked={selectedAgentIds.has(agent.id)}
                          onCheckedChange={checked => handleRowSelectChange(agent.id, checked)}
                          aria-label={`Select row for ${agent.name}`}
                          onClick={e => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell
                        className="font-medium cursor-pointer px-6 py-4"
                        onClick={() => handleRowClick(agent.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border">
                            <BoringAvatar
                              size={24}
                              name={agent.email || agent.name || ''}
                              variant="beam"
                              colors={avatarColors}
                            />
                          </Avatar>
                          <span>{agent.name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">{agent.email || '-'}</TableCell>
                      <TableCell className="px-6 py-4">{agent.phone_number || '-'}</TableCell>
                      <TableCell className="px-6 py-4">{agent.job_title || '-'}</TableCell>
                      <TableCell className="capitalize px-6 py-4">
                        {agent.role === 'admin' ? 'True' : 'False'}
                      </TableCell>
                      <TableCell className="text-right px-6 py-4"> </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <NewAgentModal
        isOpen={isNewAgentModalOpen}
        onClose={() => setIsNewAgentModalOpen(false)}
        onInviteSuccess={() => {
        }}
      />
    </div>
  );
}
