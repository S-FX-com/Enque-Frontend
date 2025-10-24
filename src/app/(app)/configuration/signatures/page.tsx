'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// ⚡ LAZY LOAD: RichTextEditor - Solo carga al editar firmas
const RichTextEditor = dynamic(
  () => import('@/components/tiptap/RichTextEditor').then(mod => ({ default: mod.RichTextEditor })),
  {
    loading: () => <Skeleton className="h-32 w-full rounded-md" />,
    ssr: false,
  }
);
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Terminal, Info, AlertCircle } from 'lucide-react';
import {
  getGlobalSignature,
  updateGlobalSignature,
  toggleGlobalSignature,
} from '@/services/global-signature';

export default function GlobalSignatureConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [signatureContent, setSignatureContent] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: globalSignatureData,
    isLoading: isLoadingSignature,
    isError: isSignatureError,
    error: signatureError,
  } = useQuery({
    queryKey: ['globalSignature', workspaceId],
    queryFn: () => getGlobalSignature(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (globalSignatureData) {
      setSignatureContent(globalSignatureData.content || '');
      setIsEnabled(globalSignatureData.is_enabled);
    } else {
      // Set default template
      setSignatureContent(`
<p><strong>[Agent Name]</strong><br>
<em>[Agent Role]</em><br>
<em>Your Company Name</em></p>
<p><img src="" alt="" width="120" height="75"></p>
      `);
      setIsEnabled(true);
    }
  }, [globalSignatureData]);

  const updateSignatureMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return updateGlobalSignature(workspaceId, content, isEnabled);
    },
    onSuccess: () => {
      toast.success('Global signature updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['globalSignature', workspaceId] });
    },
    onError: error => {
      console.error('Failed to save global signature:', error);
      toast.error(`Failed to update global signature: ${error.message}`);
    },
  });

  const toggleSignatureMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return toggleGlobalSignature(workspaceId, enabled);
    },
    onSuccess: () => {
      toast.success(`Global signature ${isEnabled ? 'enabled' : 'disabled'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['globalSignature', workspaceId] });
      // Invalidate other queries that might use this setting
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
    onError: error => {
      console.error('Failed to toggle global signature:', error);
      toast.error(`Failed to toggle global signature: ${error.message}`);
      // Reset to previous state if there was an error
      setIsEnabled(!isEnabled);
    },
  });

  const handleSave = () => {
    if (signatureContent.trim() === '') {
      toast.error('Signature content cannot be empty');
      return;
    }

    updateSignatureMutation.mutate(signatureContent);
  };

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    toggleSignatureMutation.mutate(checked);
  };

  if (currentUserRole !== 'admin') {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access the global signature settings.
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
              <CardTitle className="text-xl">Global Email Signature</CardTitle>
              <CardDescription>
                Configure a unified email signature for your entire team
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="signature-active"
                  checked={isEnabled}
                  onCheckedChange={handleToggle}
                  disabled={
                    toggleSignatureMutation.isPending || isLoadingSignature || !globalSignatureData
                  }
                />
                <Label htmlFor="signature-active" className="font-medium">
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Global Signatures</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                This signature will be applied to all agents in your workspace.
              </p>
              <p className="mb-2">
                Use placeholders like <strong>[Agent Name]</strong> and{' '}
                <strong>[Agent Role]</strong> that will be automatically replaced with each
                agent&apos;s information when sending emails.
              </p>
            </AlertDescription>
          </Alert>

          {isLoadingSignature || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isSignatureError ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading Signature</AlertTitle>
              <AlertDescription>
                {signatureError instanceof Error
                  ? signatureError.message
                  : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-3">Edit global signature template:</h3>

                <RichTextEditor
                  content={signatureContent}
                  onChange={setSignatureContent}
                  placeholder="Enter global email signature template..."
                  disabled={updateSignatureMutation.isPending}
                />

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={updateSignatureMutation.isPending}
                    className="px-8"
                  >
                    {updateSignatureMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
