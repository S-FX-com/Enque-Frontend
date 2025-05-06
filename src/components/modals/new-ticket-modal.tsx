'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form'; // Import SubmitHandler
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from '@/components/tiptap/RichTextEditor'; // Assuming Tiptap editor path
import { createTicket } from '@/services/ticket'; // Assuming createTicket service function exists
import { getUsers } from '@/services/user';
import { getTeams } from '@/services/team';
import { getCategories } from '@/services/category';
import { IUser } from '@/typescript/user';
import { Team } from '@/typescript/team';
import { ICategory } from '@/typescript/category';
// Use type-only imports for the types to avoid naming conflicts
import type { TicketStatus, TicketPriority } from '@/typescript/ticket';
import { useAuth } from '@/hooks/use-auth'; // Import useAuth hook
import { toast } from 'sonner'; // Using sonner for notifications

// Define local enums with different names
const TicketStatusEnum = {
  Unread: 'Unread',
  Open: 'Open',
  Closed: 'Closed',
} as const;

const TicketPriorityEnum = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
} as const;

// Define Zod schema for validation using local enums
const ticketSchema = z.object({
  title: z.string().min(1, "Subject is required"),
  user_id: z.string().min(1, "User is required"), // Keep as string for form select
  description: z.string().min(1, "Body is required"),
  team_id: z.string().optional(), // Keep as string for form select
  // Use the local enums for validation, remove .default() here
  status: z.nativeEnum(TicketStatusEnum),
  priority: z.nativeEnum(TicketPriorityEnum),
  category_id: z.string().optional(), // Keep as string for form select
});


type TicketFormData = z.infer<typeof ticketSchema>; // Type derived from schema

interface NewTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define status options using the renamed local enum
const statusOptions = Object.entries(TicketStatusEnum).map(([key, value]) => ({
  value: value,
  label: key,
}));

// Define priority options using the renamed local enum
const priorityOptions = Object.entries(TicketPriorityEnum).map(([key, value]) => ({
  value: value,
  label: key,
}));


