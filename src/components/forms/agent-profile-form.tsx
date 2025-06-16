'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
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
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updateAgentProfile } from '@/services/agent';
import type { AgentUpdate, Agent } from '@/typescript/agent';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { getEnabledGlobalSignature } from '@/services/global-signature';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

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

interface AgentProfileFormProps {
  agent: Agent;
}

export function AgentProfileForm({ agent }: AgentProfileFormProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [editedName, setEditedName] = useState(agent.name || '');
  const [editedEmail, setEditedEmail] = useState(agent.email || '');
  const [editedJobTitle, setEditedJobTitle] = useState(agent.job_title || '');
  const [editedPhoneNumber, setEditedPhoneNumber] = useState(agent.phone_number || '');
  const [editedRole, setEditedRole] = useState(agent.role || 'agent');
  const [editedSignature, setEditedSignature] = useState(agent.email_signature || '');

  const workspaceId = agent.workspace_id;
  const { data: globalSignatureData } = useQuery({
    queryKey: ['globalSignature', workspaceId, 'enabled'],
    queryFn: () => getEnabledGlobalSignature(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setEditedName(agent.name || '');
    setEditedEmail(agent.email || '');
    setEditedJobTitle(agent.job_title || '');
    setEditedPhoneNumber(agent.phone_number || '');
    setEditedRole(agent.role || 'agent');
    setEditedSignature(agent.email_signature || '');
  }, [agent]);

  const isAdmin = currentUser?.role === 'admin';

  const updateProfileMutation = useMutation({
    mutationFn: (payload: AgentUpdate) => {
      if (!agent?.id) throw new Error('Agent ID is missing');
      return updateAgentProfile(agent.id, payload);
    },
    onMutate: async payload => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['agents'] });
      await queryClient.cancelQueries({ queryKey: ['agent', agent.id] });

      // Snapshot the previous values
      const previousAgents = queryClient.getQueryData<Agent[]>(['agents']);
      const previousAgent = queryClient.getQueryData<Agent>(['agent', agent.id]);

      // Optimistically update the agents list
      if (previousAgents) {
        const updatedAgents = previousAgents.map(a =>
          a.id === agent.id ? { ...a, ...payload } : a
        );
        queryClient.setQueryData(['agents'], updatedAgents);
      }

      // Optimistically update the individual agent
      if (previousAgent) {
        queryClient.setQueryData(['agent', agent.id], { ...previousAgent, ...payload });
      }

      return { previousAgents, previousAgent };
    },
    onSuccess: updatedAgentData => {
      toast.success('Agent profile updated successfully!');
      setIsEditing(false);

      // Update both caches with the actual server response
      if (updatedAgentData) {
        // Update the agents list cache
        queryClient.setQueryData<Agent[]>(['agents'], oldAgents => {
          if (!oldAgents) return oldAgents;
          return oldAgents.map(a => (a.id === updatedAgentData.id ? updatedAgentData : a));
        });

        // Update the individual agent cache
        queryClient.setQueryData(['agent', agent.id], updatedAgentData);

        // Update local state with the new data
        setEditedName(updatedAgentData.name || '');
        setEditedEmail(updatedAgentData.email || '');
        setEditedJobTitle(updatedAgentData.job_title || '');
        setEditedPhoneNumber(updatedAgentData.phone_number || '');
        setEditedRole(updatedAgentData.role || 'agent');
        setEditedSignature(updatedAgentData.email_signature || '');
      }
    },
    onError: (error, payload, context) => {
      console.error('Failed to save agent profile:', error);
      toast.error(`Failed to update agent profile: ${error.message}`);

      // Rollback optimistic updates
      if (context?.previousAgents) {
        queryClient.setQueryData(['agents'], context.previousAgents);
      }
      if (context?.previousAgent) {
        queryClient.setQueryData(['agent', agent.id], context.previousAgent);
      }
    },
    onSettled: () => {
      // Always refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agent.id] });
    },
  });

  const avatarColors = ['#1D73F4', '#D4E4FA'];

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedName(agent.name || '');
      setEditedEmail(agent.email || '');
      setEditedJobTitle(agent.job_title || '');
      setEditedPhoneNumber(agent.phone_number || '');
      setEditedRole(agent.role || 'agent');
      setEditedSignature(agent.email_signature || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    const payload: AgentUpdate = {};
    if (editedName !== agent.name) payload.name = editedName;
    if (editedEmail !== agent.email) payload.email = editedEmail;
    if (editedJobTitle !== (agent.job_title || '')) payload.job_title = editedJobTitle || null;
    if (editedPhoneNumber !== (agent.phone_number || ''))
      payload.phone_number = editedPhoneNumber || null;
    if (editedRole !== agent.role) payload.role = editedRole as 'admin' | 'agent' | 'manager';
    if (editedSignature !== (agent.email_signature || ''))
      payload.email_signature = editedSignature || null;

    if (Object.keys(payload).length > 0) {
      console.log('Attempting to save agent profile changes:', payload);
      updateProfileMutation.mutate(payload);
    } else {
      toast.info('No changes detected.');
      setIsEditing(false);
    }
  };

  const displayData = isEditing
    ? {
        name: editedName,
        email: editedEmail,
        jobTitle: editedJobTitle,
        phoneNumber: editedPhoneNumber,
        role: editedRole,
        email_signature: editedSignature,
      }
    : {
        name: agent.name || '-',
        email: agent.email || '-',
        jobTitle: agent.job_title || '-',
        phoneNumber: agent.phone_number || '-',
        role: agent.role || 'agent',
        email_signature: agent.email_signature || '',
      };

  return (
    <Card className="bg-white dark:bg-black">
      <CardContent className="pt-4">
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Details</h2>
            {isAdmin &&
              (!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditToggle}
                  disabled={updateProfileMutation.isPending}
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
                  <Button size="sm" onClick={handleSave} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              ))}
          </div>
          {!isEditing ? (
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
                disabled={updateProfileMutation.isPending}
              />
              <EditRow
                label="Email"
                id="email"
                value={editedEmail}
                onChange={e => setEditedEmail(e.target.value)}
                disabled={updateProfileMutation.isPending}
              />
              <EditRow
                label="Job Title"
                id="jobTitle"
                value={editedJobTitle}
                onChange={e => setEditedJobTitle(e.target.value)}
                disabled={updateProfileMutation.isPending}
              />
              <EditRow
                label="Phone Number"
                id="phoneNumber"
                value={editedPhoneNumber}
                onChange={e => setEditedPhoneNumber(e.target.value)}
                disabled={updateProfileMutation.isPending}
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
                name={agent.email || agent.name || 'default-avatar'}
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
              <Select
                value={editedRole}
                onValueChange={(value: string) =>
                  setEditedRole(value as 'admin' | 'agent' | 'manager')
                }
                disabled={!isAdmin || updateProfileMutation.isPending}
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
            </div>
          )}
        </section>

        <Separator className="my-4 bg-slate-200 dark:bg-slate-700" />

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Email Signature</h2>
          {!isEditing ? (
            <>
              {globalSignatureData?.content ? (
                <>
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Using Global Signature</AlertTitle>
                    <AlertDescription>
                      This agent is currently using the workspace&apos;s global signature template,
                      which will be personalized with their information when sending emails.
                      {agent.email_signature && (
                        <p className="mt-2 font-semibold">
                          Note: The global signature overrides any personal signature.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div
                    className="border rounded-md p-4 bg-muted/20 min-h-[100px] text-sm prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: globalSignatureData.content
                        .replace(/\[Agent Name\]/g, displayData.name)
                        .replace(/\[Agent Role\]/g, displayData.jobTitle || '-'),
                    }}
                  />
                </>
              ) : (
                <div
                  className="border rounded-md p-4 bg-muted/20 min-h-[100px] text-sm prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{
                    __html:
                      displayData.email_signature ||
                      '<p class="text-muted-foreground">No signature set.</p>',
                  }}
                />
              )}
            </>
          ) : (
            <RichTextEditor
              content={editedSignature}
              onChange={setEditedSignature}
              placeholder="Enter email signature here..."
              disabled={!isAdmin || updateProfileMutation.isPending}
            />
          )}
        </section>
      </CardContent>
    </Card>
  );
}
