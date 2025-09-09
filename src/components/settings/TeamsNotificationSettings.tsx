import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Bell, 
  MessageSquare, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Link,
  TestTube 
} from 'lucide-react';

interface TeamsAppConfig {
  id?: number;
  app_id: string;
  app_secret: string;
  is_active: boolean;
}

interface AgentTeamsSettings {
  teams_notifications_enabled: boolean;
  teams_app_installation_id?: string;
  teams_tenant_id?: string;
}

interface TeamsNotificationHistory {
  id: number;
  notification_type: string;
  activity_type: string;
  preview_text: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

const TeamsNotificationSettings: React.FC = () => {
  const [appConfig, setAppConfig] = useState<TeamsAppConfig | null>(null);
  const [agentSettings, setAgentSettings] = useState<AgentTeamsSettings>({
    teams_notifications_enabled: false
  });
  const [notificationHistory, setNotificationHistory] = useState<TeamsNotificationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showAppConfig, setShowAppConfig] = useState(false);
  const [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);
  const [checkingMicrosoftConnection, setCheckingMicrosoftConnection] = useState(true);

  useEffect(() => {
    loadTeamsConfiguration();
    loadAgentSettings();
    loadNotificationHistory();
    checkMicrosoftConnection();
  }, []);

  const checkMicrosoftConnection = async () => {
    setCheckingMicrosoftConnection(true);
    try {
      const response = await fetch('/api/v1/microsoft/auth/status');
      if (response.ok) {
        const status = await response.json();
        console.log('Microsoft status response:', status);
        setIsMicrosoftConnected(status.is_connected || false);
      } else {
        console.error('Failed to check Microsoft status:', response.status, response.statusText);
        setIsMicrosoftConnected(false);
      }
    } catch (error) {
      console.error('Error checking Microsoft connection:', error);
      setIsMicrosoftConnected(false);
    } finally {
      setCheckingMicrosoftConnection(false);
    }
  };

  const loadTeamsConfiguration = async () => {
    try {
      const response = await fetch('/api/v1/teams-notifications/app-config');
      if (response.ok) {
        const config = await response.json();
        setAppConfig(config);
      }
    } catch (error) {
      console.error('Error loading Teams app configuration:', error);
    }
  };

