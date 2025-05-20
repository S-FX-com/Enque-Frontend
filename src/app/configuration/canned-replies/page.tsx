'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Terminal, Info, AlertCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock service functions - replace with actual implementations
const getCannedReplies = async (workspaceId: string) => {
  // Fetch canned replies from your API
  return [
    { id: '1', title: 'Welcome Message', content: '<p>Thank you for contacting us!</p>', is_enabled: true },
    { id: '2', title: 'Follow-up', content: '<p>Just checking in on your issue.</p>', is_enabled: true },
  ];
};

const createCannedReply = async (workspaceId: string, title: string, content: string) => {
  // Create a new canned reply via API
  return { id: Date.now().toString(), title, content, is_enabled: true };
};

const updateCannedReply = async (workspaceId: string, id: string, title: string, content: string, isEnabled: boolean) => {
  // Update a canned reply via API
  return { id, title, content, is_enabled: isEnabled };
};

const deleteCannedReply = async (workspaceId: string, id: string) => {
  // Delete a canned reply via API
  return { success: true };
};

const toggleCannedReply = async (workspaceId: string, id: string, enabled: boolean) => {
  // Toggle a canned reply via API
  return { id, is_enabled: enabled };
};

export default function CannedRepliesConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReply, setSelectedReply] = useState<any>(null);
  const [replyTitle, setReplyTitle] = useState('');
  const [replyContent, setReplyContent] = useState('');

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: cannedReplies,
    isLoading: isLoadingReplies,
    isError: isRepliesError,
    error: repliesError,
  } = useQuery({
    queryKey: ['cannedReplies', workspaceId],
    queryFn: () => getCannedReplies(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const createReplyMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return createCannedReply(workspaceId, title, content);
    },
    onSuccess: () => {
      toast.success('Canned reply created successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Failed to create canned reply:', error);
      toast.error(`Failed to create canned reply: ${error.message}`);
    },
  });

  const updateReplyMutation = useMutation({
    mutationFn: async ({ id, title, content, isEnabled }: { id: string; title: string; content: string; isEnabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return updateCannedReply(workspaceId, id, title, content, isEnabled);
    },
    onSuccess: () => {
      toast.success('Canned reply updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Failed to update canned reply:', error);
      toast.error(`Failed to update canned reply: ${error.message}`);
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return deleteCannedReply(workspaceId, id);
    },
    onSuccess: () => {
      toast.success('Canned reply deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
    },
    onError: error => {
      console.error('Failed to delete canned reply:', error);
      toast.error(`Failed to delete canned reply: ${error.message}`);
    },
  });

  const toggleReplyMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return toggleCannedReply(workspaceId, id, enabled);
    },
    onSuccess: () => {
      toast.success('Canned reply status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle canned reply:', error);
      toast.error(`Failed to toggle canned reply: ${error.message}`);
    },
  });

  const handleCreateOrUpdate = () => {
    if (replyTitle.trim() === '') {
      toast.error('Reply title cannot be empty');
      return;
    }

    if (replyContent.trim() === '') {
      toast.error('Reply content cannot be empty');
      return;
    }

    if (selectedReply) {
      updateReplyMutation.mutate({
        id: selectedReply.id,
        title: replyTitle,
        content: replyContent,
        isEnabled: selectedReply.is_enabled,
      });
    } else {
      createReplyMutation.mutate({
        title: replyTitle,
        content: replyContent,
      });
    }
  };

  const handleEdit = (reply: any) => {
    setSelectedReply(reply);
    setReplyTitle(reply.title);
    setReplyContent(reply.content);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this canned reply?')) {
      deleteReplyMutation.mutate(id);
    }
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleReplyMutation.mutate({
      id,
      enabled: !currentStatus,
    });
  };

  const resetForm = () => {
    setSelectedReply(null);
    setReplyTitle('');
    setReplyContent('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (currentUserRole !== 'admin') {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access the canned replies settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Canned Replies</CardTitle>
              <CardDescription>
                Create and manage pre-written responses for common inquiries
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Reply
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedReply ? 'Edit Canned Reply' : 'Create New Canned Reply'}</DialogTitle>
                  <DialogDescription>
                    {selectedReply
                      ? 'Update this canned reply for your team to use.'
                      : 'Create a new canned reply for your team to use when responding to tickets.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter a descriptive title"
                      value={replyTitle}
                      onChange={(e) => setReplyTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content</Label>
                    <RichTextEditor
                      content={replyContent}
                      onChange={setReplyContent}
                      placeholder="Enter the reply content..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrUpdate}>
                    {createReplyMutation.isPending || updateReplyMutation.isPending
                      ? 'Saving...'
                      : selectedReply
                      ? 'Update Reply'
                      : 'Create Reply'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Canned Replies</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Canned replies help your team respond quickly and consistently to common customer inquiries.
              </p>
              <p>
                You can use placeholders like <strong>[Customer Name]</strong> that will be automatically replaced
                when sending replies.
              </p>
            </AlertDescription>
          </Alert>

          {isLoadingReplies || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isRepliesError ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading Canned Replies</AlertTitle>
              <AlertDescription>
                {repliesError instanceof Error
                  ? repliesError.message
                  : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : cannedReplies && cannedReplies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cannedReplies.map((reply) => (
                  <TableRow key={reply.id}>
                    <TableCell className="font-medium">{reply.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`reply-active-${reply.id}`}
                          checked={reply.is_enabled}
                          onCheckedChange={() => handleToggle(reply.id, reply.is_enabled)}
                          disabled={toggleReplyMutation.isPending}
                        />
                        <Label htmlFor={`reply-active-${reply.id}`} className="text-sm">
                          {reply.is_enabled ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(reply)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(reply.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No canned replies found</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                variant="outline"
              >
                Create your first canned reply
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
