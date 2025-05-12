// frontend/src/app/users-companies/company-user-view.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ICompany, CompanyUpdatePayload } from '@/typescript/company';
import { IUser } from '@/typescript/user';
import { Agent as IAgent } from '@/typescript/agent';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Trash2, Pencil, Check, X as IconX } from 'lucide-react'; // Added Pencil, Check, IconX
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCompany, updateCompany } from '@/services/company';
import { updateUser } from '@/services/user';
import { toast } from 'sonner';
import type { BaseResponse } from '@/lib/fetch-api';
import { CompanyLogo } from '@/components/company/company-logo';

interface CompanyUserViewProps {
  company: ICompany;
  users: IUser[];
  agents: IAgent[];
  isLoadingUsers: boolean;
  usersError: Error | null;
  isLoadingAgents: boolean;
  agentsError: Error | null;
  onSwitchToUnassigned: () => void;
}

const CompanyUserView: React.FC<CompanyUserViewProps> = ({
  company,
  users,
  agents,
  isLoadingUsers,
  usersError,
  isLoadingAgents,
  agentsError,
  onSwitchToUnassigned,
}) => {
  const queryClient = useQueryClient();
  const [selectedPrimaryContact, setSelectedPrimaryContact] = useState<string | undefined>(
    undefined
  );
  const [selectedAccountManager, setSelectedAccountManager] = useState<string | undefined>(
    undefined
  );
  const [editableDescription, setEditableDescription] = useState(company.description || '');
  const [editableDomain, setEditableDomain] = useState(company.email_domain || '');
  const descriptionMaxLength = 150;
  const [isCompanyDeleteDialogOpen, setIsCompanyDeleteDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState(company.name);
  const [isUserUnassignDialogOpen, setIsUserUnassignDialogOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(company.logo_url);

  const updateMutation = useMutation<
    BaseResponse<ICompany>, // Type of data returned by mutationFn
    Error, // Type of error
    CompanyUpdatePayload, // Type of variables passed to mutationFn
    { previousCompany?: ICompany; previousCompanies?: ICompany[] } // Type of context
  >({
    mutationFn: (updateData: CompanyUpdatePayload) => updateCompany(company.id, updateData),
    onMutate: async (updateData: CompanyUpdatePayload) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['company', company.id.toString()] });
      await queryClient.cancelQueries({ queryKey: ['companies'] });

      // Snapshot the previous value for the specific company
      const previousCompany = queryClient.getQueryData<ICompany>([
        'company',
        company.id.toString(),
      ]);
      // Snapshot the previous value for the list of companies
      const previousCompanies = queryClient.getQueryData<ICompany[]>(['companies']);

      // Optimistically update to the new value
      if (updateData.name && previousCompany) {
        queryClient.setQueryData<ICompany>(['company', company.id.toString()], {
          ...previousCompany,
          name: updateData.name,
        });
        setEditableName(updateData.name); // Update local state for input field if still visible
      }
      if (updateData.name && previousCompanies) {
        queryClient.setQueryData<ICompany[]>(['companies'], oldCompanies =>
          oldCompanies?.map(c => (c.id === company.id ? { ...c, name: updateData.name! } : c))
        );
      }

      // Also optimistically update other fields if they are part of updateData
      // For simplicity, this example focuses on 'name'. A more generic approach would update all fields in updateData.
      // For example, if updating description:
      // if (updateData.description !== undefined && previousCompany) {
      //   queryClient.setQueryData<ICompany>(['company', company.id.toString()], {
      //     ...previousCompany,
      //     description: updateData.description,
      //   });
      // }

      return { previousCompany, previousCompanies };
    },
    onSuccess: (response: BaseResponse<ICompany>, variables) => {
      if (response.success && response.data) {
        toast.success(`Company "${response.data.name}" updated.`);
        // If the name was updated, ensure local state for editing is also up-to-date
        if (variables.name) {
          setEditableName(response.data.name);
        }
      } else {
        toast.error(response.message || 'Failed to update company. Please try again.');
      }
    },
    onError: (error: Error, variables, context) => {
      toast.error(`Failed to update company: ${error.message}`);
      // Rollback optimistic update
      if (context?.previousCompany) {
        queryClient.setQueryData(['company', company.id.toString()], context.previousCompany);
        setEditableName(context.previousCompany.name); // Revert local state
      }
      if (context?.previousCompanies) {
        queryClient.setQueryData(['companies'], context.previousCompanies);
      }
      // Revert other local states if they were part of the failed update
      if (variables.description !== undefined) setEditableDescription(company.description || '');
      if (variables.email_domain !== undefined) setEditableDomain(company.email_domain || '');
      if (variables.primary_contact_id !== undefined)
        setSelectedPrimaryContact(company.primary_contact_id?.toString() || undefined);
      if (variables.account_manager_id !== undefined)
        setSelectedAccountManager(company.account_manager_id?.toString() || undefined);
    },
    onSettled: (response: BaseResponse<ICompany> | undefined) => {
      const companyIdForInvalidation =
        response?.success && response?.data?.id
          ? response.data.id.toString()
          : company.id.toString();

      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', companyIdForInvalidation] });
      queryClient.invalidateQueries({ queryKey: ['companyUsers', companyIdForInvalidation] });
      queryClient.invalidateQueries({ queryKey: ['unassignedUsers'] });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: () => deleteCompany(company.id),
    onSuccess: () => {
      toast.success(`Company "${company.name}" deleted successfully.`);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      onSwitchToUnassigned();
      setIsCompanyDeleteDialogOpen(false);
    },
    onError: error => {
      toast.error(`Failed to delete company: ${error.message}`);
      setIsCompanyDeleteDialogOpen(false);
    },
  });

  const handleDeleteCompanyConfirm = () => {
    deleteCompanyMutation.mutate();
  };

  const unassignUsersMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const results = await Promise.allSettled(
        userIds.map(id => updateUser(id, { company_id: null }))
      );
      const failedAssignments = results
        .map((result, index) => ({ result, id: userIds[index] }))
        .filter(
          item =>
            item.result.status === 'rejected' ||
            (item.result.status === 'fulfilled' &&
              !(item.result as PromiseFulfilledResult<BaseResponse<IUser>>).value.success)
        );

      if (failedAssignments.length > 0) {
        const errorMessages = failedAssignments
          .map(item => {
            let message = 'Unknown error';
            if (item.result.status === 'rejected') {
              message = (item.result as PromiseRejectedResult).reason?.message || 'Network error';
            } else if (item.result.status === 'fulfilled') {
              message =
                (item.result as PromiseFulfilledResult<BaseResponse<IUser>>).value.message ||
                'API error without message';
            }
            return `User ID ${item.id}: ${message}`;
          })
          .join(', ');
        throw new Error(`Failed to unassign some users: ${errorMessages}`);
      }
      return results;
    },
    onMutate: async userIdsToUnassign => {
      const companyIdStr = company.id.toString();
      await queryClient.cancelQueries({ queryKey: ['companyUsers', companyIdStr] });
      const previousCompanyUsers = queryClient.getQueryData<IUser[]>([
        'companyUsers',
        companyIdStr,
      ]);

      queryClient.setQueryData<IUser[]>(['companyUsers', companyIdStr], oldUsers => {
        if (!oldUsers) return [];
        return oldUsers.filter(user => !userIdsToUnassign.includes(user.id));
      });
      setSelectedUserIds(new Set());
      setIsUserUnassignDialogOpen(false);
      return { previousCompanyUsers };
    },
    onSuccess: (data, variables) => {
      const companyIdStr = company.id.toString();
      toast.success(`${variables.length} user(s) unassigned from ${company.name}.`);
      queryClient.invalidateQueries({ queryKey: ['companyUsers', companyIdStr] });
      queryClient.invalidateQueries({ queryKey: ['unassignedUsers'] });
    },
    onError: (
      error: Error,
      _variables,
      context: { previousCompanyUsers?: IUser[] } | undefined
    ) => {
      const companyIdStr = company.id.toString();
      toast.error(`Error unassigning users: ${error.message}`);
      if (context?.previousCompanyUsers) {
        queryClient.setQueryData(['companyUsers', companyIdStr], context.previousCompanyUsers);
      }
    },
    onSettled: () => {
      const companyIdStr = company.id.toString();
      queryClient.invalidateQueries({ queryKey: ['companyUsers', companyIdStr] });
      queryClient.invalidateQueries({ queryKey: ['unassignedUsers'] });
    },
  });

  const handleUnassignSelectedUsers = () => {
    if (selectedUserIds.size > 0) {
      unassignUsersMutation.mutate(Array.from(selectedUserIds));
    }
  };

  useEffect(() => {
    setSelectedPrimaryContact(company.primary_contact_id?.toString() || undefined);
    setSelectedAccountManager(company.account_manager_id?.toString() || undefined);
    setEditableDescription(company.description || '');
    setEditableDomain(company.email_domain || '');
    setEditableName(company.name); // Update editableName when company prop changes
    setSelectedUserIds(new Set());
    setLogoUrl(company.logo_url); // Actualizar el estado logoUrl cuando cambia la compañía
  }, [company]);

  const handleFieldUpdate = (
    field: keyof CompanyUpdatePayload,
    value: string | number | null | undefined
  ) => {
    if (field === 'name' && value === company.name) return; // Check for name change
    if (field === 'description' && value === (company.description || '')) return;
    if (field === 'email_domain' && value === (company.email_domain || '')) return;
    if (field === 'primary_contact_id' && value === company.primary_contact_id) return;
    if (field === 'account_manager_id' && value === company.account_manager_id) return;

    const updateData: CompanyUpdatePayload = { [field]: value };
    console.log(`Updating ${field} to:`, value);
    updateMutation.mutate(updateData);
  };

  const handlePrimaryContactChange = (value: string) => {
    const idValue = value === 'null' ? null : parseInt(value, 10);
    setSelectedPrimaryContact(value === 'null' ? undefined : value);
    handleFieldUpdate('primary_contact_id', idValue);
  };

  const handleAccountManagerChange = (value: string) => {
    const idValue = value === 'null' ? null : parseInt(value, 10);
    setSelectedAccountManager(value === 'null' ? undefined : value);
    handleFieldUpdate('account_manager_id', idValue);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (event.target.value.length <= descriptionMaxLength) {
      setEditableDescription(event.target.value);
    }
  };

  const handleDomainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditableDomain(event.target.value);
  };

  const handleDescriptionBlur = () => {
    if (editableDescription !== (company.description || '')) {
      handleFieldUpdate('description', editableDescription);
    }
  };

  const handleDomainBlur = () => {
    if (editableDomain !== (company.email_domain || '')) {
      handleFieldUpdate('email_domain', editableDomain || null);
    }
  };

  const handleSelectAllUsersChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      if (checked === true) {
        setSelectedUserIds(new Set(users.map(user => user.id)));
      } else {
        setSelectedUserIds(new Set());
      }
    },
    [users]
  );

  const handleUserRowSelectChange = useCallback(
    (userId: number, checked: boolean | 'indeterminate') => {
      setSelectedUserIds(prev => {
        const next = new Set(prev);
        if (checked === true) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    },
    []
  );

  const isAllUsersSelected = users.length > 0 && selectedUserIds.size === users.length;
  const isIndeterminateUsers = selectedUserIds.size > 0 && selectedUserIds.size < users.length;
  const usersHeaderCheckboxState = isAllUsersSelected
    ? true
    : isIndeterminateUsers
      ? 'indeterminate'
      : false;

  const canDeleteCompany = users.length === 0;

  const handleLogoChange = (newLogoUrl: string | null) => {
    setLogoUrl(newLogoUrl);
    handleFieldUpdate('logo_url', newLogoUrl);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6 overflow-hidden">
      {/* Top Section */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <CompanyLogo
            logoUrl={logoUrl}
            companyName={company.name}
            onLogoChange={handleLogoChange}
            isUpdating={updateMutation.isPending}
            key={`company-${company.id}-${logoUrl}`}
          />
          <div className="flex items-center">
            {isEditingName ? (
              <>
                <Input
                  value={editableName}
                  onChange={e => setEditableName(e.target.value)}
                  className="text-xl font-semibold h-9" // Adjusted height
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (editableName.trim() && editableName.trim() !== company.name) {
                        handleFieldUpdate('name', editableName.trim());
                      }
                      setIsEditingName(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setEditableName(company.name);
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    if (editableName.trim() && editableName.trim() !== company.name) {
                      handleFieldUpdate('name', editableName.trim());
                    }
                    setIsEditingName(false);
                  }}
                  disabled={updateMutation.isPending || !editableName.trim()}
                >
                  <Check className="h-5 w-5 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditableName(company.name);
                  }}
                  disabled={updateMutation.isPending}
                >
                  <IconX className="h-5 w-5 text-red-600" />
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">{company.name}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  onClick={() => {
                    setEditableName(company.name);
                    setIsEditingName(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <AlertDialog open={isCompanyDeleteDialogOpen} onOpenChange={setIsCompanyDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={
                deleteCompanyMutation.isPending || updateMutation.isPending || !canDeleteCompany
              }
              title={
                !canDeleteCompany ? 'Cannot delete company with associated users' : 'Delete Company'
              }
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Company
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {`This action cannot be undone. This will permanently delete the company "${company.name}". Associated users will become unassigned (if not already).`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteCompanyMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCompanyConfirm}
                disabled={deleteCompanyMutation.isPending}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleteCompanyMutation.isPending ? 'Deleting...' : 'Yes, delete company'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Company Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 flex-shrink-0">
        {/* Column 1 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="primary-contact">Primary Contact</Label>
            <Select
              value={selectedPrimaryContact}
              onValueChange={handlePrimaryContactChange}
              disabled={isLoadingUsers || updateMutation.isPending}
            >
              <SelectTrigger id="primary-contact">
                <SelectValue placeholder={isLoadingUsers ? 'Loading...' : '--'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">--</SelectItem>
                {/* Display only user name */}
                {usersError ? (
                  <SelectItem value="error" disabled>
                    Error
                  </SelectItem>
                ) : (
                  users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="company-domain">Email domain</Label>
            <Input
              id="company-domain"
              value={editableDomain}
              onChange={handleDomainChange}
              onBlur={handleDomainBlur}
              placeholder="example.com"
              className="text-sm"
              disabled={updateMutation.isPending}
            />
          </div>
        </div>
        {/* Column 2 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="account-manager">Account manager</Label>
            <Select
              value={selectedAccountManager}
              onValueChange={handleAccountManagerChange}
              disabled={isLoadingAgents || updateMutation.isPending}
            >
              <SelectTrigger id="account-manager">
                <SelectValue placeholder={isLoadingAgents ? 'Loading...' : '--'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">--</SelectItem>
                {agentsError ? (
                  <SelectItem value="error" disabled>
                    Error
                  </SelectItem>
                ) : (
                  agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Column 3 */}
        <div className="space-y-1">
          <Label htmlFor="company-description">Description</Label>
          <Textarea
            id="company-description"
            value={editableDescription}
            onChange={handleDescriptionChange}
            onBlur={handleDescriptionBlur}
            placeholder="Enter description..."
            rows={4}
            className="text-sm resize-none"
            maxLength={descriptionMaxLength}
            disabled={updateMutation.isPending}
          />
          <p className="text-xs text-muted-foreground text-right">
            {editableDescription.length}/{descriptionMaxLength}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-b flex-shrink-0"></div>

      {/* Users Table Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Users in {company.name}</h3>
            {selectedUserIds.size > 0 && (
              <AlertDialog
                open={isUserUnassignDialogOpen}
                onOpenChange={setIsUserUnassignDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unassignUsersMutation.isPending}
                    className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Unassign ({selectedUserIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white dark:bg-slate-950">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unassign Selected Users?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {selectedUserIds.size} user(s) from the company &quot;
                      {company.name}&quot;. They will not be deleted from the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={unassignUsersMutation.isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUnassignSelectedUsers}
                      disabled={unassignUsersMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800 dark:text-slate-50"
                    >
                      {unassignUsersMutation.isPending ? 'Unassigning...' : 'Unassign Users'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <Button
            size="sm"
            onClick={onSwitchToUnassigned}
            disabled={unassignUsersMutation.isPending}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add User to Company
          </Button>
        </div>
        <div className="flex-grow overflow-y-auto border rounded-md">
          {isLoadingUsers ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : usersError ? (
            <p className="text-red-600 p-4">Error loading users: {usersError.message}</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center p-4">
              No users found for this company.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                  <TableHead className="w-[50px] p-2">
                    <Checkbox
                      checked={usersHeaderCheckboxState}
                      onCheckedChange={handleSelectAllUsersChange}
                      aria-label="Select all users"
                      disabled={isLoadingUsers || users.length === 0}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow
                    key={user.id}
                    data-state={selectedUserIds.has(user.id) ? 'selected' : ''}
                  >
                    <TableCell className="p-2">
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={checked => handleUserRowSelectChange(user.id, checked)}
                        aria-label={`Select user ${user.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyUserView;
