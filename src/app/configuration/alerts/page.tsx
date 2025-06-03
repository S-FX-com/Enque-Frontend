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
import { Label } from '@/components/ui/label';
import { Terminal, Info, AlertCircle, BellRing, Link, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getAlertSettings,
  updateSystemAlert,
  toggleSystemAlert,
  updateAdminNotification,
  testConnection,
  type SystemAlert,
  type AdminNotification,
} from '@/services/alerts';

export default function AlertsConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SystemAlert | AdminNotification | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('');
  const [alertDisplayType, setAlertDisplayType] = useState('');
  const [currentTemplate, setCurrentTemplate] = useState('');
  const [emailChannel, setEmailChannel] = useState(false);
  const [inAppChannel, setInAppChannel] = useState(false);
  const [thresholdValue, setThresholdValue] = useState('50');

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: alertSettings,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    error: settingsError,
  } = useQuery({
    queryKey: ['alertSettings', workspaceId],
    queryFn: () => getAlertSettings(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertKey, data }: { alertKey: string; data: Partial<SystemAlert> }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return updateSystemAlert(workspaceId, alertKey, data);
    },
    onSuccess: () => {
      toast.success('Alert settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['alertSettings', workspaceId] });
      setIsDialogOpen(false);
    },
    onError: error => {
      console.error('Failed to update alert settings:', error);
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: async ({
      notificationKey,
      data,
    }: {
      notificationKey: string;
      data: Partial<AdminNotification>;
    }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return updateAdminNotification(workspaceId, notificationKey, data);
    },
    onSuccess: () => {
      toast.success('Notification settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['alertSettings', workspaceId] });
      setIsDialogOpen(false);
    },
    onError: error => {
      console.error('Failed to update notification settings:', error);
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  const toggleAlertMutation = useMutation({
    mutationFn: async ({ alertKey, enabled }: { alertKey: string; enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return toggleSystemAlert(workspaceId, alertKey, enabled);
    },
    onSuccess: () => {
      toast.success('Alert setting updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['alertSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle alert setting:', error);
      toast.error(`Failed to update setting: ${error.message}`);
    },
  });

  const testM365ConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return testConnection(workspaceId, 'm365');
    },
    onSuccess: data => {
      if (data.is_connected) {
        toast.success('Microsoft 365 connector is connected!');
      } else {
        toast.error('Microsoft 365 connector is disconnected!');
      }
    },
    onError: error => {
      console.error('Failed to test M365 connection:', error);
      toast.error(`Failed to test connection: ${error.message}`);
    },
  });

  const handleEditAlert = (alertKey: string, alert: SystemAlert | undefined) => {
    if (!alert) return;
    
    setCurrentAlert(alert);
    setAlertMessage(alert.message);
    setAlertSeverity(alert.severity);
    setAlertDisplayType(alert.display_type);
    setIsDialogOpen(true);
  };

  const handleSaveAlert = () => {
    if (alertMessage.trim() === '') {
      toast.error('Alert message cannot be empty');
      return;
    }

    if (!currentAlert || !('display_type' in currentAlert)) return;

    const updatedAlert = {
      message: alertMessage,
      severity: alertSeverity as 'critical' | 'warning' | 'info',
      display_type: alertDisplayType as 'banner' | 'modal' | 'notification',
    };

    updateAlertMutation.mutate({
      alertKey: currentAlert.key,
      data: updatedAlert,
    });
  };

  const handleToggleAlert = (alertKey: string, currentValue: boolean | undefined) => {
    toggleAlertMutation.mutate({
      alertKey,
      enabled: !(currentValue || false),
    });
  };

  const handleEditNotification = (key: string, notification: AdminNotification | undefined) => {
    if (!notification) return;
    
    setCurrentAlert(notification);
    setEmailChannel(notification.channels.includes('email'));
    setInAppChannel(notification.channels.includes('in_app'));
    setCurrentTemplate(notification.template);
    setThresholdValue(notification.threshold?.toString() || '50');
    setIsDialogOpen(true);
  };

  const handleSaveNotification = () => {
    const channels = [];
    if (emailChannel) channels.push('email');
    if (inAppChannel) channels.push('in_app');

    if (!currentAlert || 'display_type' in currentAlert) return;

    const updatedNotification = {
      channels,
      template: currentTemplate,
      threshold: currentAlert.key === 'high_ticket_volume' ? Number.parseInt(thresholdValue) : undefined,
    };

    updateNotificationMutation.mutate({
      notificationKey: currentAlert.key,
      data: updatedNotification,
    });
  };

  const handleTestM365Connection = () => {
    testM365ConnectionMutation.mutate();
  };

  if (currentUserRole !== 'admin') {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only administrators can access the alert settings.</AlertDescription>
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
              <CardTitle className="text-xl">Alert Settings</CardTitle>
              <CardDescription>Configure system alerts and admin notifications</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Alerts</AlertTitle>
            <AlertDescription>
              <p>
                Configure system alerts that appear to users when critical issues occur, and
                notification preferences for administrators.
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
              <AlertTitle>Error Loading Alert Settings</AlertTitle>
              <AlertDescription>
                {settingsError instanceof Error
                  ? settingsError.message
                  : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="system" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="system" className="flex items-center gap-1">
                  <BellRing className="h-4 w-4" />
                  System Alerts
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Admin Notifications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="system" className="space-y-6">
                <div className="space-y-6">
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-6 py-3">
                      <h3 className="font-medium">Microsoft 365 Connector Status</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">M365 Connector Disconnected Alert</h4>
                          <p className="text-sm text-muted-foreground">
                            Show a banner when the Microsoft 365 connector is disconnected
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="m365-alert"
                            checked={
                              alertSettings?.system_alerts?.m365_connector_disconnected?.is_enabled
                            }
                            onCheckedChange={() =>
                              handleToggleAlert(
                                'm365_connector_disconnected',
                                alertSettings?.system_alerts?.m365_connector_disconnected
                                  ?.is_enabled
                              )
                            }
                          />
                          <Label htmlFor="m365-alert">
                            {alertSettings?.system_alerts?.m365_connector_disconnected?.is_enabled
                              ? 'Enabled'
                              : 'Disabled'}
                          </Label>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-md mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span>
                            {alertSettings?.system_alerts?.m365_connector_disconnected?.message}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleEditAlert(
                              'm365_connector_disconnected',
                              alertSettings?.system_alerts?.m365_connector_disconnected
                            )
                          }
                        >
                          Edit Alert
                        </Button>
                        <Button variant="outline" onClick={handleTestM365Connection}>
                          {testM365ConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                        </Button>
                        <Button variant="outline">
                          <Link className="h-4 w-4 mr-2" />
                          Configure M365
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-6 py-3">
                      <h3 className="font-medium">Database Connection Error</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">Database Connection Error Alert</h4>
                          <p className="text-sm text-muted-foreground">
                            Show a banner when there&apos;s a database connection error
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="db-alert"
                            checked={
                              alertSettings?.system_alerts?.database_connection_error?.is_enabled
                            }
                            onCheckedChange={() =>
                              handleToggleAlert(
                                'database_connection_error',
                                alertSettings?.system_alerts?.database_connection_error?.is_enabled
                              )
                            }
                          />
                          <Label htmlFor="db-alert">
                            {alertSettings?.system_alerts?.database_connection_error?.is_enabled
                              ? 'Enabled'
                              : 'Disabled'}
                          </Label>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-md mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span>
                            {alertSettings?.system_alerts?.database_connection_error?.message}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          handleEditAlert(
                            'database_connection_error',
                            alertSettings?.system_alerts?.database_connection_error
                          )
                        }
                      >
                        Edit Alert
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-6 py-3">
                      <h3 className="font-medium">License Expiring</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">License Expiring Alert</h4>
                          <p className="text-sm text-muted-foreground">
                            Show a notification when the license is about to expire
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="license-alert"
                            checked={alertSettings?.system_alerts?.license_expiring?.is_enabled}
                            onCheckedChange={() =>
                              handleToggleAlert(
                                'license_expiring',
                                alertSettings?.system_alerts?.license_expiring?.is_enabled
                              )
                            }
                          />
                          <Label htmlFor="license-alert">
                            {alertSettings?.system_alerts?.license_expiring?.is_enabled
                              ? 'Enabled'
                              : 'Disabled'}
                          </Label>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-md mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span>{alertSettings?.system_alerts?.license_expiring?.message}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          handleEditAlert(
                            'license_expiring',
                            alertSettings?.system_alerts?.license_expiring
                          )
                        }
                      >
                        Edit Alert
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="admin" className="space-y-6">
                <div className="space-y-6">
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-6 py-3">
                      <h3 className="font-medium">New Agent Joined</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">New Agent Notification</h4>
                          <p className="text-sm text-muted-foreground">
                            Notify admins when a new agent joins the workspace
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="new-agent-notification"
                            checked={
                              alertSettings?.admin_notifications?.new_agent_joined?.is_enabled
                            }
                            onCheckedChange={() =>
                              handleToggleAlert(
                                'new_agent_joined',
                                alertSettings?.admin_notifications?.new_agent_joined?.is_enabled
                              )
                            }
                          />
                          <Label htmlFor="new-agent-notification">
                            {alertSettings?.admin_notifications?.new_agent_joined?.is_enabled
                              ? 'Enabled'
                              : 'Disabled'}
                          </Label>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="email-channel" className="text-sm">
                            Channels:
                          </Label>
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                alertSettings?.admin_notifications?.new_agent_joined?.channels.includes(
                                  'email'
                                )
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              Email
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                alertSettings?.admin_notifications?.new_agent_joined?.channels.includes(
                                  'in_app'
                                )
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              In-App
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-md mb-4">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html:
                              alertSettings?.admin_notifications?.new_agent_joined?.template || '',
                          }}
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          handleEditNotification(
                            'new_agent_joined',
                            alertSettings?.admin_notifications?.new_agent_joined
                          )
                        }
                      >
                        Edit Notification
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-6 py-3">
                      <h3 className="font-medium">High Ticket Volume</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">High Ticket Volume Alert</h4>
                          <p className="text-sm text-muted-foreground">
                            Notify admins when ticket volume exceeds the threshold
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="high-volume-notification"
                            checked={
                              alertSettings?.admin_notifications?.high_ticket_volume?.is_enabled
                            }
                            onCheckedChange={() =>
                              handleToggleAlert(
                                'high_ticket_volume',
                                alertSettings?.admin_notifications?.high_ticket_volume?.is_enabled
                              )
                            }
                          />
                          <Label htmlFor="high-volume-notification">
                            {alertSettings?.admin_notifications?.high_ticket_volume?.is_enabled
                              ? 'Enabled'
                              : 'Disabled'}
                          </Label>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="threshold" className="text-sm">
                            Threshold:
                          </Label>
                          <span className="text-sm">
                            {alertSettings?.admin_notifications?.high_ticket_volume?.threshold}{' '}
                            tickets per hour
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="email-channel" className="text-sm">
                            Channels:
                          </Label>
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                alertSettings?.admin_notifications?.high_ticket_volume?.channels.includes(
                                  'email'
                                )
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              Email
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                alertSettings?.admin_notifications?.high_ticket_volume?.channels.includes(
                                  'in_app'
                                )
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              In-App
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-md mb-4">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html:
                              alertSettings?.admin_notifications?.high_ticket_volume?.template ||
                              '',
                          }}
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          handleEditNotification(
                            'high_ticket_volume',
                            alertSettings?.admin_notifications?.high_ticket_volume
                          )
                        }
                      >
                        Edit Notification
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-6 py-3">
                      <h3 className="font-medium">System Update</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-medium">System Update Notification</h4>
                          <p className="text-sm text-muted-foreground">
                            Notify admins about scheduled system updates
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="system-update-notification"
                            checked={alertSettings?.admin_notifications?.system_update?.is_enabled}
                            onCheckedChange={() =>
                              handleToggleAlert(
                                'system_update',
                                alertSettings?.admin_notifications?.system_update?.is_enabled
                              )
                            }
                          />
                          <Label htmlFor="system-update-notification">
                            {alertSettings?.admin_notifications?.system_update?.is_enabled
                              ? 'Enabled'
                              : 'Disabled'}
                          </Label>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="email-channel" className="text-sm">
                            Channels:
                          </Label>
                          <div className="flex items-center gap-1">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                alertSettings?.admin_notifications?.system_update?.channels.includes(
                                  'email'
                                )
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              Email
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                alertSettings?.admin_notifications?.system_update?.channels.includes(
                                  'in_app'
                                )
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              In-App
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-muted p-4 rounded-md mb-4">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html:
                              alertSettings?.admin_notifications?.system_update?.template || '',
                          }}
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          handleEditNotification(
                            'system_update',
                            alertSettings?.admin_notifications?.system_update
                          )
                        }
                      >
                        Edit Notification
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {currentAlert && 'template' in currentAlert
                      ? 'Edit Admin Notification'
                      : 'Edit System Alert'}
                </DialogTitle>
                <DialogDescription>
                  {currentAlert && 'template' in currentAlert
                      ? 'Configure how administrators are notified about important events.'
                      : 'Configure how system alerts are displayed to users.'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {currentAlert && 'template' in currentAlert ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Notification Channels</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="email-channel"
                            checked={emailChannel}
                            onCheckedChange={setEmailChannel}
                          />
                          <Label htmlFor="email-channel">Email</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="in-app-channel"
                            checked={inAppChannel}
                            onCheckedChange={setInAppChannel}
                          />
                          <Label htmlFor="in-app-channel">In-App</Label>
                        </div>
                      </div>
                    </div>

                    {currentAlert?.key === 'high_ticket_volume' && (
                      <div>
                        <Label htmlFor="threshold" className="mb-2 block">
                          Ticket Threshold (per hour)
                        </Label>
                        <Input
                          id="threshold"
                          type="number"
                          min="1"
                          value={thresholdValue}
                          onChange={e => setThresholdValue(e.target.value)}
                          className="max-w-xs"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="mb-2 block">Notification Template</Label>
                      <RichTextEditor
                        content={currentTemplate}
                        onChange={setCurrentTemplate}
                        placeholder="Enter notification content..."
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Available placeholders: [Agent Name], [Ticket Count], [Update Date]
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="alert-message" className="mb-2 block">
                        Alert Message
                      </Label>
                      <Input
                        id="alert-message"
                        value={alertMessage}
                        onChange={e => setAlertMessage(e.target.value)}
                        placeholder="Enter alert message"
                      />
                    </div>

                    <div>
                      <Label htmlFor="alert-severity" className="mb-2 block">
                        Severity
                      </Label>
                      <Select value={alertSeverity} onValueChange={setAlertSeverity}>
                        <SelectTrigger id="alert-severity">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="display-type" className="mb-2 block">
                        Display Type
                      </Label>
                      <Select value={alertDisplayType} onValueChange={setAlertDisplayType}>
                        <SelectTrigger id="display-type">
                          <SelectValue placeholder="Select display type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="banner">Banner</SelectItem>
                          <SelectItem value="modal">Modal</SelectItem>
                          <SelectItem value="notification">Notification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={
                    currentAlert && 'template' in currentAlert
                        ? handleSaveNotification
                        : handleSaveAlert
                  }
                  disabled={updateAlertMutation.isPending || updateNotificationMutation.isPending}
                >
                  {updateAlertMutation.isPending || updateNotificationMutation.isPending
                    ? 'Saving...'
                    : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
