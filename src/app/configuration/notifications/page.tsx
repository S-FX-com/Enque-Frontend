'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Terminal, Info, AlertCircle, Mail, Users, MessageSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getNotificationSettings, toggleNotificationSetting, connectNotificationChannel } from '@/services/notifications';
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

export default function NotificationsConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [updatingSettingId, setUpdatingSettingId] = useState<number | null>(null);
  const [connectingTeams, setConnectingTeams] = useState(false);

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

  const connectTeamsMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setConnectingTeams(true);
      console.log('🔄 Starting Teams connection process for workspace:', workspaceId);
      
      try {
        const result = await connectNotificationChannel(workspaceId, 'teams', {
          enable_notifications: true,
          activity_types: ["ticketCreated", "ticketAssigned", "newResponse"]
        });
        console.log('✅ Teams connection result:', result);
        return result;
      } catch (error) {
        console.error('❌ Teams connection error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🎉 Teams connection successful:', data);
      toast.success('Microsoft Teams notifications enabled successfully!');
      setConnectingTeams(false);
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', workspaceId] });
    },
    onError: (error: Error & { response?: { data?: { detail?: string } } }) => {
      console.error('💥 Teams connection mutation error:', error);
      console.error('💥 Error response:', error?.response);
      console.error('💥 Error data:', error?.response?.data);
      
      // Check if it's a Microsoft account linking issue
      if (error?.response?.data?.detail?.includes('Microsoft 365 account not linked')) {
        toast.error('Please link your Microsoft 365 account first. Go to Integrations > Microsoft 365 to connect your account.');
      } else if (error?.response?.data?.detail) {
        toast.error(`Failed to connect Teams: ${error.response.data.detail}`);
      } else {
        toast.error(`Failed to connect Teams: ${error.message || 'Unknown error'}`);
      }
      
      setConnectingTeams(false);
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

                  {/* Microsoft Teams Notifications Section */}
                  <div className="border rounded-md p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MessageSquare className="h-4 w-4" />
                      <span className="font-medium text-lg">Microsoft Teams Notifications</span>
                    </div>
                    
                    {notificationSettings?.agents.teams.is_connected ? (
                      <div className="space-y-4 pl-6">
                        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-green-600" />
                            <span className="text-green-800 font-medium">Teams Connected</span>
                          </div>
                          <p className="text-green-700 text-sm mt-1">
                            Teams notifications are set up and ready to use.
                          </p>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <h4 className="font-medium">Teams Notifications</h4>
                            <p className="text-sm text-muted-foreground">
                              Send activity feed notifications to Microsoft Teams for ticket updates
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="teams-notifications"
                                checked={notificationSettings?.agents.teams.is_enabled}
                                onCheckedChange={() =>
                                  handleToggleSetting(
                                    notificationSettings?.agents.teams.id || 0,
                                    notificationSettings?.agents.teams.is_enabled
                                  )
                                }
                                disabled={
                                  updatingSettingId === (notificationSettings?.agents.teams.id || 0)
                                }
                              />
                              <Label htmlFor="teams-notifications">
                                {notificationSettings?.agents.teams.is_enabled
                                  ? 'Enabled'
                                  : 'Disabled'}
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pl-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-800 font-medium">Setup Required</span>
                          </div>
                          <p className="text-blue-700 text-sm mb-3">
                            Connect Microsoft Teams to receive activity feed notifications for ticket updates.
                            Agents must have their Microsoft 365 accounts linked.
                          </p>
                          <button
                            onClick={() => connectTeamsMutation.mutate()}
                            disabled={connectingTeams}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {connectingTeams ? 'Connecting...' : 'Enable Teams Notifications'}
                          </button>
                        </div>
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
