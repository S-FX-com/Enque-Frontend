'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { fetchAPI } from '@/lib/fetch-api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Loader2, CheckCircle, Trash2, RefreshCw, Settings, Globe, Users } from 'lucide-react';
import { Buffer } from 'buffer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { getTeams } from '@/services/team';
import type { Team } from '@/typescript/team';

interface MailboxConnection {
  id: number;
  email: string;
  display_name?: string | null;
  workspace_id: number;
  created_by_agent_id: number;
  is_global: boolean;
  team_ids: number[];
  teams: Array<{ id: number; name: string; icon_name?: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MailboxConnectionCardProps {
  connection: MailboxConnection;
  teams: Team[];
  isUpdating: boolean;
  isDisconnecting: boolean;
  isReconnecting: boolean;
  onVisibilityChange: (connectionId: number, isGlobal: boolean, selectedTeamIds: number[]) => void;
  onDisconnect: (connectionId: number) => void;
  onReconnect: (connectionId: number) => void;
}

function MailboxConnectionCard({
  connection,
  teams,
  isUpdating,
  isDisconnecting,
  isReconnecting,
  onVisibilityChange,
  onDisconnect,
  onReconnect,
}: MailboxConnectionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string>(
    connection.is_global
      ? 'global'
      : connection.team_ids.length === 1
        ? connection.team_ids[0].toString()
        : 'multiple'
  );

  const handleSelectionChange = (value: string) => {
    setSelectedOption(value);

    if (value === 'global') {
      onVisibilityChange(connection.id, true, []);
    } else {
      const teamId = parseInt(value);
      onVisibilityChange(connection.id, false, [teamId]);
    }
  };

  const getCurrentStatus = () => {
    if (connection.is_global) {
      return { label: 'Everyone', icon: Globe, variant: 'secondary' as const };
    } else if (connection.teams.length === 1) {
      const team = connection.teams[0];
      return {
        label: `${team.icon_name || '👥'} ${team.name}`,
        icon: Users,
        variant: 'outline' as const,
      };
    } else if (connection.teams.length > 1) {
      return {
        label: `${connection.teams.length} Teams`,
        icon: Users,
        variant: 'outline' as const,
      };
    } else {
      return { label: 'No Access', icon: Users, variant: 'destructive' as const };
    }
  };

  const status = getCurrentStatus();

  return (
    <li className="p-4 border rounded-lg bg-muted/30 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">{connection.display_name || connection.email}</p>
            <p className="text-xs text-muted-foreground">{connection.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReconnect(connection.id)}
            disabled={isReconnecting}
            title="Reconnect"
          >
            {isReconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 text-blue-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDisconnect(connection.id)}
            disabled={isDisconnecting}
            title="Disconnect"
          >
            {isDisconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-red-500" />
            )}
          </Button>
        </div>
      </div>

      {/* Visibility Selection */}
      <div className="flex items-center space-x-3">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center space-x-2 flex-1">
          <span className="text-sm text-muted-foreground">Assign to:</span>
          <Select
            value={selectedOption}
            onValueChange={handleSelectionChange}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-48">
              <SelectValue>
                {isUpdating ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  status.label
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Everyone</span>
                </div>
              </SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id.toString()}>
                  <div className="flex items-center space-x-2">
                    <span>{team.icon_name || '👥'}</span>
                    <span>{team.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </li>
  );
}

export default function MailboxPage() {
  const { user } = useAuth();
  const workspaceId = user?.workspace_id;
  const [isLoadingConnect, setIsLoadingConnect] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);
  const [reconnectingId, setReconnectingId] = useState<number | null>(null);
  const [connections, setConnections] = useState<MailboxConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<number | null>(null);

  // Query para obtener teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: getTeams,
    staleTime: 1000 * 60 * 5,
  });

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

  const handleReconnect = async (connectionId: number) => {
    if (!workspaceId || !user) {
      toast.error('Error: Workspace or user information is missing.');
      setError('Workspace or user information is missing.');
      return;
    }

    setReconnectingId(connectionId);
    setError(null);
    try {
      const apiUrlBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';
      const reconnectUrl = `${apiUrlBase}/v1/microsoft/connection/${connectionId}/reconnect`;

      const stateObject = {
        workspace_id: workspaceId.toString(),
        agent_id: user.id.toString(),
        connection_id: connectionId.toString(),
        original_hostname: window.location.hostname,
      };
      const stateJsonString = JSON.stringify(stateObject);
      let base64State = Buffer.from(stateJsonString).toString('base64');
      base64State = base64State.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = await fetchAPI.POST<{ auth_url: string }>(reconnectUrl, {
        state: base64State,
      });

      if (response.data?.auth_url) {
        window.location.href = response.data.auth_url;
      } else {
        throw new Error('Authorization URL not received from backend.');
      }
    } catch (err) {
      console.error(`Failed to reconnect mailbox ${connectionId}:`, err);
      const errorMsg =
        err instanceof Error ? err.message : 'An unknown error occurred during reconnection.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setReconnectingId(null);
    }
  };

  const handleVisibilityChange = async (
    connectionId: number,
    isGlobal: boolean,
    selectedTeamIds: number[] = []
  ) => {
    setUpdatingVisibilityId(connectionId);
    setError(null);
    try {
      const apiUrlBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';
      const updateUrl = `${apiUrlBase}/v1/microsoft/connection/${connectionId}`;

      const updateData = {
        is_global: isGlobal,
        team_ids: selectedTeamIds,
      };

      const response = await fetchAPI.PUT(updateUrl, updateData);

      if (response.success) {
        toast.success('Mailbox visibility updated successfully!');
        fetchConnections();
      } else {
        throw new Error(response.message || 'Failed to update mailbox visibility.');
      }
    } catch (err) {
      console.error(`Failed to update visibility for mailbox ${connectionId}:`, err);
      const errorMsg =
        err instanceof Error ? err.message : 'An unknown error occurred during visibility update.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setUpdatingVisibilityId(null);
    }
  };

  return (
    <>
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
              <ul className="space-y-4">
                {connections.map(conn => (
                  <MailboxConnectionCard
                    key={conn.id}
                    connection={conn}
                    teams={teams}
                    isUpdating={updatingVisibilityId === conn.id}
                    isDisconnecting={disconnectingId === conn.id}
                    isReconnecting={reconnectingId === conn.id}
                    onVisibilityChange={handleVisibilityChange}
                    onDisconnect={handleDisconnect}
                    onReconnect={handleReconnect}
                  />
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
    </>
  );
}
