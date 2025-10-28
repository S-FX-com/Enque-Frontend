'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Terminal, Info, AlertCircle, Plus, Trash2, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getCannedReplies,
  deleteCannedReply,
  updateCannedReply,
  type CannedReply,
} from '@/services/canned-replies';
import CannedReplyModalMui from '@/components/modals/CannedReplyModalMui';

export default function CannedRepliesConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReply, setSelectedReply] = useState<CannedReply | null>(null);

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  // Queries
  const {
    data: cannedReplies,
    isLoading: isLoadingReplies,
    isError: isRepliesError,
    error: repliesError,
  } = useQuery({
    queryKey: ['cannedReplies', workspaceId],
    queryFn: () => getCannedReplies(workspaceId!, { enabledOnly: false }),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const updateReplyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { is_enabled: boolean } }) =>
      updateCannedReply(id, data),
    onSuccess: () => {
      toast.success('Canned reply updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
    },
    onError: error => {
      console.error('Failed to update canned reply:', error);
      toast.error(`Failed to update canned reply: ${error.message}`);
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (id: number) => deleteCannedReply(id),
    onSuccess: () => {
      toast.success('Canned reply deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
    },
    onError: error => {
      console.error('Failed to delete canned reply:', error);
      toast.error(`Failed to delete canned reply: ${error.message}`);
    },
  });

  // Event handlers
  const handleEdit = (reply: CannedReply) => {
    setSelectedReply(reply);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this canned reply?')) {
      deleteReplyMutation.mutate(id);
    }
  };

  const handleToggle = (reply: CannedReply) => {
    updateReplyMutation.mutate({
      id: reply.id,
      data: { is_enabled: !reply.is_enabled },
    });
  };

  const handleCreateNew = () => {
    setSelectedReply(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedReply(null);
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Canned Replies</CardTitle>
              <CardDescription>
                Create and manage pre-written responses for common inquiries
              </CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Reply
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Canned Replies</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Canned replies help your team respond quickly and consistently to common customer
                inquiries.
              </p>
            </AlertDescription>
          </Alert>

          {isLoadingReplies || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
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
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cannedReplies.map(reply => (
                  <TableRow key={reply.id}>
                    <TableCell className="font-medium">{reply.name}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-xs truncate">
                        {reply.description || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {reply.usage_count} times
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={reply.is_enabled}
                          onCheckedChange={() => handleToggle(reply)}
                          disabled={updateReplyMutation.isPending}
                        />
                        <span className="text-sm">{reply.is_enabled ? 'Active' : 'Inactive'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(reply)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(reply.id)}
                          disabled={deleteReplyMutation.isPending}
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
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No canned replies found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first canned reply.
              </p>
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first canned reply
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MUI Modal */}
      <CannedReplyModalMui
        open={isModalOpen}
        onClose={handleModalClose}
        cannedReply={selectedReply}
        onCreateSuccess={() => {
          // Modal handles closing itself
        }}
        onUpdateSuccess={() => {
          // Modal handles closing itself
        }}
      />
    </div>
  );
}
