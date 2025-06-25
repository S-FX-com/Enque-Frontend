'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Box,
  Typography,
  Divider,
  DialogContentText,
  FormControlLabel,
  Switch,
  type SelectChangeEvent,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateAutomation, getAutomationById } from '@/services/automation';
import { getAgents } from '@/services/agent';
import { getTeams } from '@/services/team';

import {
  Automation,
  ConditionType,
  ConditionOperator,
  LogicalOperator,
  ActionType,
  AutomationConditionCreate,
  AutomationActionCreate,
} from '@/typescript/automation';


interface EditAutomationModalMuiProps {
  open: boolean;
  onClose: () => void;
  automationId: number | null;
  onUpdateSuccess?: (automation: Automation) => void;
}

export default function EditAutomationModalMui({
  open,
  onClose,
  automationId,
  onUpdateSuccess,
}: EditAutomationModalMuiProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [conditionsOperator, setConditionsOperator] = useState<LogicalOperator>(LogicalOperator.AND);
  const [actionsOperator, setActionsOperator] = useState<LogicalOperator>(LogicalOperator.AND);
  const [conditions, setConditions] = useState<AutomationConditionCreate[]>([]);
  const [actions, setActions] = useState<AutomationActionCreate[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch automation data
  const { data: automation } = useQuery({
    queryKey: ['automation', automationId],
    queryFn: () => (automationId ? getAutomationById(automationId) : null),
    enabled: open && !!automationId,
  });

  // Fetch agents, teams, users, companies and categories for dropdowns
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    enabled: open, // Only fetch when modal is open
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams,
    enabled: open, // Only fetch when modal is open
  });



  // Initialize form with automation data
  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setIsActive(automation.is_active);
      setConditionsOperator(automation.conditions_operator || LogicalOperator.AND);
      setActionsOperator(automation.actions_operator || LogicalOperator.AND);
      setConditions(
        automation.conditions.map((condition) => ({
          condition_type: condition.condition_type,
          condition_operator: condition.condition_operator,
          condition_value: condition.condition_value,
        }))
      );
      setActions(
        automation.actions.map((action) => ({
          action_type: action.action_type,
          action_value: action.action_value,
        }))
      );
    }
  }, [automation]);

  const mutation = useMutation({
    mutationFn: async (data: {
      name: string;
      isActive: boolean;
      conditionsOperator: LogicalOperator;
      actionsOperator: LogicalOperator;
      conditions: AutomationConditionCreate[];
      actions: AutomationActionCreate[];
    }) => {
      if (!automationId) {
        throw new Error('Automation ID is missing. Cannot update automation.');
      }
      const payload = {
        name: data.name,
        is_active: data.isActive,
        conditions_operator: data.conditionsOperator,
        actions_operator: data.actionsOperator,
        conditions: data.conditions,
        actions: data.actions,
      };
      return updateAutomation(automationId, payload);
    },
    onSuccess: (updatedAutomation: Automation) => {
      toast.success(`Workflow "${updatedAutomation.name}" updated successfully`);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      queryClient.invalidateQueries({ queryKey: ['automation', automationId] });
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedAutomation);
      }
      handleCloseAndReset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
      setFormError(error.message);
    },
  });

  const handleSubmit = () => {
    setFormError(null);

    // Validación básica
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }

    if (conditions.length === 0) {
      setFormError('At least one condition is required');
      return;
    }

    if (actions.length === 0) {
      setFormError('At least one action is required');
      return;
    }

    // Validar que todas las condiciones tengan valores
    for (const condition of conditions) {
      if (!condition.condition_value?.trim()) {
        setFormError('All conditions must have a value');
        return;
      }
    }

    // Validar que todas las acciones tengan valores
    for (const action of actions) {
      if (!action.action_value?.trim()) {
        setFormError('All actions must have a value');
        return;
      }
    }

    mutation.mutate({ name, isActive, conditionsOperator, actionsOperator, conditions, actions });
  };

  const handleCloseAndReset = () => {
    setName('');
    setIsActive(true);
    setConditionsOperator(LogicalOperator.AND);
    setActionsOperator(LogicalOperator.AND);
    setConditions([]);
    setActions([]);
    setFormError(null);
    onClose();
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        condition_type: ConditionType.DESCRIPTION,
        condition_operator: ConditionOperator.EQL,
        condition_value: '',
        logical_operator: LogicalOperator.AND,
      },
    ]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (
    index: number,
    field: keyof AutomationConditionCreate,
    value: string | ConditionType | ConditionOperator | LogicalOperator
  ) => {
    const newConditions = [...conditions];
    if (field === 'condition_type') {
      // Reset condition_value when condition_type changes
      newConditions[index] = {
        ...newConditions[index],
        condition_type: value as ConditionType,
        condition_value: '',
      };
    } else {
      newConditions[index] = { ...newConditions[index], [field]: value };
    }
    setConditions(newConditions);
  };

  const addAction = () => {
    setActions([...actions, { action_type: ActionType.SET_AGENT, action_value: '' }]);
  };

  const removeAction = (index: number) => {
    if (actions.length > 1) {
      setActions(actions.filter((_, i) => i !== index));
    }
  };

  const updateAction = (
    index: number,
    field: keyof AutomationActionCreate,
    value: string | ActionType
  ) => {
    const newActions = [...actions];
    if (field === 'action_type') {
      // Reset action_value when action_type changes
      newActions[index] = { action_type: value as ActionType, action_value: '' };
    } else {
      newActions[index] = { ...newActions[index], [field]: value };
    }
    setActions(newActions);
  };

  // Options for different action types
  const priorityOptions = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Critical', label: 'Critical' },
  ];

  const statusOptions = [
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Closed', label: 'Closed' },
    { value: 'On Hold', label: 'On Hold' },
  ];

  const renderActionValueField = (action: AutomationActionCreate, index: number) => {
    switch (action.action_type) {
      case ActionType.SET_AGENT:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Agent</InputLabel>
            <Select
              value={action.action_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateAction(index, 'action_value', e.target.value)
              }
              label="Select Agent"
              required
            >
              {agents.map(agent => (
                <MenuItem key={agent.id} value={agent.email}>
                  {agent.name} ({agent.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ActionType.SET_TEAM:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Team</InputLabel>
            <Select
              value={action.action_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateAction(index, 'action_value', e.target.value)
              }
              label="Select Team"
              required
            >
              {teams.map(team => (
                <MenuItem key={team.id} value={team.name}>
                  {team.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ActionType.SET_PRIORITY:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Priority</InputLabel>
            <Select
              value={action.action_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateAction(index, 'action_value', e.target.value)
              }
              label="Select Priority"
              required
            >
              {priorityOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ActionType.SET_STATUS:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Status</InputLabel>
            <Select
              value={action.action_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateAction(index, 'action_value', e.target.value)
              }
              label="Select Status"
              required
            >
              {statusOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      default:
        return (
          <TextField
            size="small"
            label="Value"
            value={action.action_value || ''}
            onChange={e => updateAction(index, 'action_value', e.target.value)}
            sx={{ flexGrow: 1 }}
            required
          />
        );
    }
  };



  const conditionTypeLabels = {
    [ConditionType.DESCRIPTION]: 'Subject',
    [ConditionType.TICKET_BODY]: 'Ticket Body',
    [ConditionType.USER]: 'User',
    [ConditionType.USER_DOMAIN]: 'User Domain',
    [ConditionType.INBOX]: 'Inbox',
    [ConditionType.AGENT]: 'Agent',
    [ConditionType.COMPANY]: 'Company',
    [ConditionType.PRIORITY]: 'Priority',
    [ConditionType.CATEGORY]: 'Category',
  };

  const actionTypeLabels = {
    [ActionType.SET_AGENT]: 'Set Agent',
    [ActionType.SET_PRIORITY]: 'Set Priority',
    [ActionType.SET_STATUS]: 'Set Status',
    [ActionType.SET_TEAM]: 'Set Team',
    [ActionType.SET_CATEGORY]: 'Set Category',
    [ActionType.ALSO_NOTIFY]: 'Also Notify',
  };

  return (
    <Dialog open={open} onClose={handleCloseAndReset} maxWidth="md" fullWidth>
      <DialogTitle>Edit Automation</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Modify rules to automatically perform actions when certain conditions are met.
        </DialogContentText>

        {/* Name Field */}
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          error={!!formError && !name.trim()}
          helperText={!!formError && !name.trim() ? 'Name is required' : ''}
          sx={{ mb: 2 }}
        />

        {/* Active/Inactive Switch */}
        <FormControlLabel
          control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
          label={isActive ? 'Active' : 'Inactive'}
          sx={{ mb: 3 }}
        />

        <Divider sx={{ my: 2 }} />

        {/* Conditions Section */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="h6" component="h3">
              Conditions
            </Typography>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={addCondition}>
              Add Condition
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
              If:
            </Typography>
            {conditions.map((condition, index) => (
              <Box key={index}>
                {/* Condition Row */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center',
                    mb: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Field</InputLabel>
                    <Select
                      value={condition.condition_type}
                      onChange={(e: SelectChangeEvent) =>
                        updateCondition(index, 'condition_type', e.target.value as ConditionType)
                      }
                      label="Field"
                    >
                      {Object.entries(conditionTypeLabels).map(([value, label]) => (
                        <MenuItem key={value} value={value}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Operator</InputLabel>
                    <Select
                      value={condition.condition_operator}
                      onChange={(e: SelectChangeEvent) =>
                        updateCondition(index, 'condition_operator', e.target.value)
                      }
                      label="Operator"
                    >
                      <MenuItem value={ConditionOperator.EQL}>Is</MenuItem>
                      <MenuItem value={ConditionOperator.NEQL}>Is not</MenuItem>
                      <MenuItem value={ConditionOperator.CON}>Contains</MenuItem>
                      <MenuItem value={ConditionOperator.NCON}>Does not contain</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    label="Value"
                    value={condition.condition_value || ''}
                    onChange={(e) =>
                      updateCondition(index, 'condition_value', e.target.value)
                    }
                    sx={{ minWidth: 150, flexGrow: 1 }}
                  />

                  <IconButton
                    onClick={() => removeCondition(index)}
                    disabled={conditions.length === 1}
                    size="small"
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </Box>

                {/* Logical Operator Selector - Show for all conditions except the last one */}
                {index < conditions.length - 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Logic</InputLabel>
                      <Select
                        value={condition.logical_operator || LogicalOperator.AND}
                        onChange={(e: SelectChangeEvent) =>
                          updateCondition(index, 'logical_operator', e.target.value as LogicalOperator)
                        }
                        label="Logic"
                      >
                        <MenuItem value={LogicalOperator.AND}>AND</MenuItem>
                        <MenuItem value={LogicalOperator.OR}>OR</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Actions Section */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="h6" component="h3">
              Actions
            </Typography>
            <Button variant="outlined" size="small" startIcon={<Add />} onClick={addAction}>
              Add Action
            </Button>
          </Box>

          {actions.map((action, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ mt: 2, minWidth: 30 }}>
                Then:
              </Typography>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Action</InputLabel>
                <Select
                  value={action.action_type}
                  onChange={(e: SelectChangeEvent) =>
                    updateAction(index, 'action_type', e.target.value as ActionType)
                  }
                  label="Action"
                >
                  {Object.entries(actionTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {renderActionValueField(action, index)}

              <IconButton
                color="error"
                onClick={() => removeAction(index)}
                disabled={actions.length === 1}
                sx={{ mt: 0.5 }}
              >
                <Delete />
              </IconButton>
            </Box>
          ))}
          {actions.length > 1 && (
            <Box sx={{ mt: 2 }}>
              <FormControl size="small" sx={{ minWidth: 300 }}>
                <InputLabel>Actions Logic</InputLabel>
                <Select
                  value={actionsOperator}
                  onChange={(e: SelectChangeEvent) =>
                    setActionsOperator(e.target.value as LogicalOperator)
                  }
                  label="Actions Logic"
                >
                  <MenuItem value={LogicalOperator.AND}>
                    AND (Execute all actions)
                  </MenuItem>
                  <MenuItem value={LogicalOperator.OR}>
                    OR (Execute first successful action only)
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>

        {formError && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {formError}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCloseAndReset} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating...' : 'Update Automation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
