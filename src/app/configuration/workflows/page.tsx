'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAutomations, deleteAutomation } from '@/services/automation';
import { Automation } from '@/typescript/automation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import NewAutomationModalMui from '@/components/modals/NewAutomationModalMui';
import EditAutomationModalMui from '@/components/modals/EditAutomationModalMui';

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
  { accessorKey: 'conditions', header: 'Conditions' },
  { accessorKey: 'actions', header: 'Actions' },
  { accessorKey: 'status', header: 'Status' },
];

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const {
    data: automations = [],
    isLoading,
    isError,
    error,
  } = useQuery<Automation[]>({
    queryKey: ['automations'],
    queryFn: () => getAutomations(),
    staleTime: 5 * 60 * 1000,
  });
  const [selectedAutomationIds, setSelectedAutomationIds] = useState<Set<number>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewAutomationModalOpen, setIsNewAutomationModalOpen] = useState(false);
  const [isEditAutomationModalOpen, setIsEditAutomationModalOpen] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<number | null>(null);

  const handleRowClick = (automationId: number) => {
    setEditingAutomationId(automationId);
    setIsEditAutomationModalOpen(true);
  };

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedAutomationIds(new Set(automations.map(automation => automation.id)));
    } else {
      setSelectedAutomationIds(new Set());
    }
  };

  const handleRowSelectChange = (automationId: number, checked: boolean | 'indeterminate') => {
    setSelectedAutomationIds(prev => {
      const next = new Set(prev);
      if (checked === true) {
        next.add(automationId);
      } else {
        next.delete(automationId);
      }
      return next;
    });
  };

  const isAllSelected = automations.length > 0 && selectedAutomationIds.size === automations.length;
  const isIndeterminate =
    selectedAutomationIds.size > 0 && selectedAutomationIds.size < automations.length;
  const headerCheckboxState = isAllSelected ? true : isIndeterminate ? 'indeterminate' : false;

  const deleteAutomationsMutation = useMutation({
    mutationFn: async (automationIds: number[]) => {
      const results = await Promise.allSettled(automationIds.map(id => deleteAutomation(id)));
      const failedDeletions = results.filter(result => result.status === 'rejected');
      if (failedDeletions.length > 0) {
        console.error('Some automation deletions failed:', failedDeletions);
        throw new Error(`Failed to delete ${failedDeletions.length} workflow(s).`);
      }
      return results;
    },
    onMutate: async automationIdsToDelete => {
      await queryClient.cancelQueries({ queryKey: ['automations'] });
      const previousAutomations = queryClient.getQueryData<Automation[]>(['automations']);
      queryClient.setQueryData<Automation[]>(['automations'], old =>
        old ? old.filter(automation => !automationIdsToDelete.includes(automation.id)) : []
      );
      setSelectedAutomationIds(new Set());
      setIsDeleteDialogOpen(false);
      return { previousAutomations };
    },
    onError: (err, automationIdsToDelete, context) => {
      toast.error(`Error deleting workflows: ${err.message}`);
      if (context?.previousAutomations) {
        queryClient.setQueryData(['automations'], context.previousAutomations);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['automations'] });
    },
  });

  const handleDeleteConfirm = () => {
    if (selectedAutomationIds.size > 0) {
      deleteAutomationsMutation.mutate(Array.from(selectedAutomationIds));
    }
  };

  // Connect to the global New button
  useEffect(() => {
    (
      window as Window & typeof globalThis & { openNewAutomationModal?: () => void }
    ).openNewAutomationModal = () => setIsNewAutomationModalOpen(true);
    return () => {
      delete (window as Window & typeof globalThis & { openNewAutomationModal?: () => void })
        .openNewAutomationModal;
    };
  }, []);

  const getConditionsText = (automation: Automation) => {
    if (automation.conditions.length === 0) return 'No conditions';
    if (automation.conditions.length === 1) {
      const condition = automation.conditions[0];
      const operatorLabels = {
        eql: 'is',
        neql: 'is not',
        con: 'contains',
        ncon: 'does not contain',
      };
      const operatorText =
        operatorLabels[condition.condition_operator as keyof typeof operatorLabels] ||
        condition.condition_operator;
      return `${condition.condition_type.toLowerCase().replace('_', ' ')} ${operatorText} ${condition.condition_value || ''}`;
    }
    return `${automation.conditions.length} conditions`;
  };

  const getActionsText = (automation: Automation) => {
    if (automation.actions.length === 0) return 'No actions';
    if (automation.actions.length === 1) {
      const action = automation.actions[0];
      return `${action.action_type.toLowerCase().replace('_', ' ')} ${action.action_value || ''}`;
    }
    return `${automation.actions.length} actions`;
  };

  return (
    <>
      <div className="flex items-center justify-end py-4 flex-shrink-0">
        {selectedAutomationIds.size > 0 && (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteAutomationsMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedAutomationIds.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the selected
                  {selectedAutomationIds.size === 1 ? ' workflow' : ' workflows'} and any related
                  data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteAutomationsMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={deleteAutomationsMutation.isPending}
                  className="bg-destructive text-whites text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteAutomationsMutation.isPending ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card className="shadow-none border-0 flex-1 flex flex-col overflow-hidden">
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
                      disabled={isLoading || automations.length === 0}
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
                      Error loading workflows:{' '}
                      {error instanceof Error ? error.message : 'Unknown error'}
                    </TableCell>
                  </TableRow>
                ) : automations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 2} className="h-24 text-center">
                      No workflows found.
                    </TableCell>
                  </TableRow>
                ) : (
                  automations.map(automation => (
                    <TableRow
                      key={automation.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      data-state={selectedAutomationIds.has(automation.id) ? 'selected' : ''}
                      onClick={() => handleRowClick(automation.id)}
                    >
                      <TableCell className="px-4">
                        <Checkbox
                          checked={selectedAutomationIds.has(automation.id)}
                          onCheckedChange={checked => handleRowSelectChange(automation.id, checked)}
                          aria-label={`Select row for ${automation.name}`}
                          onClick={e => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span>{automation.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {getConditionsText(automation)}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span className="text-sm text-gray-600">{getActionsText(automation)}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className={`text-sm font-medium text-gray-600 px-2 py-1 rounded-full ${
                            automation.is_active ? 'bg-green-100' : ''
                          }`}
                        >
                          {automation.is_active ? 'Active' : 'Inactive'}
                        </span>
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

      <NewAutomationModalMui
        open={isNewAutomationModalOpen}
        onClose={() => setIsNewAutomationModalOpen(false)}
        onCreateSuccess={() => {}}
      />

      <EditAutomationModalMui
        open={isEditAutomationModalOpen}
        onClose={() => {
          setIsEditAutomationModalOpen(false);
          setEditingAutomationId(null);
        }}
        automationId={editingAutomationId}
        onUpdateSuccess={() => {}}
      />
    </>
  );
}
