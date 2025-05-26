'use client';

import React, { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import BoringAvatar from 'boring-avatars';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, UserCheck, Clock } from 'lucide-react';
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
  { accessorKey: 'email_signature', header: 'Email Signature' },
];

const pendingColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'created_at', header: 'Invited' },
];

export default function AgentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('active');
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

  // Filter agents based on active status
  const activeAgents = agents.filter(agent => agent.is_active);
  const pendingAgents = agents.filter(agent => !agent.is_active);
  const currentAgents = activeTab === 'active' ? activeAgents : pendingAgents;

  const handleRowClick = (agentId: number) => {
    router.push(`/configuration/agents/${agentId}`);
  };

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedAgentIds(new Set(currentAgents.map(agent => agent.id)));
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

  // Reset selection when switching tabs
  useEffect(() => {
    setSelectedAgentIds(new Set());
  }, [activeTab]);

  const isAllSelected = currentAgents.length > 0 && selectedAgentIds.size === currentAgents.length;
  const isIndeterminate = selectedAgentIds.size > 0 && selectedAgentIds.size < currentAgents.length;
  const headerCheckboxState = isAllSelected ? true : isIndeterminate ? 'indeterminate' : false;

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

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

  // Connect to the global New button
  useEffect(() => {
    // Expose the function to the window object so AppLayout can access it
    (window as Window & typeof globalThis & { openNewAgentModal?: () => void }).openNewAgentModal =
      () => setIsNewAgentModalOpen(true);
    return () => {
      // Clean up when the component unmounts
      delete (window as Window & typeof globalThis & { openNewAgentModal?: () => void })
        .openNewAgentModal;
    };
  }, []);

  return (
    <>
      <div className="flex items-center justify-end py-4 flex-shrink-0">
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
                  {selectedAgentIds.size === 1 ? ' agent' : ' agents'} and any related data.
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
      </div>

      <Card className="shadow-none border-0 flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto">
            <Tabs defaultValue="active" className="flex-1" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-100 dark:bg-gray-800">
                <TabsTrigger 
                  value="active" 
                  className="flex items-center gap-2 data-[state=active]:bg-[#f4f7fe] data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 data-[state=active]:shadow-sm"
                >
                  <UserCheck className="h-4 w-4" />
                  Active ({activeAgents.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="pending" 
                  className="flex items-center gap-2 data-[state=active]:bg-[#f4f7fe] data-[state=active]:text-blue-600 data-[state=active]:border-blue-200 data-[state=active]:shadow-sm"
                >
                  <Clock className="h-4 w-4" />
                  Pending ({pendingAgents.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="active">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-black z-10">
                <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                  <TableHead className="w-[50px] px-4">
                    <Checkbox
                      checked={headerCheckboxState}
                      onCheckedChange={handleSelectAllChange}
                      aria-label="Select all rows"
                          disabled={isLoading || activeAgents.length === 0}
                    />
                  </TableHead>
                  {columns.map(column => (
                    <TableHead key={column.accessorKey} className="px-6 py-4">
                      {column.header}
                    </TableHead>
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
                    ) : activeAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                          No active agents found.
                    </TableCell>
                  </TableRow>
                ) : (
                      activeAgents.map(agent => (
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
                      <TableCell className="px-6 py-4">
                        {agent.email_signature ? 'Custom' : 'Global'}
                      </TableCell>
                      <TableCell className="text-right px-6 py-4"> </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
              </TabsContent>
              <TabsContent value="pending">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-black z-10">
                    <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                      <TableHead className="w-[50px] px-4">
                        <Checkbox
                          checked={headerCheckboxState}
                          onCheckedChange={handleSelectAllChange}
                          aria-label="Select all rows"
                          disabled={isLoading || pendingAgents.length === 0}
                        />
                      </TableHead>
                      {pendingColumns.map(column => (
                        <TableHead key={column.accessorKey} className="px-6 py-4">
                          {column.header}
                        </TableHead>
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
                            <Skeleton className="h-8 w-8 ml-auto" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : isError ? (
                      <TableRow>
                        <TableCell
                          colSpan={pendingColumns.length + 2}
                          className="h-24 text-center text-red-500"
                        >
                          Error loading agents:{' '}
                          {error instanceof Error ? error.message : 'Unknown error'}
                        </TableCell>
                      </TableRow>
                    ) : pendingAgents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={pendingColumns.length + 2} className="h-24 text-center">
                          No pending invitations found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingAgents.map(agent => (
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
                              <Badge variant="outline" className="ml-2">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">{agent.email || '-'}</TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="outline" className="capitalize">
                              {agent.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">{formatRelativeTime(agent.created_at)}</TableCell>
                          <TableCell className="text-right px-6 py-4"> </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <NewAgentModal
        isOpen={isNewAgentModalOpen}
        onClose={() => setIsNewAgentModalOpen(false)}
        onInviteSuccess={() => {}}
      />
    </>
  );
}
