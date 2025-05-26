'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Terminal, Info, AlertCircle, XCircle, Globe, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getCnameSettings,
  updateCnameSettings,
  toggleCnameSettings,
  verifyCnameSettings,
} from '@/services/cname';

export default function CnameConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [domain, setDomain] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: cnameSettings,
    isLoading: isLoadingCname,
    isError: isCnameError,
    error: cnameError,
  } = useQuery({
    queryKey: ['cnameSettings', workspaceId],
    queryFn: () => getCnameSettings(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (cnameSettings) {
      setDomain(cnameSettings.domain || '');
    }
  }, [cnameSettings]);

  const updateCnameMutation = useMutation({
    mutationFn: async (newDomain: string) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return updateCnameSettings(workspaceId, newDomain);
    },
    onSuccess: () => {
      toast.success('CNAME settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['cnameSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to update CNAME settings:', error);
      toast.error(`Failed to update CNAME settings: ${error.message}`);
    },
  });

  const toggleCnameMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return toggleCnameSettings(workspaceId, enabled);
    },
    onSuccess: data => {
      toast.success(`Custom domain ${data.is_enabled ? 'enabled' : 'disabled'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['cnameSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle CNAME settings:', error);
      toast.error(`Failed to toggle CNAME settings: ${error.message}`);
    },
  });

  const verifyCnameMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setIsVerifying(true);
      return verifyCnameSettings(workspaceId);
    },
    onSuccess: () => {
      toast.success('Domain verified successfully!');
      queryClient.invalidateQueries({ queryKey: ['cnameSettings', workspaceId] });
      setIsVerifying(false);
    },
    onError: error => {
      console.error('Failed to verify domain:', error);
      toast.error(`Failed to verify domain: ${error.message}`);
      setIsVerifying(false);
    },
  });

  const handleSave = () => {
    if (domain.trim() === '') {
      toast.error('Domain cannot be empty');
      return;
    }

    // Simple domain validation
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      toast.error('Please enter a valid domain');
      return;
    }

    updateCnameMutation.mutate(domain);
  };

  const handleToggle = (checked: boolean) => {
    toggleCnameMutation.mutate(checked);
  };

  const handleVerify = () => {
    verifyCnameMutation.mutate();
  };

  if (currentUserRole !== 'admin') {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access the custom domain settings.
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
              <CardTitle className="text-xl">Custom Domain (CNAME)</CardTitle>
              <CardDescription>Configure a custom domain for your help desk portal</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="cname-active"
                  checked={cnameSettings?.is_enabled}
                  onCheckedChange={handleToggle}
                  disabled={
                    toggleCnameMutation.isPending ||
                    isLoadingCname ||
                    !cnameSettings ||
                    cnameSettings.verification_status !== 'verified'
                  }
                />
                <Label htmlFor="cname-active" className="font-medium">
                  {cnameSettings?.is_enabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cnameSettings &&
            !cnameSettings.is_enabled &&
            cnameSettings.verification_status === 'verified' && (
              <Alert className="mb-4 bg-muted">
                <XCircle className="h-4 w-4 text-gray-500" />
                <AlertTitle>Custom Domain Disabled</AlertTitle>
                <AlertDescription>
                  Your custom domain is configured but currently disabled. Enable it to start using
                  your custom domain.
                </AlertDescription>
              </Alert>
            )}

          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Custom Domains</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Using a custom domain allows you to brand your help desk portal with your own domain
                name.
              </p>
              <p>
                After setting up your domain, you&apos;ll need to configure DNS records with your domain
                provider and verify ownership.
              </p>
            </AlertDescription>
          </Alert>

          {isLoadingCname || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isCnameError ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading CNAME Settings</AlertTitle>
              <AlertDescription>
                {cnameError instanceof Error ? cnameError.message : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Domain Name</h3>
                  <div className="flex gap-3">
                    <Input
                      placeholder="support.yourcompany.com"
                      value={domain}
                      onChange={e => setDomain(e.target.value)}
                      disabled={updateCnameMutation.isPending}
                      className="max-w-md"
                    />
                    <Button
                      onClick={handleSave}
                      disabled={updateCnameMutation.isPending || domain === cnameSettings?.domain}
                    >
                      {updateCnameMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>

                {cnameSettings && (
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-sm font-medium">Domain Status:</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          cnameSettings.verification_status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : cnameSettings.verification_status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {cnameSettings.verification_status === 'verified'
                          ? 'Verified'
                          : cnameSettings.verification_status === 'pending'
                            ? 'Pending Verification'
                            : 'Verification Failed'}
                      </span>
                      {cnameSettings.verification_status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleVerify}
                          disabled={isVerifying}
                        >
                          {isVerifying ? 'Verifying...' : 'Verify Now'}
                        </Button>
                      )}
                    </div>

                    <h3 className="text-sm font-medium mb-3">Required DNS Records</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cnameSettings.dns_records.map((record, index) => (
                            <TableRow key={index}>
                              <TableCell>{record.type}</TableCell>
                              <TableCell>{record.name}</TableCell>
                              <TableCell className="font-mono text-sm">{record.value}</TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    record.status === 'verified'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {record.status === 'verified' ? 'Verified' : 'Pending'}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-6">
                      <Alert>
                        <Globe className="h-4 w-4" />
                        <AlertTitle>Need help with DNS configuration?</AlertTitle>
                        <AlertDescription className="flex items-center gap-1">
                          Check our
                          <a href="#" className="text-primary flex items-center hover:underline">
                            DNS configuration guide
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
