'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertCircle, Info, Settings, Mail, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { 
  getAutomationSettings, 
  toggleAutomationSetting
} from '@/services/automations';

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [updatingSettingId, setUpdatingSettingId] = useState<number | null>(null);

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: automationSettings,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    error: settingsError,
  } = useQuery({
    queryKey: ['automationSettings', workspaceId],
    queryFn: () => getAutomationSettings(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const toggleSettingMutation = useMutation({
    mutationFn: async ({ settingId, enabled }: { settingId: number; enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setUpdatingSettingId(settingId);
      return toggleAutomationSetting(workspaceId, settingId, enabled);
    },
    onSuccess: () => {
      setUpdatingSettingId(null);
      toast.success('Automation setting updated successfully');
    },
    onError: error => {
      console.error('Failed to toggle automation setting:', error);
      toast.error(`Failed to update setting: ${error.message}`);
      setUpdatingSettingId(null);
      queryClient.invalidateQueries({ queryKey: ['automationSettings', workspaceId] });
    },
  });

  const handleToggleSetting = (settingId: number, currentValue: boolean | undefined) => {
    if (updatingSettingId === settingId) {
      return;
    }

    const newValue = !(currentValue || false);

    // Optimistic update
    const optimisticSettings = JSON.parse(JSON.stringify(automationSettings));
    if (optimisticSettings && optimisticSettings.team_notifications.id === settingId) {
      optimisticSettings.team_notifications.is_enabled = newValue;
      queryClient.setQueryData(['automationSettings', workspaceId], optimisticSettings);
    }

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
            Only administrators can access the automation settings.
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
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Configure automated actions and notifications for your workspace
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Automations</AlertTitle>
            <AlertDescription>
              <p>
                Configure automated workflows and notifications that help streamline your support process.
                Enable or disable different automation features based on your team&apos;s needs.
              </p>
            </AlertDescription>
          </Alert>

          {isLoadingSettings || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isSettingsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Automation Settings</AlertTitle>
              <AlertDescription>
                {settingsError instanceof Error
                  ? settingsError.message
                  : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Team Notifications Card */}
              <Card className="border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <CardTitle className="text-lg">Team Notifications</CardTitle>
                  </div>
                  <CardDescription>
                    Automated notifications sent to team members when tickets are assigned to their team
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">New Ticket for Your Team</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Send email notifications to all team members when a new ticket is assigned to their team
                            without a specific agent assigned. This helps ensure tickets don&apos;t go unnoticed.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="team-notifications-email"
                            checked={automationSettings?.team_notifications.is_enabled || false}
                            onCheckedChange={() =>
                              handleToggleSetting(
                                automationSettings?.team_notifications.id || 0,
                                automationSettings?.team_notifications.is_enabled
                              )
                            }
                            disabled={
                              updatingSettingId === (automationSettings?.team_notifications.id || 0)
                            }
                          />
                          <Label htmlFor="team-notifications-email" className="font-medium">
                            {automationSettings?.team_notifications.is_enabled ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Placeholder for future automations */}
              <Card className="border border-dashed">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">More Automations Coming Soon</h3>
                    <p className="text-muted-foreground">
                      We&apos;re working on additional automation features to help streamline your workflow.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 