'use client';

import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import {
  Terminal,
  Info,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  Tag,
  BarChart3,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getCannedReplies,
  createCannedReply,
  updateCannedReply,
  deleteCannedReply,
  getCannedReplyStats,
  type CannedReply,
  type CannedReplyCreate,
  type CannedReplyUpdate,
} from '@/services/canned-replies';

export default function CannedRepliesConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReply, setSelectedReply] = useState<CannedReply | null>(null);

  // Form state
  const [replyTitle, setReplyTitle] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyCategory, setReplyCategory] = useState('');
  const [replyTags, setReplyTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  // Queries
  const {
    data: cannedReplies,
    isLoading: isLoadingReplies,
    isError: isRepliesError,
    error: repliesError,
  } = useQuery({
    queryKey: ['cannedReplies', workspaceId, showEnabledOnly],
    queryFn: () => getCannedReplies(workspaceId!, { enabledOnly: showEnabledOnly }),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['cannedReplyStats', workspaceId],
    queryFn: () => getCannedReplyStats(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const createReplyMutation = useMutation({
    mutationFn: async (data: CannedReplyCreate) => createCannedReply(data),
    onSuccess: () => {
      toast.success('Canned reply created successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['cannedReplyStats', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Failed to create canned reply:', error);
      toast.error(`Failed to create canned reply: ${error.message}`);
    },
  });

  const updateReplyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CannedReplyUpdate }) =>
      updateCannedReply(id, data),
    onSuccess: () => {
      toast.success('Canned reply updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['cannedReplies', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['cannedReplyStats', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
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
      queryClient.invalidateQueries({ queryKey: ['cannedReplyStats', workspaceId] });
    },
    onError: error => {
      console.error('Failed to delete canned reply:', error);
      toast.error(`Failed to delete canned reply: ${error.message}`);
    },
  });

  // Filtered replies
  const filteredReplies = useMemo(() => {
    if (!cannedReplies) return [];

    return cannedReplies.filter(reply => {
      // Search term filter
      if (
        searchTerm &&
        !reply.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !reply.content.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && reply.category !== selectedCategory) {
        return false;
      }

      // Tags filter
      if (selectedTags.length > 0) {
        const replyTags = reply.tags || [];
        if (!selectedTags.some(tag => replyTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }, [cannedReplies, searchTerm, selectedCategory, selectedTags]);

  // Event handlers
  const handleCreateOrUpdate = () => {
    if (replyTitle.trim() === '') {
      toast.error('Reply title cannot be empty');
      return;
    }

    if (replyContent.trim() === '') {
      toast.error('Reply content cannot be empty');
      return;
    }

    if (!workspaceId) {
      toast.error('Workspace ID is missing');
      return;
    }

    const data = {
      title: replyTitle,
      content: replyContent,
      workspace_id: workspaceId,
      category: replyCategory || undefined,
      tags: replyTags.length > 0 ? replyTags : undefined,
      is_enabled: true,
    };

    if (selectedReply) {
      updateReplyMutation.mutate({
        id: selectedReply.id,
        data: {
          title: replyTitle,
          content: replyContent,
          category: replyCategory || undefined,
          tags: replyTags.length > 0 ? replyTags : undefined,
        },
      });
    } else {
      createReplyMutation.mutate(data);
    }
  };

  const handleEdit = (reply: CannedReply) => {
    setSelectedReply(reply);
    setReplyTitle(reply.title);
    setReplyContent(reply.content);
    setReplyCategory(reply.category || '');
    setReplyTags(reply.tags || []);
    setIsDialogOpen(true);
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

  const handleAddTag = () => {
    if (newTag.trim() && !replyTags.includes(newTag.trim())) {
      setReplyTags([...replyTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setReplyTags(replyTags.filter(tag => tag !== tagToRemove));
  };

  const resetForm = () => {
    setSelectedReply(null);
    setReplyTitle('');
    setReplyContent('');
    setReplyCategory('');
    setReplyTags([]);
    setNewTag('');
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
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Reply
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedReply ? 'Edit Canned Reply' : 'Create New Canned Reply'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedReply
                      ? 'Update this canned reply for your team to use.'
                      : 'Create a new canned reply for your team to use when responding to tickets.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        placeholder="Enter a descriptive title"
                        value={replyTitle}
                        onChange={e => setReplyTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        placeholder="e.g., Support, Sales, Technical"
                        value={replyCategory}
                        onChange={e => setReplyCategory(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {replyTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer">
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-xs hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button type="button" variant="outline" onClick={handleAddTag}>
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
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
                  <Button
                    onClick={handleCreateOrUpdate}
                    disabled={createReplyMutation.isPending || updateReplyMutation.isPending}
                  >
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
      </Card>

      {/* Stats Cards */}
      {stats && !isLoadingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Replies</p>
                  <p className="text-2xl font-bold">{stats.total_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-green-500 rounded-full" />
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-2xl font-bold">{stats.enabled_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Categories</p>
                  <p className="text-2xl font-bold">{stats.categories.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tags</p>
                  <p className="text-2xl font-bold">{stats.tags.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search replies..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {stats?.categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled-only"
                checked={showEnabledOnly}
                onCheckedChange={setShowEnabledOnly}
              />
              <Label htmlFor="enabled-only">Active only</Label>
            </div>
          </div>
        </CardContent>
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
                inquiries. Use categories and tags to organize them effectively.
              </p>
              <p>
                You can use placeholders like <strong>[Customer Name]</strong> that will be
                automatically replaced when sending replies.
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
          ) : filteredReplies && filteredReplies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReplies.map(reply => (
                  <TableRow key={reply.id}>
                    <TableCell className="font-medium">{reply.title}</TableCell>
                    <TableCell>
                      {reply.category && <Badge variant="outline">{reply.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {reply.tags?.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {reply.tags && reply.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{reply.tags.length - 3}
                          </Badge>
                        )}
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
                {searchTerm || selectedCategory !== 'all' || selectedTags.length > 0
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by creating your first canned reply.'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create your first canned reply
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