export function NewTicketModal({ open, onOpenChange }: NewTicketModalProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth(); // Get current user from useAuth
  const [editorContent, setEditorContent] = useState('');

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      user_id: '',
      description: '',
      team_id: '',
      status: TicketStatusEnum.Open, // Use renamed enum default
      priority: TicketPriorityEnum.Medium, // Use renamed enum default
      category_id: '',
    }
  });

  // Fetch data for dropdowns
  const { data: usersData = [], isLoading: isLoadingUsers } = useQuery<IUser[]>({
    queryKey: ['users'],
    queryFn: getUsers,
    staleTime: 1000 * 60 * 5,
  });

  const { data: teamsData = [], isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });

  // Fix useQuery call for categories
  const { data: categoriesData = [], isLoading: isLoadingCategories } = useQuery<ICategory[]>({
    queryKey: ['categories'],
    queryFn: () => getCategories(), // Wrap in arrow function
    staleTime: 1000 * 60 * 5,
  });

  // Prepare options for selects
  const userOptions = useMemo(() => usersData.map((user: IUser) => ({ value: user.id.toString(), label: user.name || `User ${user.id}` })), [usersData]);
  const teamOptions = useMemo(() => teamsData.map((team: Team) => ({ value: team.id.toString(), label: team.name })), [teamsData]);
  // Add explicit type for cat parameter
  const categoryOptions = useMemo(() => categoriesData.map((cat: ICategory) => ({ value: cat.id.toString(), label: cat.name })), [categoriesData]);

  // Define the mutation with correct payload type
  const createTicketMutation = useMutation({
    // Ensure the payload type matches the one expected by createTicket service function
    mutationFn: (payload: Parameters<typeof createTicket>[0]) => createTicket(payload),
    onSuccess: () => {
      toast.success("Ticket created successfully!");
      queryClient.invalidateQueries({ queryKey: ['tickets'] }); // Invalidate tickets query
      reset(); // Reset form
      setEditorContent(''); // Clear editor
      onOpenChange(false); // Close modal
    },
    onError: (error) => {
      // Display a more specific error if available, otherwise generic message
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Failed to create ticket: ${message}`);
      console.error("Ticket creation error:", error);
    },
  });

  // Add SubmitHandler type to onSubmit
  const onSubmit: SubmitHandler<TicketFormData> = (data) => {
    // Ensure currentUser and workspace_id exist before proceeding
    if (!currentUser || typeof currentUser.workspace_id !== 'number') { // Check type too
      toast.error("Could not identify user workspace. Please try logging in again.");
      console.error("Missing currentUser or valid workspace_id in NewTicketModal onSubmit", currentUser);
      return;
    }

    // Convert IDs from string to number and ensure correct types before sending
    // Use the imported types (TicketStatus, TicketPriority) for the payload
    // Explicitly define the payload type to match TicketCreatePayload from service
    const payload: Parameters<typeof createTicket>[0] = {
      title: data.title,
      description: editorContent, // Use content from Tiptap state
      user_id: parseInt(data.user_id, 10),
      status: data.status as TicketStatus, // Assert type from enum value to imported type
      priority: data.priority as TicketPriority, // Assert type from enum value to imported type
      team_id: data.team_id ? parseInt(data.team_id, 10) : undefined,
      category_id: data.category_id ? parseInt(data.category_id, 10) : undefined,
      workspace_id: currentUser.workspace_id, // Add workspace_id from the authenticated user
      due_date: new Date().toISOString(), // Add current date as default due_date
      sent_from_id: currentUser.id, // Add the current user's ID as sent_from_id
    };
    console.log("Submitting payload:", payload);
    createTicketMutation.mutate(payload);
  };

  // Update description field in react-hook-form when editor content changes
  useEffect(() => {
    setValue('description', editorContent, { shouldValidate: true, shouldDirty: true });
  }, [editorContent, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset();
      setEditorContent('');
    }
  }, [open, reset]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new support ticket.
          </DialogDescription>
        </DialogHeader>
        {/* Pass the correctly typed onSubmit to handleSubmit */}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4"> {/* Removed unnecessary type assertion */}
          {/* Subject */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Subject
            </Label>
            <div className="col-span-3">
              <Input
                id="title"
                {...register("title")}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>
          </div>

          {/* User */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user_id" className="text-right">
              User
            </Label>
            <div className="col-span-3">
              <Controller
                name="user_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUsers}>
                    <SelectTrigger className={errors.user_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Add explicit type for option */}
                      {userOptions.map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.user_id && <p className="text-xs text-red-500 mt-1">{errors.user_id.message}</p>}
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">
              Body
            </Label>
            <div className="col-span-3">
              {/* Pass setEditorContent to update state */}
              <RichTextEditor content={editorContent} onChange={setEditorContent} />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
            </div>
          </div>

          {/* Team */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="team_id" className="text-right">
              Team
            </Label>
            <div className="col-span-3">
              <Controller
                name="team_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingTeams}> {/* Handle undefined value */}
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team (optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                       {/* Add explicit type for option */}
                      {teamOptions.map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {/* No error message needed as it's optional */}
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <div className="col-span-3">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                       {/* Add explicit type for option */}
                      {statusOptions.map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status.message}</p>}
            </div>
          </div>

          {/* Priority */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">
              Priority
            </Label>
            <div className="col-span-3">
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className={errors.priority ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                       {/* Add explicit type for option */}
                      {priorityOptions.map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority.message}</p>}
            </div>
          </div>

          {/* Category */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category_id" className="text-right">
              Category
            </Label>
            <div className="col-span-3">
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingCategories}> {/* Handle undefined value */}
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category (optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                       {/* Add explicit type for option */}
                      {categoryOptions.map((option: { value: string; label: string }) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
               {/* No error message needed as it's optional */}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createTicketMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicketMutation.isPending}>
              {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
