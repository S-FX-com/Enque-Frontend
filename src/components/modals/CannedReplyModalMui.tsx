'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  DialogContentText,
  FormControlLabel,
  Switch,
  Skeleton as MuiSkeleton,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCannedReply,
  updateCannedReply,
  type CannedReply,
  type CannedReplyCreate,
  type CannedReplyUpdate,
} from '@/services/canned-replies';
import { useAuth } from '@/hooks/use-auth';

// ⚡ LAZY LOAD: RichTextEditor - Solo carga cuando se abre el modal
const RichTextEditor = dynamic(
  () => import('@/components/tiptap/RichTextEditor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => <MuiSkeleton variant="rectangular" height={192} sx={{ borderRadius: 1 }} />,
    ssr: false,
  }
);

interface CannedReplyModalMuiProps {
  open: boolean;
  onClose: () => void;
  cannedReply?: CannedReply | null;
  onCreateSuccess?: (cannedReply: CannedReply) => void;
  onUpdateSuccess?: (cannedReply: CannedReply) => void;
}

export default function CannedReplyModalMui({
  open,
  onClose,
  cannedReply = null,
  onCreateSuccess,
  onUpdateSuccess,
}: CannedReplyModalMuiProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = !!cannedReply;

  // Load canned reply data into form when editing
  useEffect(() => {
    if (cannedReply) {
      setName(cannedReply.name);
      setDescription(cannedReply.description || '');
      setContent(cannedReply.content);
      setIsEnabled(cannedReply.is_enabled);
    }
  }, [cannedReply]);

  const createMutation = useMutation({
    mutationFn: async (data: CannedReplyCreate) => {
      if (!user?.workspace_id) {
        throw new Error('Workspace ID is missing');
      }
      return createCannedReply({
        ...data,
        workspace_id: user.workspace_id,
      });
    },
    onSuccess: (newCannedReply: CannedReply) => {
      toast.success(`Canned reply "${newCannedReply.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['cannedReplies'] });
      queryClient.invalidateQueries({ queryKey: ['cannedReplyStats'] });
      if (onCreateSuccess) {
        onCreateSuccess(newCannedReply);
      }
      handleCloseAndReset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create canned reply: ${error.message}`);
      setFormError(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CannedReplyUpdate) => {
      if (!cannedReply) {
        throw new Error('Canned reply ID is missing. Cannot update.');
      }
      return updateCannedReply(cannedReply.id, data);
    },
    onSuccess: (updatedCannedReply: CannedReply) => {
      toast.success(`Canned reply "${updatedCannedReply.name}" updated successfully`);
      queryClient.invalidateQueries({ queryKey: ['cannedReplies'] });
      queryClient.invalidateQueries({ queryKey: ['cannedReplyStats'] });
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedCannedReply);
      }
      handleCloseAndReset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update canned reply: ${error.message}`);
      setFormError(error.message);
    },
  });

  const handleSubmit = () => {
    // Basic validation
    if (!name.trim()) {
      setFormError('Name is required');
      toast.error('Name is required');
      return;
    }

    if (!content.trim()) {
      setFormError('Content is required');
      toast.error('Content is required');
      return;
    }

    if (!user?.workspace_id) {
      setFormError('Workspace ID is missing');
      toast.error('Workspace ID is missing');
      return;
    }

    setFormError(null);

    if (isEditing) {
      updateMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        is_enabled: isEnabled,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        content: content.trim(),
        workspace_id: user.workspace_id,
        is_enabled: isEnabled,
      });
    }
  };

  const handleCloseAndReset = () => {
    setName('');
    setDescription('');
    setContent('');
    setIsEnabled(true);
    setFormError(null);
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={handleCloseAndReset} maxWidth="md" fullWidth>
      <DialogTitle>{isEditing ? 'Edit Canned Reply' : 'Create New Canned Reply'}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {isEditing
            ? 'Update this canned reply for your team to use.'
            : 'Create a new canned reply for your team to use when responding to tickets.'}
        </DialogContentText>

        {/* Name Field */}
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          error={!!formError && !name.trim()}
          helperText={!!formError && !name.trim() ? 'Name is required' : ''}
          sx={{ mb: 2 }}
        />

        {/* Description Field */}
        <TextField
          margin="dense"
          label="Description"
          type="text"
          fullWidth
          variant="outlined"
          value={description}
          onChange={e => setDescription(e.target.value)}
          multiline
          rows={2}
          placeholder="Optional description for this canned reply"
          sx={{ mb: 2 }}
        />

        {/* Content Field */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'rgba(0, 0, 0, 0.87)',
            }}
          >
            Content *
          </label>
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Enter the reply content..."
          />
        </div>

        {/* Enabled Switch */}
        <FormControlLabel
          control={<Switch checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} />}
          label={isEnabled ? 'Enabled' : 'Disabled'}
          sx={{ mb: 2 }}
        />

        {formError && (
          <div
            style={{
              color: '#d32f2f',
              fontSize: '0.875rem',
              marginTop: 8,
            }}
          >
            {formError}
          </div>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCloseAndReset} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading
            ? isEditing
              ? 'Updating...'
              : 'Creating...'
            : isEditing
              ? 'Update Reply'
              : 'Create Reply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
