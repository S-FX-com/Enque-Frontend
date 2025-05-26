'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
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
  CircularProgress,
  DialogContentText,
  FormHelperText,
  Box,
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  createAutomation, 
  updateAutomation, 
  type Automation 
} from '@/services/automations';
import { getAgents } from '@/services/agent';
import { RichTextEditor } from '@/components/tiptap/RichTextEditor';
import { toast } from 'sonner';

interface AutomationModalMuiProps {
  open: boolean;
  onClose: () => void;
  automationToEdit: Automation | null;
  workspaceId: number | undefined;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const AutomationModalMui: React.FC<AutomationModalMuiProps> = ({
  open,
  onClose,
  automationToEdit,
  workspaceId,
}) => {
  const queryClient = useQueryClient();
  const [automationName, setAutomationName] = useState('');
  const [automationDescription, setAutomationDescription] = useState('');
  const [automationType, setAutomationType] = useState('scheduled');
  const [frequency, setFrequency] = useState('weekly');
  const [day, setDay] = useState('monday');
  const [time, setTime] = useState('09:00');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Cargar agentes para el selector de destinatarios
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  useEffect(() => {
    if (open) {
      if (automationToEdit) {
        // Editing mode - fill form with existing data
        setAutomationName(automationToEdit.name);
        setAutomationDescription(automationToEdit.description || '');
        setAutomationType(automationToEdit.type);
        setFrequency(automationToEdit.schedule.frequency);
        setDay(automationToEdit.schedule.day || 'monday');
        setTime(automationToEdit.schedule.time);
        setSubject(automationToEdit.template.subject);
        setContent(automationToEdit.template.content);
        
        // Cargar destinatarios guardados
        if (automationToEdit.filters && automationToEdit.filters.recipients) {
          setSelectedAgentIds(automationToEdit.filters.recipients);
        } else {
          setSelectedAgentIds([]);
        }
      } else {
        // Creation mode - reset form
        resetForm();
      }
      setFormError(null);
    }
  }, [open, automationToEdit]);

  const createMutation = useMutation({
    mutationFn: async (automation: Omit<Automation, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return createAutomation(workspaceId, automation);
    },
    onSuccess: () => {
      toast.success('Automation created successfully!');
      queryClient.invalidateQueries({ queryKey: ['automations', workspaceId] });
      handleCloseAndReset();
    },
    onError: (error: Error) => {
      console.error('Failed to create automation:', error);
      setFormError(error.message || 'Failed to create automation');
      toast.error(`Failed to create automation: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { 
      id: number,
      automation: Omit<Automation, 'id' | 'workspace_id' | 'created_at' | 'updated_at'> 
    }) => {
      if (!workspaceId) throw new Error('Workspace ID is missing');
      return updateAutomation(workspaceId, data.id, data.automation);
    },
    onSuccess: () => {
      toast.success('Automation updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['automations', workspaceId] });
      handleCloseAndReset();
    },
    onError: (error: Error) => {
      console.error('Failed to update automation:', error);
      setFormError(error.message || 'Failed to update automation');
      toast.error(`Failed to update automation: ${error.message}`);
    },
  });

  const handleAgentChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setSelectedAgentIds(value);
  };

  const handleSubmit = () => {
    setFormError(null);
    
    // Validation
    if (automationName.trim() === '') {
      setFormError('Automation name cannot be empty');
      return;
    }

    if (subject.trim() === '') {
      setFormError('Email subject cannot be empty');
      return;
    }

    if (content.trim() === '') {
      setFormError('Email content cannot be empty');
      return;
    }

    if (selectedAgentIds.length === 0) {
      setFormError('At least one recipient is required');
      return;
    }

    const automationData = {
      name: automationName,
      description: automationDescription,
      is_enabled: automationToEdit?.is_enabled || false,
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
      filters: {
        recipients: selectedAgentIds,
      },
    };

    if (automationToEdit) {
      updateMutation.mutate({
        id: automationToEdit.id,
        automation: automationData,
      });
    } else {
      createMutation.mutate(automationData);
    }
  };

  const resetForm = () => {
    setAutomationName('');
    setAutomationDescription('');
    setAutomationType('scheduled');
    setFrequency('weekly');
    setDay('monday');
    setTime('09:00');
    setSubject('');
    setContent('');
    setSelectedAgentIds([]);
  };

  const handleCloseAndReset = () => {
    onClose();
    setTimeout(() => {
      resetForm();
      setFormError(null);
    }, 100);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog 
      open={open} 
      onClose={handleCloseAndReset}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: '1px solid #e0e0e0', 
        padding: '16px 24px',
        fontWeight: 600,
        color: '#1a1a1a'
      }}>
        {automationToEdit ? 'Edit Automation' : 'Create New Automation'}
      </DialogTitle>
      
      <DialogContent sx={{ padding: '24px' }}>
        {formError && (
          <DialogContentText color="error" sx={{ marginBottom: 2 }}>
            {formError}
          </DialogContentText>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Basic Information */}
          <TextField
            label="Name"
            fullWidth
            value={automationName}
            onChange={(e) => setAutomationName(e.target.value)}
            required
            disabled={isLoading}
            variant="outlined"
            helperText="Enter a descriptive name for this automation"
          />
          
          <TextField
            label="Description (Optional)"
            fullWidth
            value={automationDescription}
            onChange={(e) => setAutomationDescription(e.target.value)}
            disabled={isLoading}
            variant="outlined"
            multiline
            rows={2}
          />
          
          <FormControl fullWidth disabled={isLoading}>
            <InputLabel id="automation-type-label">Automation Type</InputLabel>
            <Select
              labelId="automation-type-label"
              value={automationType}
              onChange={(e) => setAutomationType(e.target.value)}
              label="Automation Type"
            >
              <MenuItem value="scheduled">Scheduled Email</MenuItem>
              <MenuItem value="notification">System Notification</MenuItem>
            </Select>
          </FormControl>

          {/* Recipients Selector */}
          <FormControl fullWidth disabled={isLoading}>
            <InputLabel id="recipients-label">Recipients</InputLabel>
            <Select
              labelId="recipients-label"
              id="recipients"
              multiple
              value={selectedAgentIds}
              onChange={handleAgentChange}
              input={<OutlinedInput label="Recipients" />}
              renderValue={(selected) => {
                const selectedNames = agents
                  .filter(agent => selected.includes(agent.id.toString()))
                  .map(agent => agent.name);
                return selectedNames.join(', ');
              }}
              MenuProps={MenuProps}
            >
              {agents.map((agent) => (
                <MenuItem key={agent.id} value={agent.id.toString()}>
                  <Checkbox checked={selectedAgentIds.indexOf(agent.id.toString()) > -1} />
                  <ListItemText primary={`${agent.name} (${agent.email})`} />
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>Select agents who will receive this email</FormHelperText>
          </FormControl>
          
          {/* Schedule Settings */}
          <Box sx={{ 
            border: '1px solid #e0e0e0', 
            borderRadius: '8px',
            padding: 3,
            bgcolor: '#f9f9f9'
          }}>
            <DialogContentText sx={{ fontWeight: 600, mb: 2 }}>
              Schedule Settings
            </DialogContentText>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <FormControl fullWidth disabled={isLoading}>
                <InputLabel id="frequency-label">Frequency</InputLabel>
                <Select
                  labelId="frequency-label"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  label="Frequency"
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
              
              {frequency === 'weekly' && (
                <FormControl fullWidth disabled={isLoading}>
                  <InputLabel id="day-label">Day of Week</InputLabel>
                  <Select
                    labelId="day-label"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    label="Day of Week"
                  >
                    <MenuItem value="monday">Monday</MenuItem>
                    <MenuItem value="tuesday">Tuesday</MenuItem>
                    <MenuItem value="wednesday">Wednesday</MenuItem>
                    <MenuItem value="thursday">Thursday</MenuItem>
                    <MenuItem value="friday">Friday</MenuItem>
                    <MenuItem value="saturday">Saturday</MenuItem>
                    <MenuItem value="sunday">Sunday</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {frequency === 'monthly' && (
                <FormControl fullWidth disabled={isLoading}>
                  <InputLabel id="day-label">Day of Month</InputLabel>
                  <Select
                    labelId="day-label"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    label="Day of Month"
                  >
                    {[...Array(28)].map((_, i) => (
                      <MenuItem key={i} value={(i + 1).toString()}>
                        {i + 1}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <TextField
                label="Time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isLoading}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
          </Box>
          
          {/* Email Template */}
          <Box sx={{ 
            border: '1px solid #e0e0e0', 
            borderRadius: '8px',
            padding: 3,
            bgcolor: '#f9f9f9'
          }}>
            <DialogContentText sx={{ fontWeight: 600, mb: 2 }}>
              Email Template
            </DialogContentText>
            
            <TextField
              label="Subject"
              fullWidth
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              disabled={isLoading}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 1 }}>
              <InputLabel shrink htmlFor="content-editor">Content</InputLabel>
              <Box sx={{ 
                mt: 2.5, 
                border: '1px solid #c4c4c4',
                borderRadius: '4px',
                bgcolor: '#fff'
              }}>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Enter email content..."
                />
              </Box>
              <FormHelperText>
                You can use placeholders like [Customer Name], [Ticket ID], etc.
              </FormHelperText>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        padding: '16px 24px', 
        borderTop: '1px solid #e0e0e0',
        justifyContent: 'space-between'
      }}>
        <Button 
          onClick={handleCloseAndReset} 
          color="inherit"
          disabled={isLoading}
          sx={{ color: '#666' }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading
            ? 'Saving...'
            : automationToEdit
              ? 'Update Automation'
              : 'Create Automation'
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutomationModalMui; 