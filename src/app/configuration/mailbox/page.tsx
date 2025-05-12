'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { fetchAPI } from '@/lib/fetch-api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Loader2, CheckCircle, Trash2 } from 'lucide-react';
import { Buffer } from 'buffer';

interface MailboxConnection {
  id: number;
  email: string;
  display_name?: string | null;
  workspace_id: number;
  created_by_agent_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function MailboxPage() {
  const { user } = useAuth();
  const workspaceId = user?.workspace_id;
  const [isLoadingConnect, setIsLoadingConnect] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);
  const [connections, setConnections] = useState<MailboxConnection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!workspaceId) {
      setIsLoadingList(false);
      return;
    }
    setIsLoadingList(true);
    setError(null);
    try {
      const apiUrlBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';
      const connectionsUrl = `${apiUrlBase}/v1/microsoft/connections`;
      const response = await fetchAPI.GET<MailboxConnection[]>(connectionsUrl);

      if (response.success && response.data) {
        setConnections(response.data);
      } else {
        setConnections([]);
        if (!response.success) {
          setError(response.message || 'Failed to fetch connections.');
          toast.error(response.message || 'Failed to fetch connections.');
        }
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred while fetching connections.'
      );
      toast.error('Failed to fetch connections.');
      setConnections([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (user && workspaceId) {
      fetchConnections();
    } else {
      setIsLoadingList(false);
    }
  }, [user, workspaceId, fetchConnections]);

  const handleConnectMicrosoft = async () => {
    if (!workspaceId || !user) {
      toast.error('Error: Workspace or user information is missing.');
      setError('Workspace or user information is missing.');
      return;
    }

    setIsLoadingConnect(true);
    setError(null);

    try {
      const stateObject = {
        workspace_id: workspaceId.toString(),
        agent_id: user.id.toString(),
        original_hostname: window.location.hostname,
      };
      const stateJsonString = JSON.stringify(stateObject);
      let base64State = Buffer.from(stateJsonString).toString('base64');
      base64State = base64State.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const apiUrlBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';
      const fullApiUrl = `${apiUrlBase}/v1/microsoft/auth/authorize?state=${base64State}`;

      const response = await fetchAPI.GET<{ auth_url: string }>(fullApiUrl);

      if (response.data?.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        throw new Error('Authorization URL not received from backend.');
      }
    } catch (err: unknown) {
      console.error('Failed to get Microsoft auth URL:', err);
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to initiate Microsoft connection.';
      toast.error(errorMsg);
      setError(errorMsg);
      setIsLoadingConnect(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const message = params.get('message');

    if (status === 'success') {
      toast.success(message || 'Microsoft account connected successfully!');
      fetchConnections();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'error') {
      toast.error(message || 'Failed to connect Microsoft account.');
      fetchConnections();
      setError(message || 'Failed to connect Microsoft account.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchConnections]);

  const handleDisconnect = async (connectionId: number) => {
    setDisconnectingId(connectionId);
    setError(null);
    try {
      const apiUrlBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';
      const disconnectUrl = `${apiUrlBase}/v1/microsoft/connection/${connectionId}`;
      const response = await fetchAPI.DELETE(disconnectUrl);

      if (response.success) {
        toast.success('Mailbox disconnected successfully!');
        fetchConnections();
      } else {
        throw new Error(response.message || 'Failed to disconnect mailbox.');
      }
    } catch (err) {
      console.error(`Failed to disconnect mailbox ${connectionId}:`, err);
      const errorMsg =
        err instanceof Error ? err.message : 'An unknown error occurred during disconnection.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card>
        <CardHeader>
          {/* <CardTitle>Mailbox Connection</CardTitle> REMOVED */}
          <CardDescription>
            Connect a Microsoft 365 mailbox to automatically create tickets from incoming emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <p className="text-red-500 mb-4">Error: {error}</p>}

          <div>
            <h3 className="text-md font-semibold mb-3">Connected Mailboxes</h3>
            {isLoadingList ? (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading connections...</span>
              </div>
            ) : connections.length > 0 ? (
              <ul className="space-y-3">
                {connections.map(conn => (
                  <li
                    key={conn.id}
                    className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{conn.display_name || conn.email}</p>
                        <p className="text-xs text-muted-foreground">{conn.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(conn.id)}
                      disabled={disconnectingId === conn.id}
                      aria-label={`Disconnect ${conn.email}`}
                    >
                      {disconnectingId === conn.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No mailboxes connected yet.</p>
            )}
          </div>

          <div className="pt-6 border-t">
            <h3 className="text-md font-semibold mb-3">Add New Connection</h3>
            <Button onClick={handleConnectMicrosoft} disabled={isLoadingConnect}>
              {isLoadingConnect ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Microsoft Account'
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Connect a new Microsoft 365 account to this workspace.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
