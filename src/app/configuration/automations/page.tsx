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
import { Terminal, Info, AlertCircle, Plus, Clock, Trash2, Edit, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AutomationModalMui from '@/components/modals/AutomationModalMui';
import {
  getAutomations,
  deleteAutomation,
  toggleAutomation,
  runAutomation,
  type Automation,
} from '@/services/automations';

export default function AutomationsConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
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

  const handleEdit = (automation: Automation) => {
    setSelectedAutomation(automation);
    setIsModalOpen(true);
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
    setSelectedAutomation(null);
    }, 100);
  };

  const handleOpenCreateModal = () => {
    setSelectedAutomation(null);
    setIsModalOpen(true);
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
            <Button 
              variant="default" 
              className="ml-auto flex items-center gap-2"
              onClick={handleOpenCreateModal}
            >
              <Plus size={16} /> New Automation
                </Button>
            <AutomationModalMui
              open={isModalOpen}
              onClose={handleCloseModal}
              automationToEdit={selectedAutomation}
              workspaceId={workspaceId}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Sobre las Automatizaciones</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Las automatizaciones te permiten programar correos electrónicos recurrentes.
              </p>
              <p>
                Puedes usar marcadores en tus plantillas que serán reemplazados automáticamente con datos reales.
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
              <Button onClick={handleOpenCreateModal} variant="outline">
                Create your first automation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
