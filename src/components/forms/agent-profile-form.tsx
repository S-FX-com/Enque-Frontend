// frontend/src/components/forms/agent-profile-form.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/hooks/use-auth'; // To check current user's role
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added useQueryClient
import { updateAgentProfile } from '@/services/agent'; // Use the correct service
import { AgentUpdate, Agent } from '@/typescript/agent';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';

// Helper component for Detail rows (copied from profile page)
const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-4 py-1">
    <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
    <dd className="text-sm col-span-2 capitalize">{value || '-'}</dd>
  </div>
);

// Helper component for Edit rows (copied from profile page)
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
  agent: Agent; // Receive the agent data as a prop
}

export function AgentProfileForm({ agent }: AgentProfileFormProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth(); // Get the currently logged-in user
  const [isEditing, setIsEditing] = useState(false);

  // State for editable fields, initialized with the passed agent data
  const [editedName, setEditedName] = useState(agent.name || '');
  const [editedEmail, setEditedEmail] = useState(agent.email || '');
  const [editedJobTitle, setEditedJobTitle] = useState(agent.job_title || '');
  const [editedPhoneNumber, setEditedPhoneNumber] = useState(agent.phone_number || '');
  const [editedRole, setEditedRole] = useState(agent.role || 'agent');
  const [editedSignature, setEditedSignature] = useState(agent.email_signature || '');

  // Update local state if the agent prop changes (e.g., after successful fetch)
  useEffect(() => {
    setEditedName(agent.name || '');
    setEditedEmail(agent.email || '');
    setEditedJobTitle(agent.job_title || '');
    setEditedPhoneNumber(agent.phone_number || '');
    setEditedRole(agent.role || 'agent');
    setEditedSignature(agent.email_signature || '');
  }, [agent]);

  // Determine if the current user is an admin
  const isAdmin = currentUser?.role === 'admin';

  // --- Update Mutation ---
  const updateProfileMutation = useMutation({
    mutationFn: (payload: AgentUpdate) => {
      // Use the agent ID from the prop
      if (!agent?.id) throw new Error('Agent ID is missing');
      return updateAgentProfile(agent.id, payload);
    },
    onSuccess: updatedAgentData => {
      toast.success('Agent profile updated successfully!');
      setIsEditing(false);
      // Invalidate the specific agent query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['agent', agent.id] });
      // Also invalidate the list of agents query
      queryClient.invalidateQueries({ queryKey: ['agents'] });

      // Update the local state with the new data from the API response
      if (updatedAgentData) {
        setEditedName(updatedAgentData.name || '');
        setEditedEmail(updatedAgentData.email || '');
        setEditedJobTitle(updatedAgentData.job_title || '');
        setEditedPhoneNumber(updatedAgentData.phone_number || '');
        setEditedRole(updatedAgentData.role || 'agent');
        setEditedSignature(updatedAgentData.email_signature || '');
      }
    },
    onError: error => {
      console.error('Failed to save agent profile:', error);
      toast.error(`Failed to update agent profile: ${error.message}`);
    },
  });

  const avatarColors = ['#1D73F4', '#D4E4FA'];

  const handleEditToggle = () => {
    if (isEditing) {
      // Revert changes on cancel
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

  // Display data based on current state (edited or original)
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
      {' '}
      {/* Added background class */}
      <CardContent className="pt-4">
        {/* Details Section */}
        <section className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Details</h2>
            {/* Only Admins can edit agent profiles */}
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

        {/* Avatar Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Avatar</h2>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 overflow-hidden border">
              {' '}
              {/* Added border */}
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

        {/* Permissions Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Permissions</h2>
          {!isEditing ? (
            <DetailRow label="Role" value={displayData.role} />
          ) : (
            <div className="grid grid-cols-3 items-center gap-4 py-1">
              <Label htmlFor="role" className="text-sm font-medium text-muted-foreground">
                Role
              </Label>
              {/* Role editing is allowed only by admins */}
              <Select
                value={editedRole}
                // Ensure the value passed to setEditedRole is of the correct type
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

        {/* Email Signature Section */}
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
          ) : (
            // Signature editing allowed only by admins
            <RichTextEditor
              content={editedSignature}
              onChange={setEditedSignature}
              placeholder="Enter email signature here..."
              disabled={!isAdmin || updateProfileMutation.isPending}
            />
          )}
        </section>

        {/* Footer Info - Removed as it's less relevant for admin view */}
        {/* ... */}
      </CardContent>
    </Card>
  );
}
