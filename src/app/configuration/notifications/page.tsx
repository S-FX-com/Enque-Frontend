'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Terminal, Info, AlertCircle, Mail, Users, MessageSquare, ExternalLink, CheckCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getNotificationSettings, toggleNotificationSetting, enableTeamsNotifications, disableTeamsNotifications, getTeamsNotificationStatus, sendTestTeamsNotification } from '@/services/notifications';
import { useState } from 'react';


// Definir un tipo para los ajustes de notificaciones
interface NotificationSetting {
  id: number;
  is_enabled: boolean;
  [key: string]: unknown; // Usar unknown en lugar de any
}

interface NotificationSettingsObject {
  id?: number;
  is_enabled?: boolean;
  [key: string]: NotificationSettingsObject | NotificationSetting | boolean | number | undefined;
}

interface TeamsNotificationStatus {
  is_enabled: boolean;
  setting_id: number | null;
  agents_with_teams: number;
  total_agents: number;
  coverage_percentage: number;
}

export default function NotificationsConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [updatingSettingId, setUpdatingSettingId] = useState<number | null>(null);
  const [isEnablingTeams, setIsEnablingTeams] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: notificationSettings,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    error: settingsError,
  } = useQuery({
    queryKey: ['notificationSettings', workspaceId],
    queryFn: () => getNotificationSettings(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: teamsStatus,
    isLoading: isLoadingTeamsStatus,
  } = useQuery<TeamsNotificationStatus>({
    queryKey: ['teamsNotificationStatus', workspaceId],
    queryFn: () => getTeamsNotificationStatus(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000,
  });

  const toggleSettingMutation = useMutation({
    mutationFn: async ({ settingId, enabled }: { settingId: number; enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setUpdatingSettingId(settingId);
      return toggleNotificationSetting(workspaceId, settingId, enabled);
    },
    onSuccess: () => {
      // No invalidar automáticamente para evitar parpadeo
      // La actualización optimista ya manejó el cambio de UI
      setUpdatingSettingId(null);
    },
    onError: error => {
      console.error('Failed to toggle notification setting:', error);
      toast.error(`Failed to update setting: ${error.message}`);
      setUpdatingSettingId(null);
      // Solo invalidar en caso de error para revertir el estado
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', workspaceId] });
    },
  });

  const enableTeamsMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setIsEnablingTeams(true);
      return enableTeamsNotifications(workspaceId);
    },
    onSuccess: () => {
      console.log('Teams notifications enabled successfully - updating status...');
      toast.success('Teams notifications enabled successfully!');
      setIsEnablingTeams(false);
      // Invalidar las queries para forzar refetch
      queryClient.invalidateQueries({ queryKey: ['teamsNotificationStatus', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to enable Teams notifications:', error);
      toast.error(`Failed to enable Teams notifications: ${error.message}`);
      setIsEnablingTeams(false);
    },
  });

  const disableTeamsMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setIsEnablingTeams(true);
      return disableTeamsNotifications(workspaceId);
    },
    onSuccess: () => {
      console.log('Teams notifications disabled successfully - updating status...');
      toast.success('Teams notifications disabled successfully!');
      setIsEnablingTeams(false);
      // Invalidar las queries para forzar refetch
      queryClient.invalidateQueries({ queryKey: ['teamsNotificationStatus', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to disable Teams notifications:', error);
      toast.error(`Failed to disable Teams notifications: ${error.message}`);
      setIsEnablingTeams(false);
    },
  });

  const testTeamsMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setIsSendingTest(true);
      return sendTestTeamsNotification(workspaceId);
    },
    onSuccess: () => {
      toast.success('Test Teams notification sent! Check your Teams for the notification.');
      setIsSendingTest(false);
    },
    onError: error => {
      console.error('Failed to send test Teams notification:', error);
      toast.error(`Failed to send test notification: ${error.message}`);
      setIsSendingTest(false);
    },
  });

  const handleToggleSetting = (settingId: number, currentValue: boolean | undefined) => {
    // No permitir clicks mientras se está actualizando este setting específico
    if (updatingSettingId === settingId) {
      return;
    }

    // Optimistic update
    const newValue = !(currentValue || false);

    // Clonar los ajustes actuales para actualización optimista
    const optimisticSettings = JSON.parse(JSON.stringify(notificationSettings));

    // Buscar y actualizar optimistamente el ajuste correspondiente
    const updateSettingById = (obj: NotificationSettingsObject) => {
      if (!obj) return false;

      // Comprobar si el objeto actual tiene el ID correcto
      if (obj.id === settingId) {
        obj.is_enabled = newValue;
        return true;
      }

      // Recorrer recursivamente todas las propiedades del objeto
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (updateSettingById(obj[key] as NotificationSettingsObject)) return true;
        }
      }

      return false;
    };

    // Actualizar optimistamente
    if (optimisticSettings) {
      updateSettingById(optimisticSettings);

      // Actualizar la caché inmediatamente
      queryClient.setQueryData(['notificationSettings', workspaceId], optimisticSettings);
    }

    // Realizar la petición al servidor
    toggleSettingMutation.mutate({
      settingId,
      enabled: newValue,
    });
  };

  if (currentUserRole !== 'admin') {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access the notification settings.
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
              <CardTitle className="text-xl">Notification Settings</CardTitle>
              <CardDescription>
                Configure notification preferences for agents and clients
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Notifications</AlertTitle>
            <AlertDescription>
              <p>
                Configure when and how notifications are sent to agents and clients. Enable or
                disable different notification types.
              </p>
            </AlertDescription>
          </Alert>

          {isLoadingSettings || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : isSettingsError ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading Notification Settings</AlertTitle>
              <AlertDescription>
                {settingsError instanceof Error
                  ? settingsError.message
                  : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="agents" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="agents" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Agent Notifications
                </TabsTrigger>
                <TabsTrigger value="clients" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Client Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="agents" className="space-y-6">
                <div className="space-y-6">
                  <div className="border rounded-md p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Mail className="h-4 w-4" />
                      <span className="font-medium text-lg">Email Notifications</span>
                    </div>
                    <div className="space-y-4 pl-6">
                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <h4 className="font-medium">New Ticket Created</h4>
                          <p className="text-sm text-muted-foreground">
                            Notify agents when a new ticket is created
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="new-ticket-email"
                              checked={
                                notificationSettings?.agents.email.new_ticket_created.is_enabled
                              }
                              onCheckedChange={() =>
                                handleToggleSetting(
                                  notificationSettings?.agents.email.new_ticket_created.id || 0,
                                  notificationSettings?.agents.email.new_ticket_created.is_enabled
                                )
                              }
                              disabled={
                                updatingSettingId ===
                                (notificationSettings?.agents.email.new_ticket_created.id || 0)
                              }
                            />
                            <Label htmlFor="new-ticket-email">
                              {notificationSettings?.agents.email.new_ticket_created.is_enabled
                                ? 'Enabled'
                                : 'Disabled'}
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <h4 className="font-medium">New Response</h4>
                          <p className="text-sm text-muted-foreground">
                            Notify agents when there&apos;s a new response on a ticket
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="new-response-email"
                              checked={notificationSettings?.agents.email.new_response.is_enabled}
                              onCheckedChange={() =>
                                handleToggleSetting(
                                  notificationSettings?.agents.email.new_response.id || 0,
                                  notificationSettings?.agents.email.new_response.is_enabled
                                )
                              }
                              disabled={
                                updatingSettingId ===
                                (notificationSettings?.agents.email.new_response.id || 0)
                              }
                            />
                            <Label htmlFor="new-response-email">
                              {notificationSettings?.agents.email.new_response.is_enabled
                                ? 'Enabled'
                                : 'Disabled'}
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b">
                        <div>
                          <h4 className="font-medium">Ticket Assigned</h4>
                          <p className="text-sm text-muted-foreground">
                            Notify agents when a ticket is assigned to them
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="ticket-assigned-email"
                              checked={
                                notificationSettings?.agents.email.ticket_assigned.is_enabled
                              }
                              onCheckedChange={() =>
                                handleToggleSetting(
                                  notificationSettings?.agents.email.ticket_assigned.id || 0,
                                  notificationSettings?.agents.email.ticket_assigned.is_enabled
                                )
                              }
                              disabled={
                                updatingSettingId ===
                                (notificationSettings?.agents.email.ticket_assigned.id || 0)
                              }
                            />
                            <Label htmlFor="ticket-assigned-email">
                              {notificationSettings?.agents.email.ticket_assigned.is_enabled
                                ? 'Enabled'
                                : 'Disabled'}
                            </Label>
                          </div>
                        </div>
                      </div>


                    </div>
                  </div>

                  {/* Teams Notifications Section */}
                  <div className="border rounded-md p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-lg">Microsoft Teams Notifications</span>
                    </div>
                    
                    {isLoadingTeamsStatus ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-32" />
                      </div>
                    ) : (
                      <div className="space-y-4 pl-6">
                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <h4 className="font-medium">Teams Integration Status</h4>
                            <p className="text-sm text-muted-foreground">
                              Send notifications directly to Microsoft Teams
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                              {teamsStatus?.agents_with_teams || 0} of {teamsStatus?.total_agents || 0} agents connected ({(teamsStatus?.coverage_percentage || 0).toFixed(0)}%)
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="teams-notifications"
                                checked={teamsStatus?.is_enabled || false}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    enableTeamsMutation.mutate();
                                  } else {
                                    disableTeamsMutation.mutate();
                                  }
                                }}
                                disabled={isEnablingTeams}
                              />
                              <Label htmlFor="teams-notifications">
                                {teamsStatus?.is_enabled ? 'Enabled' : 'Disabled'}
                              </Label>
                            </div>
                          </div>
                        </div>

                        {teamsStatus?.is_enabled && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-900">Teams Notifications Active</span>
                            </div>
                            <p className="text-sm text-blue-800 mb-3">
                              Agents will receive Teams notifications for:
                            </p>
                            <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-4">
                              <li>New tickets created for their team</li>
                              <li>Tickets assigned to them specifically</li>
                              <li>New responses on their tickets</li>
                            </ul>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => testTeamsMutation.mutate()}
                                disabled={isSendingTest}
                                className="text-blue-700 border-blue-300 hover:bg-blue-100"
                              >
                                {isSendingTest ? 'Sending...' : 'Send Test Notification'}
                              </Button>
                              {user?.microsoft_id ? (
                                <div className="flex items-center gap-1 text-sm text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Your Microsoft account is connected
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-sm text-amber-600">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Connect your Microsoft account to receive notifications</span>
                                  <Button size="sm" variant="link" className="h-auto p-0 text-blue-600">
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {!teamsStatus?.is_enabled && teamsStatus?.agents_with_teams === 0 && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Microsoft Teams Setup Required</AlertTitle>
                            <AlertDescription>
                              <p className="mb-2">
                                To enable Teams notifications, agents need to connect their Microsoft 365 accounts.
                              </p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                <li>Agents must sign in with their Microsoft 365 account</li>
                                <li>Your Azure app must have Teams permissions configured</li>
                                <li>Admin consent may be required for your organization</li>
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {!teamsStatus?.is_enabled && (teamsStatus?.agents_with_teams || 0) > 0 && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Ready to Enable Teams Notifications</AlertTitle>
                            <AlertDescription>
                              You have {teamsStatus?.agents_with_teams} agents connected to Microsoft 365. 
                              Enable Teams notifications to start sending notifications directly to Teams.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="clients" className="space-y-6">
                <div className="space-y-6">
                  <div className="border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Ticket Created Confirmation</h3>
                        <p className="text-sm text-muted-foreground">
                          Email sent to clients when they create a new ticket
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ticket-created-client"
                          checked={notificationSettings?.users.email.new_ticket_created.is_enabled}
                          onCheckedChange={() =>
                            handleToggleSetting(
                              notificationSettings?.users.email.new_ticket_created.id || 0,
                              notificationSettings?.users.email.new_ticket_created.is_enabled
                            )
                          }
                          disabled={
                            updatingSettingId ===
                            (notificationSettings?.users.email.new_ticket_created.id || 0)
                          }
                        />
                        <Label htmlFor="ticket-created-client">
                          {notificationSettings?.users.email.new_ticket_created.is_enabled
                            ? 'Active'
                            : 'Inactive'}
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Ticket Closed Confirmation</h3>
                        <p className="text-sm text-muted-foreground">
                          Email sent to clients when their ticket is closed
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ticket-closed-client"
                          checked={notificationSettings?.users.email.ticket_closed.is_enabled}
                          onCheckedChange={() =>
                            handleToggleSetting(
                              notificationSettings?.users.email.ticket_closed.id || 0,
                              notificationSettings?.users.email.ticket_closed.is_enabled
                            )
                          }
                          disabled={
                            updatingSettingId ===
                            (notificationSettings?.users.email.ticket_closed.id || 0)
                          }
                        />
                        <Label htmlFor="ticket-closed-client">
                          {notificationSettings?.users.email.ticket_closed.is_enabled
                            ? 'Enabled'
                            : 'Disabled'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
