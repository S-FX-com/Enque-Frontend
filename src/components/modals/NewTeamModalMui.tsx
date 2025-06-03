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
  IconButton,
  Popover,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  CircularProgress,
  type SelectChangeEvent,
  DialogContentText,
  Chip,
  FormHelperText,
} from '@mui/material';
import { AddReaction } from '@mui/icons-material';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import type { Agent } from '@/typescript/agent';
import { createTeam, addTeamMember } from '@/services/team';
import type { Team, TeamCreate } from '@/typescript/team';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

interface TeamWithCounts extends Team {
  agentCount: number | null;
  ticketCount: number | null;
}

interface EmojiMartItem {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

interface NewTeamModalMuiProps {
  open: boolean;
  onClose: () => void;
  agents: Agent[];
}

interface CreateTeamMutationResult {
  team: Team;
  attemptedAgentIds?: string[];
}

// Update TeamCreate interface to include manager_id
interface ExtendedTeamCreate extends TeamCreate {
  manager_id?: number | null;
}

const NewTeamModalMui: React.FC<NewTeamModalMuiProps> = ({ open, onClose, agents }) => {
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiMartItem | null>(null);
  const [emojiPickerAnchorEl, setEmojiPickerAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation<CreateTeamMutationResult, Error, ExtendedTeamCreate>({
    mutationFn: async (teamCreationData: ExtendedTeamCreate): Promise<CreateTeamMutationResult> => {
      console.log(
        '[NewTeamModalMui] mutationFn received teamCreationData:',
        JSON.stringify(teamCreationData)
      );
      const currentUser = await getCurrentUser();
      if (!currentUser || !currentUser.workspace_id) {
        throw new Error('Could not retrieve user session or workspace ID.');
      }

      const { agent_ids, manager_id, ...teamDetails } = teamCreationData;
      const payloadForService = {
        ...teamDetails,
        workspace_id: currentUser.workspace_id,
        manager_id: manager_id || null,
      };
      console.log(
        '[NewTeamModalMui] Payload for createTeam service:',
        JSON.stringify(payloadForService)
      );
      const newTeamFromApi = await createTeam(payloadForService);

      const newTeamWithIcon: Team = {
        ...newTeamFromApi,
        icon_name: payloadForService.icon_name || null,
      };

      if (newTeamWithIcon && newTeamWithIcon.id && agent_ids && agent_ids.length > 0) {
        const agentIdNumbers = agent_ids
          .map(id => Number.parseInt(id, 10))
          .filter(id => !isNaN(id));

        const memberAddPromises = agentIdNumbers.map(agentId =>
          addTeamMember(newTeamWithIcon.id, agentId)
        );
        // Not waiting for these promises to resolve fully here for faster UI response for team creation itself
        // Errors are logged internally. For optimistic update, we assume adds were attempted.
        Promise.allSettled(memberAddPromises).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.warn(
                `[NewTeamModalMui] Async: Failed to add agent ID ${agentIdNumbers[index]} to team ${newTeamWithIcon.id}:`,
                result.reason
              );
            }
          });
        });
      }
      return { team: newTeamWithIcon, attemptedAgentIds: agent_ids }; // Return team and agent_ids used
    },
    onSuccess: async mutationResult => {
      const { team: newTeam, attemptedAgentIds } = mutationResult;
      console.log(
        '[NewTeamModalMui] Team data after creation (onSuccess):',
        JSON.stringify(newTeam)
      );
      toast.success(`Team "${newTeam.name}" created successfully!`);

      // Step 1: Perform all optimistic updates
      const teamsQueryKey: QueryKey = ['teams'];
      queryClient.setQueryData<Team[]>(teamsQueryKey, (oldTeams = []) => {
        if (oldTeams.find(t => t.id === newTeam.id)) {
          return oldTeams.map(t => (t.id === newTeam.id ? newTeam : t));
        }
        return [...oldTeams, newTeam];
      });

      const teamsWithCountsQueryKey: QueryKey = ['teamsWithCounts'];
      queryClient.setQueryData<TeamWithCounts[]>(teamsWithCountsQueryKey, oldData => {
        const agentCount = attemptedAgentIds?.length || 0;
        const teamWithCounts: TeamWithCounts = {
          ...newTeam,
          agentCount: agentCount,
          ticketCount: 0,
        };

        if (oldData && Array.isArray(oldData)) {
          const teamExists = oldData.find(t => t.id === newTeam.id);
          if (teamExists) {
            return oldData.map(t => (t.id === newTeam.id ? teamWithCounts : t));
          }
          return [...oldData, teamWithCounts];
        }
        return [teamWithCounts];
      });

      let specificAgentTeamsKey: QueryKey | undefined;
      try {
        const currentUser = await getCurrentUser(); // Get current user for the ID
        if (currentUser && currentUser.id) {
          specificAgentTeamsKey = ['agentTeams', currentUser.id, currentUser.role];
          queryClient.setQueryData<Team[]>(specificAgentTeamsKey, (oldAgentTeams = []) => {
            if (oldAgentTeams.find(t => t.id === newTeam.id)) {
              return oldAgentTeams.map(t => (t.id === newTeam.id ? newTeam : t));
            }
            return [...oldAgentTeams, newTeam];
          });
        }
      } catch (error) {
        console.warn('[NewTeamModalMui] Could not optimistically update agentTeams cache:', error);
      }

      // Step 2: Invalidate queries
      // Invalidate these immediately
      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['paginatedTeams'] });
      queryClient.invalidateQueries({ queryKey: teamsWithCountsQueryKey });

      // Delay invalidation for agentTeams to allow backend to catch up
      setTimeout(() => {
        if (specificAgentTeamsKey) {
          console.log(
            '[NewTeamModalMui] Delayedly invalidating specific agentTeams query:',
            specificAgentTeamsKey
          );
          queryClient.invalidateQueries({ queryKey: specificAgentTeamsKey });
        } else {
          console.log('[NewTeamModalMui] Delayedly invalidating generic agentTeams query');
          queryClient.invalidateQueries({ queryKey: ['agentTeams'] });
        }
      }, 1000); // 1-second delay

      handleCloseAndReset();
    },
    onError: error => {
      console.error('[NewTeamModalMui] Error creating team:', error);
      setFormError(error.message || 'Failed to create team. Please try again.');
      toast.error(error.message || 'Failed to create team. Please try again.');
    },
  });

  const handleEmojiButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setEmojiPickerAnchorEl(event.currentTarget);
  };

  const handleEmojiPickerClose = () => {
    setEmojiPickerAnchorEl(null);
  };

  const handleEmojiSelect = (emoji: EmojiMartItem) => {
    setSelectedEmoji(emoji);
    handleEmojiPickerClose();
  };

  const handleRemoveAgent = (agentIdToRemove: string) => {
    setSelectedAgentIds(prevSelectedAgentIds =>
      prevSelectedAgentIds.filter(id => id !== agentIdToRemove)
    );
  };

  const handleAgentChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    setSelectedAgentIds(typeof value === 'string' ? value.split(',') : value);
  };

  const handleManagerChange = (event: SelectChangeEvent<string>) => {
    setSelectedManagerId(event.target.value);
  };

  const handleTriggerCreateTeam = () => {
    setFormError(null);
    if (!teamName.trim()) {
      setFormError('Team name is required.');
      return;
    }

    const teamData: ExtendedTeamCreate = {
      name: teamName.trim(),
      description: teamDescription.trim() || null,
      icon_name: selectedEmoji?.native || null,
      agent_ids: selectedAgentIds,
      workspace_id: 0, // Placeholder, actual ID set in mutationFn
      manager_id: selectedManagerId ? Number.parseInt(selectedManagerId, 10) : null,
    };
    console.log('[NewTeamModalMui] Data before calling mutation.mutate:', JSON.stringify(teamData));
    mutation.mutate(teamData);
  };

  const handleCloseAndReset = () => {
    setTeamName('');
    setTeamDescription('');
    setSelectedEmoji(null);
    setSelectedAgentIds([]);
    setSelectedManagerId('');
    setEmojiPickerAnchorEl(null);
    setFormError(null);
    onClose();
  };

  useEffect(() => {
    if (open) {
      // Reset form fields when dialog opens/re-opens
      setTeamName('');
      setTeamDescription('');
      setSelectedEmoji(null);
      setSelectedAgentIds([]);
      setSelectedManagerId('');
      setEmojiPickerAnchorEl(null);
      setFormError(null);
    }
  }, [open]);

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

  return (
    <Dialog
      open={open}
      onClose={handleCloseAndReset}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
        },
      }}
    >
      <DialogTitle
        sx={{ pb: 0, fontSize: '1.25rem', fontWeight: 600, pt: 2.5, px: 2.5, color: '#334155' }}
      >
        Create New Team
      </DialogTitle>
      <DialogContentText sx={{ color: '#475569', px: 2.5, pt: 0.5, pb: 2, fontSize: '0.875rem' }}>
        Enter the team details and assign members below.
      </DialogContentText>
      <DialogContent dividers sx={{ pt: 2, pb: 2.5, px: 2.5, borderColor: 'rgba(0, 0, 0, 0.08)' }}>
        {formError && (
          <Box sx={{ color: 'error.main', mb: 2, fontSize: '0.875rem' }}>{formError}</Box>
        )}

        <InputLabel
          shrink
          htmlFor="name"
          sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', mb: 0.75 }}
        >
          Name*
        </InputLabel>
        <Box sx={{ display: 'flex', alignItems: 'stretch', mb: 2.5 }}>
          <IconButton
            onClick={handleEmojiButtonClick}
            aria-label="Select emoji"
            size="medium"
            sx={{
              mr: 1,
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              padding: '8px',
              width: '50px',
              height: '50px',
              alignSelf: 'center',
            }}
            disabled={mutation.isPending}
          >
            {selectedEmoji ? (
              <span style={{ fontSize: '22px' }}>{selectedEmoji.native}</span>
            ) : (
              <AddReaction sx={{ fontSize: '24px' }} />
            )}
          </IconButton>
          <TextField
            autoFocus
            margin="none"
            id="name"
            type="text"
            fullWidth
            variant="outlined"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            error={!!formError && !teamName.trim()}
            disabled={mutation.isPending}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B0BEC5' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
              },
            }}
            placeholder="Enter team name"
          />
        </Box>

        <InputLabel
          shrink
          htmlFor="description"
          sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155', mb: 0.75 }}
        >
          Description
        </InputLabel>
        <TextField
          margin="none"
          id="description"
          type="text"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={teamDescription}
          onChange={e => setTeamDescription(e.target.value)}
          disabled={mutation.isPending}
          sx={{
            mb: 2.5,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B0BEC5' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
            },
          }}
          placeholder="Enter team description"
        />

        <FormControl fullWidth margin="none" disabled={mutation.isPending} sx={{ mb: 2.5 }}>
          <InputLabel
            id="multiple-agents-select-label"
            sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}
          >
            Agents
          </InputLabel>
          <Select
            labelId="multiple-agents-select-label"
            id="multiple-agents"
            multiple
            value={selectedAgentIds}
            onChange={handleAgentChange}
            input={
              <OutlinedInput
                label="Agents"
                sx={{
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B0BEC5' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                }}
              />
            }
            renderValue={selected => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {(selected as string[]).map(id => {
                  const agent = agents.find(a => a.id.toString() === id);
                  return agent ? (
                    <Chip
                      key={id}
                      label={agent.name || agent.email}
                      onDelete={() => handleRemoveAgent(id)}
                      size="small"
                      sx={{ height: '26px', borderRadius: '6px' }}
                    />
                  ) : null;
                })}
              </Box>
            )}
            MenuProps={MenuProps}
            sx={{
              '& .MuiSelect-select': {
                paddingTop: selectedAgentIds.length > 0 ? '10px' : '14.5px',
                paddingBottom: selectedAgentIds.length > 0 ? '10px' : '14.5px',
              },
            }}
          >
            {agents.length === 0 && (
              <MenuItem disabled value="">
                <em>No agents available</em>
              </MenuItem>
            )}
            {agents.map(agent => (
              <MenuItem key={agent.id} value={agent.id.toString()}>
                <Checkbox checked={selectedAgentIds.indexOf(agent.id.toString()) > -1} />
                <ListItemText primary={agent.name || agent.email} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Team Manager Selection */}
        <FormControl fullWidth margin="none" disabled={mutation.isPending} sx={{ mb: 2 }}>
          <InputLabel
            id="team-manager-select-label"
            sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}
          >
            Team Manager
          </InputLabel>
          <Select
            labelId="team-manager-select-label"
            id="team-manager"
            value={selectedManagerId}
            onChange={handleManagerChange}
            input={
              <OutlinedInput
                label="Team Manager"
                sx={{
                  borderRadius: '8px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#B0BEC5' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                }}
              />
            }
            MenuProps={MenuProps}
          >
            <MenuItem value="">
              <em>No manager</em>
            </MenuItem>
            {agents.map(agent => (
              <MenuItem key={agent.id} value={agent.id.toString()}>
                {agent.name || agent.email}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>Select an agent to be the team manager</FormHelperText>
        </FormControl>

        <Popover
          open={Boolean(emojiPickerAnchorEl)}
          anchorEl={emojiPickerAnchorEl}
          onClose={handleEmojiPickerClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
        </Popover>
      </DialogContent>
      <DialogActions
        sx={{
          p: '20px 20px',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
          backgroundColor: '#F8F9FA',
        }}
      >
        <Button
          onClick={handleCloseAndReset}
          color="inherit"
          disabled={mutation.isPending}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            borderRadius: '8px',
            padding: '8px 20px',
            fontWeight: 500,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleTriggerCreateTeam}
          variant="contained"
          disabled={mutation.isPending || !teamName.trim()}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            borderRadius: '8px',
            padding: '8px 20px',
            boxShadow: 'none',
            fontWeight: 500,
            backgroundColor: '#007AFF',
            '&:hover': {
              backgroundColor: '#005ecb',
              boxShadow: 'none',
            },
          }}
        >
          {mutation.isPending ? (
            <CircularProgress size={22} sx={{ color: 'white' }} />
          ) : (
            'Create Team'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewTeamModalMui;
