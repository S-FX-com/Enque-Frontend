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
import { Terminal, Info, AlertCircle, Plus, ArrowRight, Trash2, Edit, Copy, X } from 'lucide-react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  toggleWorkflow,
  duplicateWorkflow,
  getWorkflowTriggers,
  getWorkflowActions,
  type Workflow,
  type WorkflowTrigger,
  type WorkflowAction,
  type MessageAnalysisRule,
} from '@/services/workflows';

export default function WorkflowsConfigPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isLoadingAuthUser } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowTrigger, setWorkflowTrigger] = useState('');
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);
  const [messageAnalysisRules, setMessageAnalysisRules] = useState<MessageAnalysisRule>({
    keywords: [],
    exclude_keywords: [],
    sentiment_threshold: 0.3,
    urgency_keywords: [
      'urgent', 'asap', 'emergency', 'critical', 'immediately', 'now', 'right now',
      'crisis', 'disaster', 'broken', 'down', 'not working', 'stopped working',
      'deadline', 'due today', 'overdue', 'time sensitive', 'priority', 'important'
    ],
    language: 'en',
    min_confidence: 0.7,
  });
  const [activeTab, setActiveTab] = useState('active');
  const [modalTab, setModalTab] = useState('basic');

  const currentUserRole = user?.role;
  const workspaceId = user?.workspace_id;

  const {
    data: workflows,
    isLoading: isLoadingWorkflows,
    isError: isWorkflowsError,
    error: workflowsError,
  } = useQuery({
    queryKey: ['workflows', workspaceId],
    queryFn: () => getWorkflows(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: triggers } = useQuery({
    queryKey: ['workflowTriggers', workspaceId],
    queryFn: () => getWorkflowTriggers(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30 * 60 * 1000,
  });

  const { data: actionOptions } = useQuery({
    queryKey: ['workflowActions', workspaceId],
    queryFn: () => getWorkflowActions(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30 * 60 * 1000,
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (
      workflow: Omit<Workflow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
    ) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return createWorkflow(workspaceId, workflow);
    },
    onSuccess: () => {
      toast.success('Workflow created successfully!');
      queryClient.invalidateQueries({ queryKey: ['workflows', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Failed to create workflow:', error);
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async (
      workflow: { id: number } & Omit<Workflow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
    ) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      const { id, ...updateData } = workflow;
      return updateWorkflow(workspaceId, id, updateData);
    },
    onSuccess: () => {
      toast.success('Workflow updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['workflows', workspaceId] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      console.error('Failed to update workflow:', error);
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return deleteWorkflow(workspaceId, id);
    },
    onSuccess: () => {
      toast.success('Workflow deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['workflows', workspaceId] });
    },
    onError: error => {
      console.error('Failed to delete workflow:', error);
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });

  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return toggleWorkflow(workspaceId, id, enabled);
    },
    onSuccess: () => {
      toast.success('Workflow status updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['workflows', workspaceId] });
    },
    onError: error => {
      console.error('Failed to toggle workflow:', error);
      toast.error(`Failed to toggle workflow: ${error.message}`);
    },
  });

  const duplicateWorkflowMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return duplicateWorkflow(workspaceId, id);
    },
    onSuccess: () => {
      toast.success('Workflow duplicated successfully!');
      queryClient.invalidateQueries({ queryKey: ['workflows', workspaceId] });
    },
    onError: error => {
      console.error('Failed to duplicate workflow:', error);
      toast.error(`Failed to duplicate workflow: ${error.message}`);
    },
  });

  const handleCreateOrUpdate = () => {
    if (workflowName.trim() === '') {
      toast.error('Workflow name cannot be empty');
      return;
    }

    if (workflowTrigger === '') {
      toast.error('You must select a trigger event');
      return;
    }

    if (workflowActions.length === 0) {
      toast.error('You must add at least one action');
      return;
    }

    const commonWorkflowData = {
      name: workflowName,
      description: workflowDescription,
      is_enabled: selectedWorkflow?.is_enabled || false,
      trigger: workflowTrigger,
      conditions: [],
      actions: workflowActions,
      message_analysis_rules: isContentBasedTrigger(workflowTrigger) ? messageAnalysisRules : undefined,
    };

    if (selectedWorkflow && selectedWorkflow.id) {
      updateWorkflowMutation.mutate({
        id: selectedWorkflow.id,
        ...commonWorkflowData,
      });
    } else {
      createWorkflowMutation.mutate(commonWorkflowData);
    }
  };

  const handleEdit = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setWorkflowName(workflow.name);
    setWorkflowDescription(workflow.description || '');
    setWorkflowTrigger(workflow.trigger);
    setWorkflowActions(workflow.actions || []);
    if (workflow.message_analysis_rules) {
      setMessageAnalysisRules(workflow.message_analysis_rules);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      deleteWorkflowMutation.mutate(id);
    }
  };

  const handleToggle = (id: number, currentStatus: boolean) => {
    toggleWorkflowMutation.mutate({
      id,
      enabled: !currentStatus,
    });
  };

  const handleDuplicate = (id: number) => {
    duplicateWorkflowMutation.mutate(id);
  };

  const resetForm = () => {
    setSelectedWorkflow(null);
    setWorkflowName('');
    setWorkflowDescription('');
    setWorkflowTrigger('');
    setWorkflowActions([]);
    setMessageAnalysisRules({
      keywords: [],
      exclude_keywords: [],
      sentiment_threshold: 0.3,
      urgency_keywords: [
        'urgent', 'asap', 'emergency', 'critical', 'immediately', 'now', 'right now',
        'crisis', 'disaster', 'broken', 'down', 'not working', 'stopped working',
        'deadline', 'due today', 'overdue', 'time sensitive', 'priority', 'important'
      ],
      language: 'en',
      min_confidence: 0.7,
    });
    setModalTab('basic');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const isContentBasedTrigger = (trigger: string) => {
    return trigger.startsWith('message.');
  };

  const addAction = () => {
    setWorkflowActions([
      ...workflowActions,
      { type: '', config: {} },
    ]);
  };

  const updateAction = (index: number, field: keyof WorkflowAction, value: string | Record<string, unknown>) => {
    const updated = [...workflowActions];
    updated[index] = { ...updated[index], [field]: value };
    setWorkflowActions(updated);
  };

  const removeAction = (index: number) => {
    setWorkflowActions(workflowActions.filter((_, i) => i !== index));
  };

  const updateActionConfig = (index: number, configKey: string, configValue: string | number | boolean) => {
    const updated = [...workflowActions];
    updated[index] = {
      ...updated[index],
      config: { ...updated[index].config, [configKey]: configValue },
    };
    setWorkflowActions(updated);
  };

  const getFilteredWorkflows = () => {
    if (!workflows) return [];
    return workflows.filter(workflow =>
      activeTab === 'active' ? workflow.is_enabled : !workflow.is_enabled
    );
  };

  const getTriggerLabel = (trigger: string) => {
    return triggers?.find(t => t.value === trigger)?.label || trigger;
  };

  const getActionLabel = (actionType: string) => {
    return actionOptions?.find(a => a.id === actionType)?.name || actionType;
  };

  const renderActionConfig = (action: WorkflowAction, index: number) => {
    const actionOption = actionOptions?.find(a => a.id === action.type);
    if (!actionOption) return null;

    const schema = actionOption.config_schema as { properties?: Record<string, { type?: string; enum?: string[]; description?: string }> };
    const properties = schema?.properties || {};

    return (
      <div className="mt-2 space-y-2 p-3 bg-gray-50 rounded">
        {Object.entries(properties).map(([key, property]) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs">{property.description || key}</Label>
            {property.type === 'string' && property.enum ? (
              <Select
                value={action.config[key] as string || ''}
                onValueChange={(value) => updateActionConfig(index, key, value)}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={`Select ${key}`} />
                </SelectTrigger>
                <SelectContent>
                  {property.enum.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : property.type === 'string' ? (
              <Input
                className="h-8"
                placeholder={property.description || `Enter ${key}`}
                value={action.config[key] as string || ''}
                onChange={(e) => updateActionConfig(index, key, e.target.value)}
              />
            ) : property.type === 'number' || property.type === 'integer' ? (
              <Input
                className="h-8"
                type="number"
                placeholder={property.description || `Enter ${key}`}
                value={action.config[key] as number || ''}
                onChange={(e) => updateActionConfig(index, key, Number(e.target.value))}
              />
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  if (currentUserRole !== 'admin') {
    return (
      <div className="container">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access the workflows settings.
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
              <CardTitle className="text-xl">Workflows</CardTitle>
              <CardDescription>Automate ticket handling with custom workflows</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedWorkflow ? 'Edit Workflow' : 'Create New Workflow'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedWorkflow
                      ? 'Update this workflow to automate your ticket handling process.'
                      : 'Create a new workflow to automate your ticket handling process.'}
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs value={modalTab} onValueChange={setModalTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4">
                    <TabsContent value="basic" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter a descriptive name"
                          value={workflowName}
                          onChange={e => setWorkflowName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                          id="description"
                          placeholder="Enter a brief description"
                          value={workflowDescription}
                          onChange={e => setWorkflowDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trigger">Trigger Event</Label>
                        <Select value={workflowTrigger} onValueChange={setWorkflowTrigger}>
                          <SelectTrigger id="trigger">
                            <SelectValue placeholder="Select a trigger event" />
                          </SelectTrigger>
                          <SelectContent>
                            {triggers?.map((trigger: WorkflowTrigger) => (
                              <SelectItem key={trigger.value} value={trigger.value}>
                                {trigger.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {triggers?.find(t => t.value === workflowTrigger)?.description && (
                          <p className="text-sm text-muted-foreground">
                            {triggers.find(t => t.value === workflowTrigger)?.description}
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Workflow Actions</Label>
                        <Button size="sm" onClick={addAction}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Action
                        </Button>
                      </div>
                      
                      {workflowActions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No actions configured. Add at least one action to define what happens when this workflow triggers.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {workflowActions.map((action, index) => (
                            <div key={index} className="p-3 border rounded space-y-2">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={action.type}
                                  onValueChange={(value) => updateAction(index, 'type', value)}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select an action" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {actionOptions?.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeAction(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {action.type && renderActionConfig(action, index)}
                              
                              {actionOptions?.find(a => a.id === action.type)?.description && (
                                <p className="text-xs text-muted-foreground">
                                  {actionOptions.find(a => a.id === action.type)?.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrUpdate}>
                    {createWorkflowMutation.isPending || updateWorkflowMutation.isPending
                      ? 'Saving...'
                      : selectedWorkflow
                        ? 'Update Workflow'
                        : 'Create Workflow'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>About Workflows</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Workflows help you automate repetitive tasks and standardize your support processes.
              </p>
              <p>
                Each workflow consists of a trigger event, optional conditions, and one or more
                actions to perform.
              </p>
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="active" className="mb-6" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="active">Active Workflows</TabsTrigger>
              <TabsTrigger value="inactive">Inactive Workflows</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoadingWorkflows || isLoadingAuthUser ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isWorkflowsError ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error Loading Workflows</AlertTitle>
              <AlertDescription>
                {workflowsError instanceof Error
                  ? workflowsError.message
                  : 'An unknown error occurred.'}
              </AlertDescription>
            </Alert>
          ) : getFilteredWorkflows().length > 0 ? (
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {getFilteredWorkflows().map(workflow => (
                  <AccordionItem key={workflow.id.toString()} value={workflow.id.toString()}>
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <Switch
                          id={`workflow-active-${workflow.id}`}
                          checked={workflow.is_enabled}
                          onCheckedChange={() => handleToggle(workflow.id, workflow.is_enabled)}
                          disabled={toggleWorkflowMutation.isPending}
                        />
                        <div>
                          <AccordionTrigger className="hover:no-underline py-0">
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{workflow.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {workflow.description}
                              </span>
                            </div>
                          </AccordionTrigger>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getTriggerLabel(workflow.trigger)}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            handleEdit(workflow);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            handleDuplicate(workflow.id);
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            handleDelete(workflow.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <AccordionContent>
                      <div className="pl-10 pt-2 pb-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Actions:</h4>
                            <div className="space-y-2">
                              {workflow.actions.map((action: WorkflowAction, index: number) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <ArrowRight className="h-3 w-3" />
                                  <span>{getActionLabel(action.type)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {activeTab === 'active'
                  ? 'No active workflows found'
                  : 'No inactive workflows found'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} variant="outline">
                Create your first workflow
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
