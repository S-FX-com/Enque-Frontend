'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AlertCircle, Info, Settings, Mail, Users, Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { 
  getAutomationSettings, 
  toggleAutomationSetting,
  toggleWeeklySummarySetting,
  toggleDailyOutstandingTasksSetting,
  toggleWeeklyManagerSummarySetting
} from '@/services/automations';

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [updatingSettingId, setUpdatingSettingId] = useState<number | null>(null);
  const [updatingWeeklySummary, setUpdatingWeeklySummary] = useState<boolean>(false);
  const [updatingDailyOutstanding, setUpdatingDailyOutstanding] = useState<boolean>(false);
  const [updatingWeeklyManagerSummary, setUpdatingWeeklyManagerSummary] = useState<boolean>(false);

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
    },
    onError: error => {
      console.error('Failed to toggle automation setting:', error);
      toast.error(`Failed to update setting: ${error.message}`);
      setUpdatingSettingId(null);
      queryClient.invalidateQueries({ queryKey: ['automationSettings', workspaceId] });
    },
  });

  const toggleWeeklySummaryMutation = useMutation({
    mutationFn: async ({ enabled }: { enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setUpdatingWeeklySummary(true);
      return toggleWeeklySummarySetting(workspaceId, enabled);
    },
    onSuccess: () => {
      setUpdatingWeeklySummary(false);
      queryClient.invalidateQueries({ queryKey: ['automationSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle weekly summary setting:', error);
      toast.error(`Failed to update weekly summary setting: ${error.message}`);
      setUpdatingWeeklySummary(false);
      queryClient.invalidateQueries({ queryKey: ['automationSettings', workspaceId] });
    },
  });
  const toggleDailyOutstandingMutation = useMutation({
    mutationFn: async ({ enabled }: { enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setUpdatingDailyOutstanding(true);
      return toggleDailyOutstandingTasksSetting(workspaceId, enabled);
    },
    onSuccess: () => {
      setUpdatingDailyOutstanding(false);
      queryClient.invalidateQueries({ queryKey: ['automationSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle daily outstanding tasks setting:', error);
      toast.error(`Failed to update daily outstanding tasks setting: ${error.message}`);
      setUpdatingDailyOutstanding(false);
      queryClient.invalidateQueries({ queryKey: ['automationSettings', workspaceId] });
    },
  });

  const toggleWeeklyManagerSummaryMutation = useMutation({
    mutationFn: async ({ enabled }: { enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      setUpdatingWeeklyManagerSummary(true);
      return toggleWeeklyManagerSummarySetting(workspaceId, enabled);
    },
    onSuccess: () => {
      setUpdatingWeeklyManagerSummary(false);
      queryClient.invalidateQueries({ queryKey: ['automationSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle weekly manager summary setting:', error);
      toast.error(`Failed to update weekly manager summary setting: ${error.message}`);
      setUpdatingWeeklyManagerSummary(false);
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
    if (optimisticSettings && optimisticSettings.team_notifications && optimisticSettings.team_notifications.id === settingId) {
      optimisticSettings.team_notifications.is_enabled = newValue;
      queryClient.setQueryData(['automationSettings', workspaceId], optimisticSettings);
    }

    toggleSettingMutation.mutate({
      settingId,
      enabled: newValue,
    });
  };

  const handleToggleWeeklySummary = (currentValue: boolean | undefined) => {
    if (updatingWeeklySummary) {
      return;
    }

    const newValue = !(currentValue || false);

    // Optimistic update
    const optimisticSettings = JSON.parse(JSON.stringify(automationSettings));
    if (optimisticSettings && optimisticSettings.weekly_agent_summary && optimisticSettings.weekly_agent_summary.id) {
      optimisticSettings.weekly_agent_summary.is_enabled = newValue;
      queryClient.setQueryData(['automationSettings', workspaceId], optimisticSettings);
    }

    toggleWeeklySummaryMutation.mutate({
      enabled: newValue,
    });
  };

  const handleToggleDailyOutstanding = (currentValue: boolean | undefined) => {
    if (updatingDailyOutstanding) {
      return;
    }

    const newValue = !(currentValue || false);
    const optimisticSettings = JSON.parse(JSON.stringify(automationSettings));
    if (optimisticSettings && optimisticSettings.daily_outstanding_tasks && optimisticSettings.daily_outstanding_tasks.id) {
      optimisticSettings.daily_outstanding_tasks.is_enabled = newValue;
      queryClient.setQueryData(['automationSettings', workspaceId], optimisticSettings);
    }

    toggleDailyOutstandingMutation.mutate({
      enabled: newValue,
    });
  };

  const handleToggleWeeklyManagerSummary = (currentValue: boolean | undefined) => {
    if (updatingWeeklyManagerSummary) {
      return;
    }

    const newValue = !(currentValue || false);
    const optimisticSettings = JSON.parse(JSON.stringify(automationSettings));
    if (optimisticSettings && optimisticSettings.weekly_manager_summary && optimisticSettings.weekly_manager_summary.id) {
      optimisticSettings.weekly_manager_summary.is_enabled = newValue;
      queryClient.setQueryData(['automationSettings', workspaceId], optimisticSettings);
    }

    toggleWeeklyManagerSummaryMutation.mutate({
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
                Manage automated actions and notifications for your workspace
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
                Manage automated workflows and notifications for your workspace.
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
          ) : !automationSettings ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Data Available</AlertTitle>
              <AlertDescription>
                Unable to load automation settings. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {/* Team Notifications Card */}
              {automationSettings.team_notifications && (
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
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="team-notifications-email"
                            checked={automationSettings.team_notifications.is_enabled || false}
                            onCheckedChange={() =>
                              handleToggleSetting(
                                automationSettings.team_notifications.id,
                                automationSettings.team_notifications.is_enabled
                              )
                            }
                            disabled={
                              updatingSettingId === automationSettings.team_notifications.id
                            }
                          />
                          <Label htmlFor="team-notifications-email" className="font-medium">
                            {automationSettings.team_notifications.is_enabled ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
              {/* Weekly Agent Summary Card */}
              {automationSettings.weekly_agent_summary && (
                <Card className="border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <CardTitle className="text-lg">Weekly Agent Summary</CardTitle>
                  </div>
                  <CardDescription>
                    Automated weekly summary emails sent to agents on Fridays at 3pm ET
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Weekly Summary for Agents</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Weekly email to agents with their closed tickets from the past week. Sent Fridays at 3pm ET.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="weekly-agent-summary"
                            checked={automationSettings.weekly_agent_summary.is_enabled || false}
                            onCheckedChange={() =>
                              handleToggleWeeklySummary(
                                automationSettings.weekly_agent_summary.is_enabled
                              )
                            }
                            disabled={updatingWeeklySummary}
                          />
                          <Label htmlFor="weekly-agent-summary" className="font-medium">
                            {automationSettings.weekly_agent_summary.is_enabled ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
              {automationSettings.daily_outstanding_tasks && (
                <Card className="border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <CardTitle className="text-lg">Daily Outstanding Tasks Report</CardTitle>
                  </div>
                  <CardDescription>
                    Automated daily report of outstanding tasks sent to agents at 7am ET
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Daily Outstanding Tasks for Agents</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Daily email to agents with all their assigned outstanding tasks. Sent every morning at 7am ET.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="daily-outstanding-tasks"
                            checked={automationSettings.daily_outstanding_tasks.is_enabled || false}
                            onCheckedChange={() =>
                              handleToggleDailyOutstanding(
                                automationSettings.daily_outstanding_tasks.is_enabled
                              )
                            }
                            disabled={updatingDailyOutstanding}
                          />
                          <Label htmlFor="daily-outstanding-tasks" className="font-medium">
                            {automationSettings.daily_outstanding_tasks.is_enabled ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}
              {automationSettings.weekly_manager_summary && (
                <Card className="border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <CardTitle className="text-lg">Weekly Manager Summary</CardTitle>
                  </div>
                  <CardDescription>
                    Automated weekly summary of team performance sent to team managers on Fridays at 4pm ET
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Weekly Team Summary for Managers</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Weekly email to team managers with their team&apos;s closed tickets from the past week. Sent Fridays at 4pm ET.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="weekly-manager-summary"
                            checked={automationSettings.weekly_manager_summary.is_enabled || false}
                            onCheckedChange={() =>
                              handleToggleWeeklyManagerSummary(
                                automationSettings.weekly_manager_summary.is_enabled
                              )
                            }
                            disabled={updatingWeeklyManagerSummary}
                          />
                          <Label htmlFor="weekly-manager-summary" className="font-medium">
                            {automationSettings.weekly_manager_summary.is_enabled ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 