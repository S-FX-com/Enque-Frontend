'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
import { getAgentById, updateAgentProfile, updateAgentTeamsNotifications } from '@/services/agent';
import { AgentUpdate, Agent } from '@/typescript/agent';
import { Skeleton } from '@/components/ui/skeleton';

// ⚡ LAZY LOAD: RichTextEditor - Solo carga en pestaña de firma
const RichTextEditor = dynamic(
  () => import('@/components/tiptap/RichTextEditor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => <Skeleton className="h-32 w-full rounded-md" />,
    ssr: false,
  }
);
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Info } from 'lucide-react';
import { getGlobalSignature } from '@/services/global-signature';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';

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
  const [teamsNotificationsEnabled, setTeamsNotificationsEnabled] = useState(false);

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

  useEffect(() => {
    if (agentProfileData) {
      setEditedName(agentProfileData.name || '');
      setEditedEmail(agentProfileData.email || '');
      setEditedJobTitle(agentProfileData.job_title || '');
      setEditedPhoneNumber(agentProfileData.phone_number || '');
      setEditedRole(agentProfileData.role || 'agent');
      setEditedSignature(agentProfileData.email_signature || '');
      setAvatarUrl(agentProfileData.avatar_url);
      setTeamsNotificationsEnabled(agentProfileData.teams_notifications_enabled || false);
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

  // Teams notifications mutation
  const updateTeamsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!agentId) throw new Error('User ID is missing');
      
      return updateAgentTeamsNotifications(agentId, enabled);
    },
    onSuccess: () => {
      toast.success('Teams notifications updated successfully!');
      if (agentId) {
        queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      }
    },
    onError: (error) => {
      console.error('Failed to update Teams notifications:', error);
      toast.error(`Failed to update Teams notifications: ${error.message}`);
      // Revert the switch state on error
      if (agentProfileData) {
        setTeamsNotificationsEnabled(agentProfileData.teams_notifications_enabled || false);
      }
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
        setTeamsNotificationsEnabled(agentProfileData.teams_notifications_enabled || false);
      }
    }
    setIsEditing(!isEditing);
  };

  const handleTeamsNotificationToggle = (enabled: boolean) => {
    setTeamsNotificationsEnabled(enabled);
    updateTeamsMutation.mutate(enabled);
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
            <h2 className="text-lg font-semibold mb-3">Teams Notifications</h2>
            <div className="grid grid-cols-3 items-center gap-4 py-1">
              <Label htmlFor="teams-notifications" className="text-sm font-medium text-muted-foreground">
                Enable Teams Notifications
              </Label>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  id="teams-notifications"
                  checked={teamsNotificationsEnabled}
                  onCheckedChange={handleTeamsNotificationToggle}
                  disabled={updateTeamsMutation.isPending}
                />
                <span className="text-sm text-muted-foreground">
                  {teamsNotificationsEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            {teamsNotificationsEnabled && (
              <Alert className="mt-3">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  You will receive ticket notifications in your Microsoft Teams activity feed.
                </AlertDescription>
              </Alert>
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
