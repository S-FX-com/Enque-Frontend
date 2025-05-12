'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { inviteAgent } from '@/services/agent'; // We'll create this service function
import { Agent } from '@/typescript/agent'; // Assuming Agent schema for response
import { useAuth } from '@/hooks/use-auth'; // To get workspace_id

const agentInviteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['agent', 'admin', 'manager'], {
    required_error: 'Role is required',
  }),
});

type AgentInviteFormData = z.infer<typeof agentInviteSchema>;

interface NewAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess?: (agent: Agent) => void;
}

export function NewAgentModal({ isOpen, onClose, onInviteSuccess }: NewAgentModalProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth(); // Get current user to extract workspace_id

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AgentInviteFormData>({
    resolver: zodResolver(agentInviteSchema),
    defaultValues: {
      role: 'agent', // Default role
    },
  });

  const mutation = useMutation({
    mutationFn: (data: AgentInviteFormData) => {
      if (!currentUser?.workspace_id) {
        throw new Error('Workspace ID is missing. Cannot invite agent.');
      }
      const payload = {
        // This matches AgentInviteCreatePayload in services/agent.ts
        ...data,
        workspace_id: currentUser.workspace_id,
      };
      return inviteAgent(payload);
    },
    onSuccess: (invitedAgent: Agent) => {
      // data is now explicitly Agent
      toast.success(`Invitation sent to ${invitedAgent.email}`);
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      if (onInviteSuccess) {
        onInviteSuccess(invitedAgent);
      }
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });

  const onSubmit = (data: AgentInviteFormData) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        {' '}
        {/* Added bg-white here */}
        <DialogHeader>
          <DialogTitle>Invite New Agent</DialogTitle>
          <DialogDescription>
            Enter the details of the agent you want to invite. They will receive an email to set up
            their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="name" className="mb-1 block">
              Full Name
            </Label>{' '}
            {/* Added mb-1 and block */}
            <Input id="name" {...register('name')} /> {/* Removed placeholder */}
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="email" className="mb-1 block">
              Email Address
            </Label>{' '}
            {/* Added mb-1 and block */}
            <Input id="email" type="email" {...register('email')} /> {/* Removed placeholder */}
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="role" className="mb-1 block">
              Role
            </Label>{' '}
            {/* Added mb-1 and block */}
            <Controller
              name="role"
              control={control}
              render={(
                { field }: { field: { onChange: (value: string) => void; value: string } } // Adjusted type for field.onChange
              ) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting || mutation.isPending ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
