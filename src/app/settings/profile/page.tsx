'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import BoringAvatar from 'boring-avatars';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { getAgentById, updateAgentProfile } from '@/services/agent';
import { AgentUpdate, Agent } from '@/typescript/agent';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-1">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="text-sm col-span-2 capitalize">{value || '-'}</dd>
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

  useEffect(() => {
    if (agentProfileData) {
      setEditedName(agentProfileData.name || '');
      setEditedEmail(agentProfileData.email || '');
      setEditedJobTitle(agentProfileData.job_title || '');
      setEditedPhoneNumber(agentProfileData.phone_number || '');
      setEditedRole(agentProfileData.role || 'agent');
      setEditedSignature(agentProfileData.email_signature || '');
    } else {
      setEditedName('');
      setEditedEmail('');
      setEditedJobTitle('');
      setEditedPhoneNumber('');
      setEditedRole('agent');
      setEditedSignature('');
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

  const avatarColors = ['#1D73F4', '#D4E4FA'];

  const handleEditToggle = () => {
    if (isEditing) {
      if (agentProfileData) {
        setEditedName(agentProfileData.name || '');
        setEditedEmail(agentProfileData.email || '');
        setEditedJobTitle(agentProfileData.job_title || '');
        setEditedPhoneNumber(agentProfileData.phone_number || '');
        setEditedRole(agentProfileData.role || 'agent');
        setEditedSignature(agentProfileData.email_signature || '');
      }
    }
    setIsEditing(!isEditing);
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
              <Avatar className="h-12 w-12 overflow-hidden border">
                <BoringAvatar
                  size={48}
                  name={agentProfileData?.email || agentProfileData?.name || 'default-avatar'}
                  variant="beam"
                  colors={avatarColors}
                />
              </Avatar>
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
            <h2 className="text-lg font-semibold mb-3">Email Signature</h2>
            {!isEditing ? (
              <div
                className="border rounded-md p-4 bg-muted/20 min-h-[100px] text-sm prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    displayData.email_signature ||
                    '<p class="text-muted-foreground">No signature set.</p>',
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
                    '<p class="text-muted-foreground">No signature set.</p>',
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
