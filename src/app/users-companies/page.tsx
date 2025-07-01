// frontend/src/app/users-companies/page.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building, Users, PlusCircle, Loader2 } from 'lucide-react';
import NewCompanyModal from '@/components/modals/new-company-modal';
import NewUserModal from '@/components/modals/new-user-modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { getUnassignedUsers, updateUser } from '@/services/user';
import { IUser } from '@/typescript/user';
import { getCompanies, getCompanyUsers } from '@/services/company';
import { ICompany } from '@/typescript/company';
import { getAgents } from '@/services/agent';
import { Agent as IAgent } from '@/typescript/agent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CompanyUserView from './company-user-view';
import { toast } from 'sonner';
import { cn } from '@/lib/utils'; // Import cn utility

// Define possible view states
type ViewState = 'placeholder' | 'company_users' | 'unassigned_users';

export default function UsersCompaniesPage() {
  const queryClient = useQueryClient();

  // --- State ---
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('placeholder');
  const [assigningUserCompany, setAssigningUserCompany] = useState<{
    userId: number | null;
    companyId: string | null;
  }>({ userId: null, companyId: null });

  // --- Queries ---
  const {
    data: companies = [],
    isLoading: isLoadingCompanies,
    error: companiesError,
  } = useQuery<ICompany[]>({
    queryKey: ['companies'],
    queryFn: () => getCompanies({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: unassignedUsers,
    isLoading: isLoadingUnassigned,
    error: unassignedError,
  } = useQuery<IUser[]>({
    queryKey: ['unassignedUsers'],
    queryFn: () => getUnassignedUsers({ limit: 1000 }),
    enabled: currentView === 'unassigned_users',
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const {
    data: companyUsers = [],
    isLoading: isLoadingCompanyUsers,
    error: companyUsersError,
  } = useQuery<IUser[]>({
    queryKey: ['companyUsers', selectedCompanyId],
    queryFn: () =>
      selectedCompanyId ? getCompanyUsers(selectedCompanyId, { limit: 1000 }) : Promise.resolve([]),
    enabled: !!selectedCompanyId && currentView === 'company_users',
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const {
    data: agents = [],
    isLoading: isLoadingAgents,
    error: agentsError,
  } = useQuery<IAgent[]>({
    queryKey: ['allAgents'],
    queryFn: () => getAgents(),
    staleTime: 15 * 60 * 1000,
  });

  // --- Mutations ---
  const assignCompanyMutation = useMutation({
    mutationFn: ({ userId, companyId }: { userId: number; companyId: number | null }) =>
      updateUser(userId, { company_id: companyId }),
    onSuccess: (updatedUser, variables) => {
      toast.success(`User assigned to company successfully.`);
      queryClient.invalidateQueries({ queryKey: ['unassignedUsers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Invalidar para el modal "Change Primary Contact"
      if (variables.companyId) {
        queryClient.invalidateQueries({
          queryKey: ['companyUsers', variables.companyId.toString()],
        });
      }
      setAssigningUserCompany({ userId: null, companyId: null });
    },
    onError: error => {
      toast.error(`Failed to assign company: ${error.message}`);
      setAssigningUserCompany({ userId: null, companyId: null });
    },
  });

  // --- Derived State ---
  const selectedCompany = companies.find(c => c.id.toString() === selectedCompanyId);

  // --- Event Handlers ---
  const handleUserSaveSuccess = () => {
    console.log('User saved, refetching relevant lists...');
    queryClient.invalidateQueries({ queryKey: ['unassignedUsers'] });
    queryClient.invalidateQueries({ queryKey: ['users'] }); // Invalidar para el modal "Change Primary Contact"
    if (selectedCompanyId) {
      queryClient.invalidateQueries({ queryKey: ['companyUsers', selectedCompanyId] });
    }
  };

  const handleCompanySaveSuccess = () => {
    console.log('Company saved, invalidating companies AND unassigned users query...');
    queryClient.invalidateQueries({ queryKey: ['companies'] });
    queryClient.invalidateQueries({ queryKey: ['unassignedUsers'] });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header Section */}
      <div className="flex items-center justify-start flex-wrap gap-2">
        <Button
          variant="outline" // Keep outline variant always
          className={cn(
            // Apply specific light background and dark text when active
            currentView === 'unassigned_users' &&
              'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-700'
          )}
          onClick={() => {
            setCurrentView('unassigned_users');
            setSelectedCompanyId(null);
          }}
        >
          Unassigned Users
        </Button>
        <Button onClick={() => setIsNewCompanyModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add a Company
        </Button>
        <Button onClick={() => setIsNewUserModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add a User
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* Left Column: Company List */}
        <Card className="md:col-span-1 lg:col-span-1 flex flex-col shadow-sm border-0">
          <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
            <h2 className="text-lg font-semibold mb-4 flex-shrink-0">Active Companies</h2>
            <ScrollArea className="flex-grow">
              <div className="space-y-1 pr-4">
                {isLoadingCompanies ? (
                  <div className="space-y-2">
                    {' '}
                    <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" />{' '}
                    <Skeleton className="h-10 w-full" />{' '}
                  </div>
                ) : companiesError ? (
                  <p className="text-sm text-red-600">Error loading companies.</p>
                ) : companies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active companies found.</p>
                ) : (
                  companies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => {
                        setSelectedCompanyId(company.id.toString());
                        setCurrentView('company_users');
                      }}
                      className={`w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-muted ${selectedCompanyId === company.id.toString() && currentView === 'company_users' ? 'bg-muted font-semibold' : ''}`}
                    >
                      <Avatar className="h-8 w-8 text-xs overflow-hidden bg-slate-50 dark:bg-slate-800">
                        {company.logo_url ? (
                          <div className="relative w-full h-full p-1">
                            <AvatarImage
                              key={`${company.id}-${company.logo_url}`}
                              src={company.logo_url}
                              alt={`${company.name} logo`}
                              className="object-contain"
                            />
                          </div>
                        ) : null}
                        <AvatarFallback>
                          {company.logo_url ? null : (
                            <Building className="h-4 w-4 text-muted-foreground" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{company.name}</span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column: Conditional Rendering */}
        <Card className="md:col-span-2 lg:col-span-3 shadow-sm border-0 flex flex-col">
          {currentView === 'company_users' && selectedCompany ? (
            <CompanyUserView
              company={selectedCompany}
              users={companyUsers}
              agents={agents}
              isLoadingUsers={isLoadingCompanyUsers}
              usersError={companyUsersError}
              isLoadingAgents={isLoadingAgents}
              agentsError={agentsError}
              onSwitchToUnassigned={() => setCurrentView('unassigned_users')}
            />
          ) : currentView === 'unassigned_users' ? (
            // View: Unassigned Users
            <div className="w-full h-full flex flex-col">
              <h2 className="text-xl font-semibold mb-4 px-6 pt-6 flex-shrink-0">
                Unassigned Users
              </h2>
              <div className="flex-grow overflow-y-auto px-6 pb-6">
                {isLoadingUnassigned ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : unassignedError ? (
                  <p className="text-red-600">Error loading users: {unassignedError.message}</p>
                ) : !unassignedUsers || unassignedUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center">No unassigned users found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead className="w-[200px]">Assign Company</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedUsers.map(user => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || '-'}</TableCell>
                          <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Select
                              value={
                                assigningUserCompany.userId === user.id
                                  ? (assigningUserCompany.companyId ?? undefined)
                                  : undefined
                              }
                              onValueChange={value => {
                                const targetCompanyId =
                                  value === 'null' ? null : parseInt(value, 10);
                                if (targetCompanyId !== null) {
                                  setAssigningUserCompany({ userId: user.id, companyId: value });
                                  assignCompanyMutation.mutate({
                                    userId: user.id,
                                    companyId: targetCompanyId,
                                  });
                                }
                              }}
                              disabled={
                                isLoadingCompanies ||
                                (assignCompanyMutation.isPending &&
                                  assigningUserCompany.userId === user.id)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Assign..." />
                              </SelectTrigger>
                              <SelectContent>
                                {companiesError ? (
                                  <SelectItem value="error" disabled>
                                    Error loading
                                  </SelectItem>
                                ) : (
                                  companies.map(company => (
                                    <SelectItem key={company.id} value={company.id.toString()}>
                                      {company.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            // View: Initial Placeholder
            <CardContent className="p-6 flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center">
                <Users className="h-16 w-16 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a company on the left</p>
                <p className="text-muted-foreground">-or-</p>
                <div className="flex gap-4">
                  <Button onClick={() => setIsNewCompanyModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add a Company
                  </Button>
                  <Button onClick={() => setIsNewUserModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add a User
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Render Modals */}
      <NewCompanyModal
        isOpen={isNewCompanyModalOpen}
        onClose={() => setIsNewCompanyModalOpen(false)}
        onSaveSuccess={handleCompanySaveSuccess}
      />

      <NewUserModal
        isOpen={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
        onSaveSuccess={handleUserSaveSuccess}
      />
    </div>
  );
}
