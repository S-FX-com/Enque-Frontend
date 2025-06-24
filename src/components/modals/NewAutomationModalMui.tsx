'use client';

import React, { useState } from 'react';
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
  type SelectChangeEvent,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createAutomation } from '@/services/automation';
import { getAgents } from '@/services/agent';
import { getTeams } from '@/services/team';
import { getUsers } from '@/services/user';
import { getCompanies } from '@/services/company';
import { getCategories } from '@/services/category';
import {
  Automation,
  ConditionType,
  ConditionOperator,
  ActionType,
  AutomationConditionCreate,
  AutomationActionCreate,
} from '@/typescript/automation';
import { useAuth } from '@/hooks/use-auth';
interface NewAutomationModalMuiProps {
  open: boolean;
  onClose: () => void;
  onCreateSuccess?: (automation: Automation) => void;
}

export default function NewAutomationModalMui({
  open,
  onClose,
  onCreateSuccess,
}: NewAutomationModalMuiProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [name, setName] = useState('');
  const [conditions, setConditions] = useState<AutomationConditionCreate[]>([
    {
      condition_type: ConditionType.DESCRIPTION,
      condition_operator: ConditionOperator.EQL,
      condition_value: '',
    },
  ]);
  const [actions, setActions] = useState<AutomationActionCreate[]>([
    { action_type: ActionType.SET_AGENT, action_value: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  //Theme setting for modal
  //const [color, setColor] = useState<string>('');
  // Fetch agents, teams, users, companies and categories for dropdowns
  /*
  useEffect(() => {
    console.log(color);
    if (theme === 'dark') {
      setColor('#000000');
    } else {
      setColor('');
    }
  }, [theme, color]);
*/
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

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: open, // Only fetch when modal is open
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies(),
    enabled: open, // Only fetch when modal is open
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    enabled: open, // Only fetch when modal is open
  });

  const mutation = useMutation({
    mutationFn: async (data: {
      name: string;
      conditions: AutomationConditionCreate[];
      actions: AutomationActionCreate[];
    }) => {
      if (!currentUser?.workspace_id) {
        throw new Error('Workspace ID is missing. Cannot create automation.');
      }
      const payload = {
        name: data.name,
        workspace_id: currentUser.workspace_id,
        is_active: true,
        conditions: data.conditions,
        actions: data.actions,
      };
      return createAutomation(payload);
    },
    onSuccess: (createdAutomation: Automation) => {
      toast.success(`Workflow "${createdAutomation.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['automations'] });
      if (onCreateSuccess) {
        onCreateSuccess(createdAutomation);
      }
      handleCloseAndReset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
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

    mutation.mutate({ name, conditions, actions });
  };

  const handleCloseAndReset = () => {
    setName('');
    setConditions([
      {
        condition_type: ConditionType.DESCRIPTION,
        condition_operator: ConditionOperator.EQL,
        condition_value: '',
      },
    ]);
    setActions([{ action_type: ActionType.SET_AGENT, action_value: '' }]);
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
    value: string | ConditionType | ConditionOperator
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

  const renderConditionValueField = (condition: AutomationConditionCreate, index: number) => {
    switch (condition.condition_type) {
      case ConditionType.PRIORITY:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Priority</InputLabel>
            <Select
              value={condition.condition_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateCondition(index, 'condition_value', e.target.value)
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

      case ConditionType.USER:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select User</InputLabel>
            <Select
              value={condition.condition_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateCondition(index, 'condition_value', e.target.value)
              }
              label="Select User"
              required
            >
              {users.map(user => (
                <MenuItem key={user.id} value={user.email}>
                  {user.name} ({user.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ConditionType.AGENT:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Agent</InputLabel>
            <Select
              value={condition.condition_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateCondition(index, 'condition_value', e.target.value)
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

      case ConditionType.COMPANY:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Company</InputLabel>
            <Select
              value={condition.condition_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateCondition(index, 'condition_value', e.target.value)
              }
              label="Select Company"
              required
            >
              {companies.map(company => (
                <MenuItem key={company.id} value={company.name}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ConditionType.CATEGORY:
        return (
          <FormControl size="small" sx={{ flexGrow: 1 }}>
            <InputLabel>Select Category</InputLabel>
            <Select
              value={condition.condition_value || ''}
              onChange={(e: SelectChangeEvent) =>
                updateCondition(index, 'condition_value', e.target.value)
              }
              label="Select Category"
              required
            >
              {categories.map(category => (
                <MenuItem key={category.id} value={category.name}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      // For DESCRIPTION and NOTE, use regular text field
      default:
        return (
          <TextField
            size="small"
            label="Value"
            value={condition.condition_value || ''}
            onChange={e => updateCondition(index, 'condition_value', e.target.value)}
            sx={{ flexGrow: 1 }}
            required
          />
        );
    }
  };

  const conditionTypeLabels = {
    [ConditionType.DESCRIPTION]: 'Subject',
    [ConditionType.NOTE]: 'Note',
    [ConditionType.USER]: 'User',
    [ConditionType.AGENT]: 'Agent',
    [ConditionType.COMPANY]: 'Company',
    [ConditionType.PRIORITY]: 'Priority',
    [ConditionType.CATEGORY]: 'Category',
  };

  const conditionOperatorLabels = {
    [ConditionOperator.EQL]: 'Is',
    [ConditionOperator.NEQL]: 'Is not',
    [ConditionOperator.CON]: 'Contains',
    [ConditionOperator.NCON]: 'Does not contain',
  };

  const actionTypeLabels = {
    [ActionType.SET_AGENT]: 'Set Agent',
    [ActionType.SET_PRIORITY]: 'Set Priority',
    [ActionType.SET_STATUS]: 'Set Status',
    [ActionType.SET_TEAM]: 'Set Team',
  };
  return (
    <Dialog
      //style={{ color: color }}
      open={open}
      onClose={handleCloseAndReset}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Create New Workflow</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Set up rules to automatically perform actions when certain conditions are met.
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

          {conditions.map((condition, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
              <Typography variant="body2" sx={{ mt: 2, minWidth: 20 }}>
                If:
              </Typography>

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
                  value={condition.condition_operator || ConditionOperator.EQL}
                  onChange={(e: SelectChangeEvent) =>
                    updateCondition(
                      index,
                      'condition_operator',
                      e.target.value as ConditionOperator
                    )
                  }
                  label="Operator"
                >
                  {Object.entries(conditionOperatorLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {renderConditionValueField(condition, index)}

              <IconButton
                color="error"
                onClick={() => removeCondition(index)}
                disabled={conditions.length === 1}
                sx={{ mt: 0.5 }}
              >
                <Delete />
              </IconButton>
            </Box>
          ))}
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
          {mutation.isPending ? 'Creating...' : 'Create Workflow'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
