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
import { Terminal, Info, AlertCircle, Plus, Clock, Trash2, Edit, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  runAutomation,
  type Automation,
} from '@/services/automations';

export default function AutomationsConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [automationName, setAutomationName] = useState('');
  const [automationDescription, setAutomationDescription] = useState('');
  const [automationType, setAutomationType] = useState('scheduled');
  const [frequency, setFrequency] = useState('weekly');
  const [day, setDay] = useState('monday');
  const [time, setTime] = useState('09:00');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: automations,
    isLoading: isLoadingAutomations,
    isError: isAutomationsError,
    error: automationsError,
  } = useQuery({
    queryKey: ['automations', workspaceId],
    queryFn: () => getAutomations(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const createAutomationMutation = useMutation({
    mutationFn: async (
      automation: Omit<Automation, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
    ) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return createAutomation(workspaceId, automation);
    },
    onSuccess: () => {
      toast.success('Automation created successfully!');
      queryClient.invalidateQueries({ queryKey: ['automations', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Failed to create automation:', error);
      toast.error(`Failed to create automation: ${error.message}`);
    },
  });

  const updateAutomationMutation = useMutation({
    mutationFn: async (automation: Automation) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      const { id, ...updateData } = automation;
      return updateAutomation(workspaceId, id, updateData);
    },
    onSuccess: () => {
      toast.success('Automation updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['automations', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Failed to update automation:', error);
      toast.error(`Failed to update automation: ${error.message}`);
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return deleteAutomation(workspaceId, id);
    },
    onSuccess: () => {
      toast.success('Automation deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['automations', workspaceId] });
    },
    onError: error => {
      console.error('Failed to delete automation:', error);
      toast.error(`Failed to delete automation: ${error.message}`);
    },
  });

  const toggleAutomationMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return toggleAutomation(workspaceId, id, enabled);
    },
    onSuccess: () => {
      toast.success('Automation status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['automations', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle automation:', error);
      toast.error(`Failed to toggle automation: ${error.message}`);
    },
  });

  const runAutomationMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return runAutomation(workspaceId, id);
    },
    onSuccess: data => {
      toast.success(data.message || 'Automation run successfully!');
    },
    onError: error => {
      console.error('Failed to run automation:', error);
      toast.error(`Failed to run automation: ${error.message}`);
    },
  });

  const handleCreateOrUpdate = () => {
    if (automationName.trim() === '') {
      toast.error('Automation name cannot be empty');
      return;
    }

    if (subject.trim() === '') {
      toast.error('Email subject cannot be empty');
      return;
    }

    if (content.trim() === '') {
      toast.error('Email content cannot be empty');
      return;
    }

    const automation = {
      id: selectedAutomation?.id,
      name: automationName,
      description: automationDescription,
      is_enabled: selectedAutomation?.is_enabled || false,
      type: automationType,
      schedule: {
        frequency,
        day,
        time,
      },
      template: {
        subject,
        content,
      },
      filters: selectedAutomation?.filters || {},
    };

    if (selectedAutomation) {
      updateAutomationMutation.mutate(automation);
    } else {
      createAutomationMutation.mutate(automation);
    }
  };

  const handleEdit = (automation: Automation) => {
    setSelectedAutomation(automation);
    setAutomationName(automation.name);
    setAutomationDescription(automation.description || '');
    setAutomationType(automation.type);
    setFrequency(automation.schedule.frequency);
    setDay(automation.schedule.day);
    setTime(automation.schedule.time);
    setSubject(automation.template.subject);
    setContent(automation.template.content);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this automation?')) {
      deleteAutomationMutation.mutate(id);
    }
  };

  const handleToggle = (id: number, currentStatus: boolean) => {
    toggleAutomationMutation.mutate({
      id,
      enabled: !currentStatus,
    });
  };

  const handleRun = (id: number) => {
    runAutomationMutation.mutate(id);
  };

  const resetForm = () => {
    setSelectedAutomation(null);
    setAutomationName('');
    setAutomationDescription('');
    setAutomationType('scheduled');
    setFrequency('weekly');
    setDay('monday');
    setTime('09:00');
    setSubject('');
    setContent('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const getFilteredAutomations = () => {
    if (!automations) return [];
    return automations.filter(automation =>
      activeTab === 'active' ? automation.is_enabled : !automation.is_enabled
    );
  };

  const getFrequencyLabel = (frequency: string, day: string) => {
    if (frequency === 'daily') return 'Daily';
    if (frequency === 'weekly') {
      const days: Record<string, string> = {
        monday: 'Every Monday',
        tuesday: 'Every Tuesday',
        wednesday: 'Every Wednesday',
        thursday: 'Every Thursday',
        friday: 'Every Friday',
        saturday: 'Every Saturday',
        sunday: 'Every Sunday',
      };
      return days[day] || 'Weekly';
    }
    if (frequency === 'monthly') return `Monthly (Day ${day})`;
    return frequency;
  };

  if (currentUserRole !== 'admin') {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access the automations settings.
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
              <CardTitle className="text-xl">Automations</CardTitle>
              <CardDescription>Schedule automated emails and notifications</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Automation
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedAutomation ? 'Edit Automation' : 'Create New Automation'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedAutomation
                      ? 'Update this automation to schedule emails and notifications.'
                      : 'Create a new automation to schedule emails and notifications.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter a descriptive name"
                      value={automationName}
                      onChange={e => setAutomationName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Enter a brief description"
                      value={automationDescription}
                      onChange={e => setAutomationDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Automation Type</Label>
                    <Select value={automationType} onValueChange={setAutomationType}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select automation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled Email</SelectItem>
                        <SelectItem value="notification">System Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 border rounded-md p-4">
                    <h4 className="font-medium">Schedule Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select value={frequency} onValueChange={setFrequency}>
                          <SelectTrigger id="frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {frequency === 'weekly' && (
                        <div className="space-y-2">
                          <Label htmlFor="day">Day of Week</Label>
                          <Select value={day} onValueChange={setDay}>
                            <SelectTrigger id="day">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monday">Monday</SelectItem>
                              <SelectItem value="tuesday">Tuesday</SelectItem>
                              <SelectItem value="wednesday">Wednesday</SelectItem>
                              <SelectItem value="thursday">Thursday</SelectItem>
                              <SelectItem value="friday">Friday</SelectItem>
                              <SelectItem value="saturday">Saturday</SelectItem>
                              <SelectItem value="sunday">Sunday</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {frequency === 'monthly' && (
                        <div className="space-y-2">
                          <Label htmlFor="day">Day of Month</Label>
                          <Select value={day} onValueChange={setDay}>
                            <SelectTrigger id="day">
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(28)].map((_, i) => (
                                <SelectItem key={i} value={(i + 1).toString()}>
                                  {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={time}
                          onChange={e => setTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border rounded-md p-4">
                    <h4 className="font-medium">Email Template</h4>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Enter email subject"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <RichTextEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Enter email content..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        You can use placeholders like [Customer Name], [Ticket ID], etc.
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrUpdate}>
                    {createAutomationMutation.isPending || updateAutomationMutation.isPending
                      ? 'Saving...'
                      : selectedAutomation
                        ? 'Update Automation'
                        : 'Create Automation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Automations</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Automations help you schedule recurring emails and notifications to customers and
                team members.
              </p>
              <p>
                You can use placeholders in your templates that will be automatically replaced with
                actual data.
              </p>
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="active" className="mb-6" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active Automations</TabsTrigger>
              <TabsTrigger value="inactive">Inactive Automations</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoadingAutomations || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isAutomationsError ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading Automations</AlertTitle>
              <AlertDescription>
                {automationsError instanceof Error
                  ? automationsError.message
                  : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : getFilteredAutomations().length > 0 ? (
            <div className="space-y-4">
              {getFilteredAutomations().map(automation => (
                <Card key={automation.id} className="overflow-hidden">
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <Switch
                        id={`automation-active-${automation.id}`}
                        checked={automation.is_enabled}
                        onCheckedChange={() => handleToggle(automation.id, automation.is_enabled)}
                        disabled={toggleAutomationMutation.isPending}
                      />
                      <div>
                        <h3 className="font-medium">{automation.name}</h3>
                        <p className="text-sm text-muted-foreground">{automation.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(automation)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(automation.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRun(automation.id)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Run Now
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {getFrequencyLabel(automation.schedule.frequency, automation.schedule.day)}{' '}
                        at {automation.schedule.time}
                      </span>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {automation.type === 'scheduled' ? 'Scheduled Email' : 'System Notification'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {activeTab === 'active'
                  ? 'No active automations found'
                  : 'No inactive automations found'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                Create your first automation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