  const loadAgentSettings = async () => {
    try {
      const response = await fetch('/api/v1/teams-notifications/settings');
      if (response.ok) {
        const settings = await response.json();
        setAgentSettings(settings);
      }
    } catch (error) {
      console.error('Error loading agent Teams settings:', error);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      const response = await fetch('/api/v1/teams-notifications/notifications/history?limit=20');
      if (response.ok) {
        const history = await response.json();
        setNotificationHistory(history);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  };

  const saveAppConfiguration = async (config: TeamsAppConfig) => {
    setIsLoading(true);
    try {
      const method = appConfig ? 'PUT' : 'POST';
      const response = await fetch('/api/v1/teams-notifications/app-config', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const savedConfig = await response.json();
        setAppConfig(savedConfig);
        toast.success('Teams app configuration saved successfully');
        setShowAppConfig(false);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save configuration');
      }
    } catch {
      toast.error('Error saving Teams app configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAgentSettings = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/teams-notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teams_notifications_enabled: enabled,
        }),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setAgentSettings(updatedSettings);
        toast.success(`Teams notifications ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update settings');
      }
    } catch {
      toast.error('Error updating Teams settings');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/v1/teams-notifications/test-connection');
      const result = await response.json();

      if (result.success) {
        toast.success('Test notification sent successfully!');
      } else {
        toast.error(result.message || 'Connection test failed');
      }
    } catch {
      toast.error('Error testing connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <MessageSquare className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold">Microsoft Teams Notifications</h1>
          <p className="text-gray-600">Configure and manage Teams activity notifications</p>
        </div>
      </div>

      {/* Microsoft 365 Connection Status */}
      {checkingMicrosoftConnection ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Checking Microsoft 365 connection status...
          </AlertDescription>
        </Alert>
      ) : !isMicrosoftConnected ? (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Microsoft 365 account not connected.</strong> You need to connect your Microsoft 365 account first to enable Teams notifications. 
            <br />
            Please go to <strong>Integrations → Microsoft 365</strong> to connect your account.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Microsoft 365 account is connected and ready for Teams notifications.
          </AlertDescription>
        </Alert>
      )}

      {/* App Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Teams App Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure the Microsoft Teams app for your workspace
              </CardDescription>
            </div>
            {appConfig ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!appConfig && !showAppConfig ? (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                Teams app is not configured for this workspace.
              </p>
              <Button onClick={() => setShowAppConfig(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configure Teams App
              </Button>
            </div>
          ) : showAppConfig ? (
            <TeamsAppConfigForm
              config={appConfig}
              onSave={saveAppConfiguration}
              onCancel={() => setShowAppConfig(false)}
              isLoading={isLoading}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">App ID</Label>
                  <p className="text-sm text-gray-600 font-mono">
                    {appConfig?.app_id?.substring(0, 8)}...
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm">
                    {appConfig?.is_active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-red-600">Inactive</span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAppConfig(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Configuration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Your Notification Settings</span>
          </CardTitle>
          <CardDescription>
            Control your personal Teams notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="teams-notifications">Enable Teams Notifications</Label>
                <p className="text-sm text-gray-600">
                  Receive helpdesk notifications in Microsoft Teams
                </p>
                {!isMicrosoftConnected && (
                  <p className="text-sm text-yellow-600">
                    Connect your Microsoft 365 account first to enable this feature
                  </p>
                )}
              </div>
              <Switch
                id="teams-notifications"
                checked={agentSettings.teams_notifications_enabled}
                onCheckedChange={updateAgentSettings}
                disabled={!appConfig || isLoading || !isMicrosoftConnected}
              />
            </div>

            {agentSettings.teams_notifications_enabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notification Types</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">New Ticket Created</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Ticket Assigned</span>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-orange-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm">New Response</span>
                    </div>
                  </div>
                </div>

                <Separator />
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={isTestingConnection || !isMicrosoftConnected}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {isTestingConnection ? 'Testing...' : 'Test Connection'}
                  </Button>
                </div>
              </>
            )}

            {!appConfig && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Teams app must be configured before enabling notifications.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification History Card */}
      {agentSettings.teams_notifications_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              View your recent Teams notification history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notificationHistory.length > 0 ? (
              <div className="space-y-3">
                {notificationHistory.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {notification.notification_type.replace('_', ' ')}
                        </span>
                        {getStatusBadge(notification.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {notification.preview_text}
                      </p>
                      {notification.error_message && (
                        <p className="text-xs text-red-600">
                          {notification.error_message}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {notification.sent_at
                        ? formatDate(notification.sent_at)
                        : formatDate(notification.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-600">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications sent yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface TeamsAppConfigFormProps {
  config: TeamsAppConfig | null;
  onSave: (config: TeamsAppConfig) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const TeamsAppConfigForm: React.FC<TeamsAppConfigFormProps> = ({
  config,
  onSave,
  onCancel,
  isLoading,
}) => {
  const [formData, setFormData] = useState<TeamsAppConfig>({
    app_id: config?.app_id || '',
    app_secret: config?.app_secret || '',
    is_active: config?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Link className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> You need to create a Microsoft Teams app in Azure AD first.
          <a
            href="https://docs.microsoft.com/en-us/graph/teams-send-activityfeednotifications"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline ml-1"
          >
            Learn how to set this up
          </a>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="app_id">Teams App ID</Label>
        <Input
          id="app_id"
          value={formData.app_id}
          onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          required
        />
        <p className="text-xs text-gray-600">
          The Application (client) ID from your Azure AD app registration
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="app_secret">App Secret</Label>
        <Input
          id="app_secret"
          type="password"
          value={formData.app_secret}
          onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
          placeholder="Enter app secret"
          required
        />
        <p className="text-xs text-gray-600">
          A client secret from your Azure AD app registration
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Enable Teams App</Label>
      </div>

      <div className="flex space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default TeamsNotificationSettings;
