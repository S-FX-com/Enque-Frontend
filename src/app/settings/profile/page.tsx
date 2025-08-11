'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentAvatar } from '@/components/agent/agent-avatar';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { getAgentById, updateAgentProfile } from '@/services/agent';
import { AgentUpdate, Agent } from '@/typescript/agent';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Info, Link as LinkIcon, Unlink } from 'lucide-react';
import { getGlobalSignature } from '@/services/global-signature';
import {
  microsoftAuthService,
  MicrosoftAuthStatus,
  MicrosoftProfileData,
} from '@/services/microsoftAuth';
import { getAuthToken } from '@/lib/auth';
import Link from 'next/link';

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-1">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="text-sm col-span-2">{value || '-'}</dd>
  </div>
);

const EditRow: React.FC<{
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}> = ({ label, id, value, onChange, disabled }) => (
  <div className="grid grid-cols-3 items-center gap-4 py-1">
    <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
      {label}
    </Label>
    <Input
      id={id}
      value={value}
      onChange={onChange}
      className="col-span-2 h-8 text-sm"
      disabled={disabled}
    />
  </div>
);

export default function ProfileSettingsPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser, reloadAuth, updateUserSessionData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [editedJobTitle, setEditedJobTitle] = useState('');
  const [editedPhoneNumber, setEditedPhoneNumber] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedSignature, setEditedSignature] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined);

  const currentUserRole = user?.role;

  const agentId = user?.id;
  const {
    data: agentProfileData,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    error: profileError,
  } = useQuery<Agent>({
    queryKey: ['agent', agentId],
    queryFn: () => getAgentById(agentId!),
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: globalSignatureData, isLoading: isLoadingGlobalSignature } = useQuery({
    queryKey: ['globalSignature', user?.workspace_id],
    queryFn: () => getGlobalSignature(user!.workspace_id),
    enabled: !!user?.workspace_id,
    staleTime: 5 * 60 * 1000,
  });

  // Microsoft 365 Auth Status
  const {
    data: microsoftAuthStatus,
    isLoading: isLoadingMicrosoftAuth,
    refetch: refetchMicrosoftAuth,
  } = useQuery<MicrosoftAuthStatus>({
    queryKey: ['microsoftAuthStatus', agentId],
    queryFn: async () => {
      const token = getAuthToken();
      if (!token) throw new Error('No auth token');
      const response = await microsoftAuthService.getAuthStatus(token);
      if (!response.success) throw new Error(response.message);
      return response.data!;
    },
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000,
  });

  // Microsoft 365 Profile Data (only if linked)
  const { data: microsoftProfile, isLoading: isLoadingMicrosoftProfile } =
    useQuery<MicrosoftProfileData>({
      queryKey: ['microsoftProfile', agentId],
      queryFn: async () => {
        const token = getAuthToken();
        if (!token) throw new Error('No auth token');
        const response = await microsoftAuthService.getProfile(token);
        if (!response.success) throw new Error(response.message);
        return response.data!;
      },
      enabled: !!agentId && !!microsoftAuthStatus?.is_linked,
      staleTime: 5 * 60 * 1000,
    });

  useEffect(() => {
    if (agentProfileData) {
      setEditedName(agentProfileData.name || '');
      setEditedEmail(agentProfileData.email || '');
      setEditedJobTitle(agentProfileData.job_title || '');
      setEditedPhoneNumber(agentProfileData.phone_number || '');
      setEditedRole(agentProfileData.role || 'agent');
      setEditedSignature(agentProfileData.email_signature || '');
      setAvatarUrl(agentProfileData.avatar_url);
    } else {
      setEditedName('');
      setEditedEmail('');
      setEditedJobTitle('');
      setEditedPhoneNumber('');
      setEditedRole('agent');
      setEditedSignature('');
      setAvatarUrl(undefined);
    }
  }, [agentProfileData]);

  // Handle Microsoft linking callback
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const microsoftLink = searchParams.get('microsoft_link');
    const status = searchParams.get('status');
    
    if (microsoftLink === 'true') {
      if (status === 'success') {
        toast.success('Microsoft 365 account linked successfully!');
        // Refresh auth status and profile data
        refetchMicrosoftAuth();
        // Invalidar todas las queries relacionadas con Microsoft auth
        queryClient.invalidateQueries({ queryKey: ['microsoftAuthStatus'] });
        queryClient.invalidateQueries({ queryKey: ['microsoftProfile'] });
        if (agentId) {
          queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
        }
      } else if (status === 'error') {
        const message = searchParams.get('message');
        toast.error(`Failed to link Microsoft 365: ${message || 'Unknown error'}`);
      }
      
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [agentId, refetchMicrosoftAuth, queryClient]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: AgentUpdate) => {
      if (!agentId) throw new Error('User ID is missing');
      return updateAgentProfile(agentId, payload);
    },
    onSuccess: updatedAgentData => {
      toast.success('Profile updated successfully!');
      setIsEditing(false);

      if (agentId) {
        queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      }
      queryClient.invalidateQueries({ queryKey: ['agents'] });

      if (updatedAgentData) {
        updateUserSessionData(updatedAgentData);
      } else {
        reloadAuth();
      }
    },
    onError: error => {
      console.error('Failed to save profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  // Microsoft 365 Link Mutation
  const linkMicrosoftMutation = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error('User ID is missing');
      
      // Use the specific linking method for authenticated users
      await microsoftAuthService.initiateLinking();
    },
    onError: error => {
      console.error('Failed to initiate Microsoft link:', error);
      toast.error(`Failed to link Microsoft 365: ${error.message}`);
    },
  });

  // Microsoft 365 Unlink Mutation
  const unlinkMicrosoftMutation = useMutation({
    mutationFn: async () => {
      if (!agentId) throw new Error('User ID is missing');
      const token = getAuthToken();
      if (!token) throw new Error('No auth token');

      const response = await microsoftAuthService.unlinkAgent(token, agentId);
      if (!response.success) throw new Error(response.message);
      return response.data!;
    },
    onSuccess: () => {
      toast.success('Microsoft 365 account unlinked successfully!');
      refetchMicrosoftAuth();
      queryClient.invalidateQueries({ queryKey: ['microsoftProfile', agentId] });
    },
    onError: error => {
      console.error('Failed to unlink Microsoft account:', error);
      toast.error(`Failed to unlink Microsoft 365: ${error.message}`);
    },
  });

  const displayData = {
    name: agentProfileData?.name || '...',
    email: agentProfileData?.email || '...',
    jobTitle: agentProfileData?.job_title || '-',
    phoneNumber: agentProfileData?.phone_number || '-',
    role: agentProfileData?.role || 'agent',
    email_signature: agentProfileData?.email_signature || '',
    isAdministrator: agentProfileData?.role === 'admin',
    updatedAt: agentProfileData?.updated_at
      ? new Date(agentProfileData.updated_at).toLocaleString()
      : '...',
    createdAt: agentProfileData?.created_at
      ? new Date(agentProfileData.created_at).toLocaleString()
      : '...',
  };

  const handleEditToggle = () => {
    if (isEditing) {
      if (agentProfileData) {
        setEditedName(agentProfileData.name || '');
        setEditedEmail(agentProfileData.email || '');
        setEditedJobTitle(agentProfileData.job_title || '');
        setEditedPhoneNumber(agentProfileData.phone_number || '');
        setEditedRole(agentProfileData.role || 'agent');
        setEditedSignature(agentProfileData.email_signature || '');
        setAvatarUrl(agentProfileData.avatar_url);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleAvatarChange = (newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
    // Immediately update the avatar
    const payload: AgentUpdate = { avatar_url: newAvatarUrl };
    updateProfileMutation.mutate(payload);
  };

  const handleSave = () => {
    if (!agentProfileData) {
      toast.error('Profile data not available.');
      return;
    }

    const payload: AgentUpdate = {};
    if (editedName !== agentProfileData.name) payload.name = editedName;
    if (editedEmail !== (agentProfileData.email || '')) payload.email = editedEmail;
    if (editedJobTitle !== (agentProfileData.job_title || ''))
      payload.job_title = editedJobTitle || null;
    if (editedPhoneNumber !== (agentProfileData.phone_number || ''))
      payload.phone_number = editedPhoneNumber || null;
    if (editedRole !== (agentProfileData.role || 'agent'))
      payload.role = editedRole as 'admin' | 'agent' | 'manager';
    if (editedSignature !== (agentProfileData.email_signature || ''))
      payload.email_signature = editedSignature || null;

    if (Object.keys(payload).length > 0) {
      console.log('Attempting to save profile changes:', payload);
      updateProfileMutation.mutate(payload);
    } else {
      toast.info('No changes detected.');
      setIsEditing(false);
    }
  };

  const hasPersonalSignature =
    agentProfileData?.email_signature && agentProfileData.email_signature.trim() !== '';
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl">
      <Card>
        <CardContent className="pt-4">
          <section className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Details</h2>
              {(currentUserRole === 'admin' || agentProfileData?.id === user?.id) &&
                (!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditToggle}
                    disabled={isLoadingProfile || isLoadingAuthUser}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditToggle}
                      disabled={updateProfileMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ))}
            </div>
            {isLoadingProfile || isLoadingAuthUser ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-4/5" />
              </div>
            ) : isProfileError ? (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error Loading Profile</AlertTitle>
                <AlertDescription>
                  {profileError instanceof Error
                    ? profileError.message
                    : 'An unknown error occurred.'}
                </AlertDescription>
              </Alert>
            ) : !agentProfileData ? (
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>Profile data could not be loaded.</AlertDescription>
              </Alert>
            ) : !isEditing ? (
              <dl>
                <DetailRow label="Name" value={displayData.name} />
                <Separator className="my-1" />
                <DetailRow label="Email" value={displayData.email} />
                <Separator className="my-1" />
                <DetailRow label="Job Title" value={displayData.jobTitle} />
                <Separator className="my-1" />
                <DetailRow label="Phone Number" value={displayData.phoneNumber} />
              </dl>
            ) : (
              <div className="space-y-2">
                <EditRow
                  label="Name"
                  id="name"
                  value={editedName}
                  onChange={e => setEditedName(e.target.value)}
                  disabled={updateProfileMutation.isPending || currentUserRole !== 'admin'}
                />
                <EditRow
                  label="Email"
                  id="email"
                  value={editedEmail}
                  onChange={e => setEditedEmail(e.target.value)}
                  disabled={updateProfileMutation.isPending || currentUserRole !== 'admin'}
                />
                <EditRow
                  label="Job Title"
                  id="jobTitle"
                  value={editedJobTitle}
                  onChange={e => setEditedJobTitle(e.target.value)}
                  disabled={updateProfileMutation.isPending || currentUserRole !== 'admin'}
                />
                <EditRow
                  label="Phone Number"
                  id="phoneNumber"
                  value={editedPhoneNumber}
                  onChange={e => setEditedPhoneNumber(e.target.value)}
                  disabled={updateProfileMutation.isPending || currentUserRole !== 'admin'}
                />
              </div>
            )}
          </section>

          <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Avatar</h2>
            <div className="flex items-center gap-4">
              <AgentAvatar
                avatarUrl={avatarUrl}
                agentName={agentProfileData?.name || 'User'}
                agentEmail={agentProfileData?.email}
                onAvatarChange={handleAvatarChange}
                isUpdating={updateProfileMutation.isPending}
                size={64}
                showEditButton={currentUserRole === 'admin' || agentProfileData?.id === user?.id}
              />
            </div>
          </section>

          <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Permissions</h2>
            {!isEditing ? (
              <DetailRow label="Role" value={displayData.role} />
            ) : (
              <div className="grid grid-cols-3 items-center gap-4 py-1">
                <Label htmlFor="role" className="text-sm font-medium text-muted-foreground">
                  Role
                </Label>
                {currentUserRole === 'admin' ? (
                  <Select
                    value={editedRole}
                    onValueChange={setEditedRole}
                    disabled={updateProfileMutation.isPending}
                  >
                    <SelectTrigger id="role" className="col-span-2 h-8 text-sm">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm col-span-2 capitalize">{displayData.role}</p>
                )}
              </div>
            )}
          </section>

          <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

          <section className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Email Signature</h2>
              {(isAdmin || agentProfileData?.id === user?.id) &&
                (!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditToggle}
                    disabled={isLoadingProfile || isLoadingAuthUser}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditToggle}
                      disabled={updateProfileMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                ))}
            </div>

            {!hasPersonalSignature && globalSignatureData && !isEditing && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Using Global Signature</AlertTitle>
                <AlertDescription>
                  You are currently using the workspace&apos;s global signature template, which will
                  be personalized with your information when sending emails.
                  {isAdmin && (
                    <>
                      {' '}
                      You can{' '}
                      <Link href="/configuration/signatures" className="underline">
                        edit the global signature here
                      </Link>
                      .
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isLoadingProfile || isLoadingAuthUser || isLoadingGlobalSignature ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : isProfileError ? (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error Loading Profile</AlertTitle>
                <AlertDescription>
                  {profileError instanceof Error
                    ? profileError.message
                    : 'An unknown error occurred.'}
                </AlertDescription>
              </Alert>
            ) : !agentProfileData ? (
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Not Found</AlertTitle>
                <AlertDescription>Profile data could not be loaded.</AlertDescription>
              </Alert>
            ) : !isEditing ? (
              <div
                className="border rounded-md p-4 bg-muted/20 min-h-[100px] text-sm prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    displayData.email_signature ||
                    (globalSignatureData?.content
                      ? globalSignatureData.content
                          .replace(/\[Agent Name\]/g, displayData.name)
                          .replace(/\[Agent Role\]/g, displayData.jobTitle || '-')
                      : '<p class="text-muted-foreground">No signature set.</p>'),
                }}
              />
            ) : currentUserRole === 'admin' ? (
              <RichTextEditor
                content={editedSignature}
                onChange={setEditedSignature}
                placeholder="Enter email signature here..."
                disabled={updateProfileMutation.isPending}
              />
            ) : (
              <div
                className="border rounded-md p-4 bg-muted/40 min-h-[100px] text-sm prose dark:prose-invert max-w-none opacity-70"
                dangerouslySetInnerHTML={{
                  __html:
                    displayData.email_signature ||
                    (globalSignatureData?.content
                      ? globalSignatureData.content
                          .replace(/\[Agent Name\]/g, displayData.name)
                          .replace(/\[Agent Role\]/g, displayData.jobTitle || '-')
                      : '<p class="text-muted-foreground">No signature set.</p>'),
                }}
              />
            )}
          </section>

          <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

          {/* Microsoft 365 Integration Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Microsoft 365 Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Link your account to sign in with Microsoft 365
                </p>
              </div>
            </div>

            {isLoadingMicrosoftAuth ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : microsoftAuthStatus?.is_linked ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                      <LinkIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        Microsoft 365 Connected
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {microsoftAuthStatus.microsoft_email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unlinkMicrosoftMutation.mutate()}
                    disabled={
                      unlinkMicrosoftMutation.isPending || !microsoftAuthStatus.has_password
                    }
                    className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    {unlinkMicrosoftMutation.isPending ? 'Unlinking...' : 'Unlink'}
                  </Button>
                </div>

                {!microsoftAuthStatus.has_password && (
                  <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Cannot Unlink</AlertTitle>
                    <AlertDescription>
                      You cannot unlink Microsoft 365 because you don&apos;t have a password set.
                      Please set a password first before unlinking.
                    </AlertDescription>
                  </Alert>
                )}

                {isLoadingMicrosoftProfile ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : (
                  microsoftProfile && (
                    <div className="p-4 border rounded-lg bg-muted/20">
                      <h4 className="text-sm font-medium mb-2">Microsoft Profile</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <DetailRow label="Display Name" value={microsoftProfile.displayName} />
                        <DetailRow
                          label="Email"
                          value={microsoftProfile.mail || microsoftProfile.userPrincipalName}
                        />
                        <DetailRow label="Job Title" value={microsoftProfile.jobTitle} />
                        <DetailRow label="Tenant ID" value={microsoftProfile.tenantId} />
                      </div>
                    </div>
                  )
                )}

                <div className="text-xs text-muted-foreground">
                  <p>
                    Authentication Method:{' '}
                    <span className="font-medium">{microsoftAuthStatus.auth_method}</span>
                  </p>
                  <p>
                    You can sign in using{' '}
                    {microsoftAuthStatus.can_use_password && microsoftAuthStatus.can_use_microsoft
                      ? 'either password or Microsoft 365'
                      : microsoftAuthStatus.can_use_microsoft
                        ? 'Microsoft 365 only'
                        : 'password only'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-muted rounded-full">
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Microsoft 365 Not Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Link your Microsoft 365 account to sign in seamlessly
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => linkMicrosoftMutation.mutate()}
                    disabled={linkMicrosoftMutation.isPending}
                    size="sm"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    {linkMicrosoftMutation.isPending ? 'Connecting...' : 'Connect Microsoft 365'}
                  </Button>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Benefits of linking Microsoft 365</AlertTitle>
                  <AlertDescription>
                    • Sign in with your Microsoft 365 account
                    <br />
                    • Access your work profile information
                    <br />• Seamless integration with Microsoft services
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </section>

          <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

          <footer className="text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Updated</span>
              <span>{displayData.updatedAt}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Created</span>
              <span>{displayData.createdAt}</span>
            </div>
          </footer>
        </CardContent>
      </Card>
    </div>
  );
}
