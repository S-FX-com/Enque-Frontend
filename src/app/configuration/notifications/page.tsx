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
import {
  Terminal,
  Info,
  AlertCircle,
  Mail,
  MessageSquare,
  Bell,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Mock service functions - replace with actual implementations
const getNotificationSettings = async (workspaceId: string) => {
  // Fetch notification settings from your API
  return {
    agents: {
      email: {
        new_ticket_created: {
          is_enabled: true,
          template: '<p>A new ticket has been created: [Ticket ID]</p>',
        },
        new_response: {
          is_enabled: true,
          template: '<p>New response on ticket: [Ticket ID]</p>',
        },
        ticket_assigned: {
          is_enabled: true,
          template: '<p>Ticket [Ticket ID] has been assigned to you</p>',
        },
      },
      enque_popup: {
        new_ticket_created: {
          is_enabled: true,
        },
        new_response: {
          is_enabled: true,
        },
        ticket_assigned: {
          is_enabled: true,
        },
      },
      teams: {
        is_enabled: false,
        is_connected: false,
      },
    },
    clients: {
      ticket_created: {
        is_enabled: true,
        template: '<p>Thank you for submitting your ticket. Your ticket ID is [Ticket ID].</p>',
      },
      ticket_resolved: {
        is_enabled: true,
        template: '<p>Your ticket [Ticket ID] has been resolved.</p>',
      },
    },
  };
};

const updateNotificationTemplate = async (workspaceId: string, path: string, template: string) => {
  // Update notification template via API
  return { success: true };
};

const toggleNotificationSetting = async (workspaceId: string, path: string, enabled: boolean) => {
  // Toggle notification setting via API
  return { success: true };
};

const connectTeams = async (workspaceId: string) => {
  // Connect Microsoft Teams via API
  return { success: true, is_connected: true };
};

export default function NotificationsConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState('');
  const [currentTemplatePath, setCurrentTemplatePath] = useState('');
  const [currentTemplateTitle, setCurrentTemplateTitle] = useState('');

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

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ path, template }: { path: string; template: string }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return updateNotificationTemplate(workspaceId, path, template);
    },
    onSuccess: () => {
      toast.success('Notification template updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', workspaceId] });
      setIsDialogOpen(false);
    },
    onError: error => {
      console.error('Failed to update notification template:', error);
      toast.error(`Failed to update template: ${error.message}`);
    },
  });

  const toggleSettingMutation = useMutation({
    mutationFn: async ({ path, enabled }: { path: string; enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return toggleNotificationSetting(workspaceId, path, enabled);
    },
    onSuccess: () => {
      toast.success('Notification setting updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle notification setting:', error);
      toast.error(`Failed to update setting: ${error.message}`);
    },
  });

  const connectTeamsMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return connectTeams(workspaceId);
    },
    onSuccess: () => {
      toast.success('Microsoft Teams connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', workspaceId] });
    },
    onError: error => {
      console.error('Failed to connect Microsoft Teams:', error);
      toast.error(`Failed to connect Teams: ${error.message}`);
    },
  });

  const handleEditTemplate = (path: string, template: string, title: string) => {
    setCurrentTemplatePath(path);
    setCurrentTemplate(template);
    setCurrentTemplateTitle(title);
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (currentTemplate.trim() === '') {
      toast.error('Template content cannot be empty');
      return;
    }

    updateTemplateMutation.mutate({
      path: currentTemplatePath,
      template: currentTemplate,
    });
  };

  const handleToggleSetting = (path: string, currentValue: boolean) => {
    toggleSettingMutation.mutate({
      path,
      enabled: !currentValue,
    });
  };

  const handleConnectTeams = () => {
    connectTeamsMutation.mutate();
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
                Configure how and when notifications are sent to your agents and clients. You can
                customize email templates and enable/disable different notification types.
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
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="email">
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Email Notifications</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pl-6">
                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <h4 className="font-medium">New Ticket Created</h4>
                            <p className="text-sm text-muted-foreground">
                              Notify agents when a new ticket is created
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleEditTemplate(
                                  'agents.email.new_ticket_created',
                                  notificationSettings.agents.email.new_ticket_created.template,
                                  'New Ticket Created'
                                )
                              }
                            >
                              Edit Template
                            </Button>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="new-ticket-email"
                                checked={
                                  notificationSettings.agents.email.new_ticket_created.is_enabled
                                }
                                onCheckedChange={() =>
                                  handleToggleSetting(
                                    'agents.email.new_ticket_created.is_enabled',
                                    notificationSettings.agents.email.new_ticket_created.is_enabled
                                  )
                                }
                              />
                              <Label htmlFor="new-ticket-email">
                                {notificationSettings.agents.email.new_ticket_created.is_enabled
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
                              Notify agents when there's a new response on a ticket
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleEditTemplate(
                                  'agents.email.new_response',
                                  notificationSettings.agents.email.new_response.template,
                                  'New Response'
                                )
                              }
                            >
                              Edit Template
                            </Button>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="new-response-email"
                                checked={notificationSettings.agents.email.new_response.is_enabled}
                                onCheckedChange={() =>
                                  handleToggleSetting(
                                    'agents.email.new_response.is_enabled',
                                    notificationSettings.agents.email.new_response.is_enabled
                                  )
                                }
                              />
                              <Label htmlFor="new-response-email">
                                {notificationSettings.agents.email.new_response.is_enabled
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleEditTemplate(
                                  'agents.email.ticket_assigned',
                                  notificationSettings.agents.email.ticket_assigned.template,
                                  'Ticket Assigned'
                                )
                              }
                            >
                              Edit Template
                            </Button>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="ticket-assigned-email"
                                checked={
                                  notificationSettings.agents.email.ticket_assigned.is_enabled
                                }
                                onCheckedChange={() =>
                                  handleToggleSetting(
                                    'agents.email.ticket_assigned.is_enabled',
                                    notificationSettings.agents.email.ticket_assigned.is_enabled
                                  )
                                }
                              />
                              <Label htmlFor="ticket-assigned-email">
                                {notificationSettings.agents.email.ticket_assigned.is_enabled
                                  ? 'Enabled'
                                  : 'Disabled'}
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="popup">
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <span>Enque Notifications (Pop-up)</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pl-6">
                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <h4 className="font-medium">New Ticket Created</h4>
                            <p className="text-sm text-muted-foreground">
                              Show a pop-up notification when a new ticket is created
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="new-ticket-popup"
                              checked={
                                notificationSettings.agents.enque_popup.new_ticket_created
                                  .is_enabled
                              }
                              onCheckedChange={() =>
                                handleToggleSetting(
                                  'agents.enque_popup.new_ticket_created.is_enabled',
                                  notificationSettings.agents.enque_popup.new_ticket_created
                                    .is_enabled
                                )
                              }
                            />
                            <Label htmlFor="new-ticket-popup">
                              {notificationSettings.agents.enque_popup.new_ticket_created.is_enabled
                                ? 'Enabled'
                                : 'Disabled'}
                            </Label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <h4 className="font-medium">New Response</h4>
                            <p className="text-sm text-muted-foreground">
                              Show a pop-up notification when there's a new response
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="new-response-popup"
                              checked={
                                notificationSettings.agents.enque_popup.new_response.is_enabled
                              }
                              onCheckedChange={() =>
                                handleToggleSetting(
                                  'agents.enque_popup.new_response.is_enabled',
                                  notificationSettings.agents.enque_popup.new_response.is_enabled
                                )
                              }
                            />
                            <Label htmlFor="new-response-popup">
                              {notificationSettings.agents.enque_popup.new_response.is_enabled
                                ? 'Enabled'
                                : 'Disabled'}
                            </Label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b">
                          <div>
                            <h4 className="font-medium">Ticket Assigned</h4>
                            <p className="text-sm text-muted-foreground">
                              Show a pop-up notification when a ticket is assigned
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="ticket-assigned-popup"
                              checked={
                                notificationSettings.agents.enque_popup.ticket_assigned.is_enabled
                              }
                              onCheckedChange={() =>
                                handleToggleSetting(
                                  'agents.enque_popup.ticket_assigned.is_enabled',
                                  notificationSettings.agents.enque_popup.ticket_assigned.is_enabled
                                )
                              }
                            />
                            <Label htmlFor="ticket-assigned-popup">
                              {notificationSettings.agents.enque_popup.ticket_assigned.is_enabled
                                ? 'Enabled'
                                : 'Disabled'}
                            </Label>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="teams">
                    <AccordionTrigger className="py-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Microsoft Teams Notifications</span>
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          Coming Soon
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pl-6">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Microsoft Teams Integration</AlertTitle>
                          <AlertDescription>
                            <p className="mb-2">
                              Connect your Microsoft Teams workspace to receive ticket notifications
                              directly in Teams.
                            </p>
                            <p>
                              This feature is coming soon and will be available in the next update.
                            </p>
                          </AlertDescription>
                        </Alert>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <h4 className="font-medium">Teams Integration Status</h4>
                            <p className="text-sm text-muted-foreground">
                              {notificationSettings.agents.teams.is_connected
                                ? 'Connected to Microsoft Teams'
                                : 'Not connected to Microsoft Teams'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <Button
                              variant="outline"
                              onClick={handleConnectTeams}
                              disabled={
                                connectTeamsMutation.isPending ||
                                notificationSettings.agents.teams.is_connected
                              }
                            >
                              {connectTeamsMutation.isPending
                                ? 'Connecting...'
                                : notificationSettings.agents.teams.is_connected
                                  ? 'Connected'
                                  : 'Connect Teams'}
                            </Button>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="teams-notifications"
                                checked={notificationSettings.agents.teams.is_enabled}
                                onCheckedChange={() =>
                                  handleToggleSetting(
                                    'agents.teams.is_enabled',
                                    notificationSettings.agents.teams.is_enabled
                                  )
                                }
                                disabled={!notificationSettings.agents.teams.is_connected}
                              />
                              <Label htmlFor="teams-notifications">
                                {notificationSettings.agents.teams.is_enabled
                                  ? 'Enabled'
                                  : 'Disabled'}
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
                          checked={notificationSettings.clients.ticket_created.is_enabled}
                          onCheckedChange={() =>
                            handleToggleSetting(
                              'clients.ticket_created.is_enabled',
                              notificationSettings.clients.ticket_created.is_enabled
                            )
                          }
                        />
                        <Label htmlFor="ticket-created-client">
                          {notificationSettings.clients.ticket_created.is_enabled
                            ? 'Active'
                            : 'Inactive'}
                        </Label>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-md mb-4">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: notificationSettings.clients.ticket_created.template,
                        }}
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={() =>
                        handleEditTemplate(
                          'clients.ticket_created',
                          notificationSettings.clients.ticket_created.template,
                          'Ticket Created Confirmation'
                        )
                      }
                    >
                      Edit Template
                    </Button>
                  </div>

                  <div className="border rounded-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">Ticket Resolved Confirmation</h3>
                        <p className="text-sm text-muted-foreground">
                          Email sent to clients when their ticket is resolved
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ticket-resolved-client"
                          checked={notificationSettings.clients.ticket_resolved.is_enabled}
                          onCheckedChange={() =>
                            handleToggleSetting(
                              'clients.ticket_resolved.is_enabled',
                              notificationSettings.clients.ticket_resolved.is_enabled
                            )
                          }
                        />
                        <Label htmlFor="ticket-resolved-client">
                          {notificationSettings.clients.ticket_resolved.is_enabled
                            ? 'Active'
                            : 'Inactive'}
                        </Label>
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-md mb-4">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: notificationSettings.clients.ticket_resolved.template,
                        }}
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={() =>
                        handleEditTemplate(
                          'clients.ticket_resolved',
                          notificationSettings.clients.ticket_resolved.template,
                          'Ticket Resolved Confirmation'
                        )
                      }
                    >
                      Edit Template
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit {currentTemplateTitle} Template</DialogTitle>
                <DialogDescription>
                  Customize the email template for {currentTemplateTitle.toLowerCase()}{' '}
                  notifications.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Template Content</Label>
                    <RichTextEditor
                      content={currentTemplate}
                      onChange={setCurrentTemplate}
                      placeholder="Enter template content..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Available placeholders: [Ticket ID], [Customer Name], [Agent Name], [Ticket
                      Subject]
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate} disabled={updateTemplateMutation.isPending}>
                  {updateTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
