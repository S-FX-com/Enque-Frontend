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
// Assuming updateTeam service exists and TeamUpdate type
import { updateTeam, addTeamMember, getTeamMembers, removeTeamMember } from '@/services/team';
import type { Team, TeamMember } from '@/typescript/team'; // Removed TeamUpdate
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

const TEXT_COLOR = '#2b3674'; // User specified color

interface TeamWithCounts extends Team {
  // Re-evaluate if TeamWithCounts is the right type for teamToEdit
  agentCount: number | null;
  ticketCount: number | null;
  members?: TeamMember[]; // Assuming members might be part of teamToEdit
  manager_id?: number | null;
}

interface EmojiMartItem {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

interface EditTeamModalMuiProps {
  open: boolean;
  onClose: () => void;
  teamToEdit: TeamWithCounts | null; // Team to edit
  allAgents: Agent[]; // All available agents to pick from
}

interface UpdateTeamMutationPayload {
  name?: string;
  description?: string | null;
  icon_name?: string | null;
  manager_id?: number | null;
}

interface UpdateTeamMutationResult {
  updatedTeam: Team;
  newlySelectedAgentIds?: string[]; // For optimistic updates of counts
  originalAgentIds?: string[];
}

const EditTeamModalMui: React.FC<EditTeamModalMuiProps> = ({
  open,
  onClose,
  teamToEdit,
  allAgents,
}) => {
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<EmojiMartItem | null>(null);
  const [emojiPickerAnchorEl, setEmojiPickerAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [originalAgentIds, setOriginalAgentIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  useEffect(() => {
    if (open && teamToEdit) {
      setTeamName(teamToEdit.name || '');
      setTeamDescription(teamToEdit.description || '');
      // For emoji, if it's stored as native, find it in emoji-mart data or just display
      // For simplicity, if icon_name is just the native emoji, we can set it directly for display
      // A more robust way would be to find the EmojiMartItem if needed for other properties
      if (teamToEdit.icon_name) {
        setSelectedEmoji({ native: teamToEdit.icon_name } as EmojiMartItem); // Simplified
      } else {
        setSelectedEmoji(null);
      }

      // Fetch and set current team members
      if (teamToEdit.id) {
        getTeamMembers(teamToEdit.id)
          .then(members => {
            const currentMemberIds = members.map(m => m.agent_id.toString());
            setSelectedAgentIds(currentMemberIds);
            setOriginalAgentIds(currentMemberIds);
          })
          .catch(err => {
            console.error('Failed to fetch team members for editing:', err);
            // Fallback if teamToEdit.members was provided
            const memberIdsFromProp =
              teamToEdit.members?.map((m: TeamMember) => m.agent_id?.toString()).filter(Boolean) ||
              [];
            setSelectedAgentIds(memberIdsFromProp);
            setOriginalAgentIds(memberIdsFromProp);
          });
      } else {
        setSelectedAgentIds([]);
        setOriginalAgentIds([]);
      }
      setFormError(null);

      if (teamToEdit.manager_id) {
        setSelectedManagerId(teamToEdit.manager_id.toString());
      } else {
        setSelectedManagerId(null);
      }
    }
  }, [open, teamToEdit]);

  const mutation = useMutation<UpdateTeamMutationResult, Error, UpdateTeamMutationPayload>({
    mutationFn: async (
      dataToUpdate: UpdateTeamMutationPayload
    ): Promise<UpdateTeamMutationResult> => {
      if (!teamToEdit || !teamToEdit.id) {
        throw new Error('Team to edit is not properly defined.');
      }

      const updatedTeamFromApi = await updateTeam(teamToEdit.id, dataToUpdate);

      const agentsToAdd = selectedAgentIds.filter(id => !originalAgentIds.includes(id));
      const agentsToRemove = originalAgentIds.filter(id => !selectedAgentIds.includes(id));

      const addPromises = agentsToAdd.map(agentId =>
        addTeamMember(teamToEdit.id, Number.parseInt(agentId, 10))
      );
      const removePromises = agentsToRemove.map(agentId =>
        removeTeamMember(teamToEdit.id, Number.parseInt(agentId, 10))
      );

      await Promise.allSettled([...addPromises, ...removePromises]).then(results => {
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const action = index < addPromises.length ? 'add' : 'remove';
            const agentIdInvolved =
              index < addPromises.length
                ? agentsToAdd[index]
                : agentsToRemove[index - addPromises.length];
            console.warn(
              `[EditTeamModalMui] Failed to ${action} agent ID ${agentIdInvolved} for team ${teamToEdit.id}:`,
              result.reason
            );
          }
        });
      });

      const finalUpdatedTeam: Team = {
        ...updatedTeamFromApi,
        icon_name:
          dataToUpdate.icon_name === undefined ? teamToEdit.icon_name : dataToUpdate.icon_name,
      };

      return {
        updatedTeam: finalUpdatedTeam,
        newlySelectedAgentIds: selectedAgentIds,
        originalAgentIds,
      };
    },
    onSuccess: async (result: UpdateTeamMutationResult) => {
      const { updatedTeam, newlySelectedAgentIds } = result;
      toast.success(`Team "${updatedTeam.name}" updated successfully!`);

      const teamsQueryKey: QueryKey = ['teams'];
      queryClient.setQueryData<Team[]>(teamsQueryKey, (oldTeams = []) =>
        oldTeams.map(t => (t.id === updatedTeam.id ? { ...t, ...updatedTeam } : t))
      );

      const teamsWithCountsQueryKey: QueryKey = ['teamsWithCounts'];
      queryClient.setQueryData<TeamWithCounts[]>(teamsWithCountsQueryKey, (oldData = []) => {
        return oldData.map(t => {
          if (t.id === updatedTeam.id) {
            return {
              ...t,
              ...updatedTeam,
              agentCount: newlySelectedAgentIds?.length ?? t.agentCount,
            };
          }
          return t;
        });
      });

      let specificAgentTeamsKey: QueryKey | undefined;
      try {
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.id) {
          specificAgentTeamsKey = ['agentTeams', currentUser.id, currentUser.role];
          // Update if this team is in the current user's list, or add/remove if membership changed
          // This part is complex for edits; for now, just invalidate to refetch.
        }
      } catch (error) {
        console.warn('[EditTeamModalMui] Could not determine specific agentTeams key:', error);
      }

      queryClient.invalidateQueries({ queryKey: teamsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['paginatedTeams'] });
      queryClient.invalidateQueries({ queryKey: teamsWithCountsQueryKey });

      setTimeout(() => {
        if (specificAgentTeamsKey) {
          queryClient.invalidateQueries({ queryKey: specificAgentTeamsKey });
        }
        queryClient.invalidateQueries({ queryKey: ['agentTeams'] }); // Generic invalidation too
        queryClient.invalidateQueries({ queryKey: ['teamMembers', teamToEdit?.id] }); // Invalidate specific team members query if one exists
      }, 500); // Shorter delay for edit

      handleCloseAndReset();
    },
    onError: (error: Error) => {
      console.error('[EditTeamModalMui] Error updating team:', error);
      setFormError(error.message || 'Failed to update team. Please try again.');
      toast.error(error.message || 'Failed to update team. Please try again.');
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

  const handleTriggerUpdateTeam = () => {
    if (!teamToEdit) return;
    setFormError(null);
    if (!teamName.trim()) {
      setFormError('Team name is required.');
      return;
    }

    const payload: UpdateTeamMutationPayload = {
      name: teamName.trim(),
      description: teamDescription.trim() || null,
      icon_name: selectedEmoji?.native || null,
      manager_id: selectedManagerId ? Number.parseInt(selectedManagerId, 10) : null,
    };
    mutation.mutate(payload);
  };

  const handleCloseAndReset = () => {
    // Don't reset fields to empty, they should revert to original if not saved, or close
    setEmojiPickerAnchorEl(null);
    setFormError(null);
    onClose(); // Parent will control re-fetching or re-passing teamToEdit if needed
  };

  // useEffect for resetting is different for edit, it re-populates from teamToEdit
  // The existing useEffect already handles populating on open/teamToEdit change

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
        sx={{ pb: 0, fontSize: '1.25rem', fontWeight: 600, pt: 2.5, px: 2.5, color: TEXT_COLOR }}
      >
        Edit Team: {teamToEdit?.name || ''}
      </DialogTitle>
      <DialogContentText
        sx={{ color: TEXT_COLOR, opacity: 0.8, px: 2.5, pt: 0.5, pb: 2, fontSize: '0.875rem' }}
      >
        Update the team details and members below.
      </DialogContentText>
      <DialogContent dividers sx={{ pt: 2, pb: 2.5, px: 2.5, borderColor: 'rgba(0, 0, 0, 0.08)' }}>
        {formError && (
          <Box sx={{ color: 'error.main', mb: 2, fontSize: '0.875rem' }}>{formError}</Box>
        )}

        <InputLabel
          shrink
          htmlFor="edit-team-name"
          sx={{ fontSize: '0.875rem', fontWeight: 500, color: TEXT_COLOR, mb: 0.75 }}
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
            id="edit-team-name"
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
          htmlFor="edit-team-description"
          sx={{ fontSize: '0.875rem', fontWeight: 500, color: TEXT_COLOR, mb: 0.75 }}
        >
          Description
        </InputLabel>
        <TextField
          margin="none"
          id="edit-team-description"
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

        <FormControl fullWidth margin="none" disabled={mutation.isPending} sx={{ mb: 1 }}>
          <InputLabel
            id="edit-multiple-agents-select-label"
            sx={{ fontSize: '0.875rem', fontWeight: 500, color: TEXT_COLOR }}
          >
            Agents
          </InputLabel>
          <Select
            labelId="edit-multiple-agents-select-label"
            id="edit-multiple-agents"
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
                  const agent = allAgents.find(a => a.id.toString() === id); // Use allAgents for rendering chip label
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
            {allAgents.length === 0 && (
              <MenuItem disabled value="">
                <em>No agents available</em>
              </MenuItem>
            )}
            {allAgents.map(agent => (
              <MenuItem key={agent.id} value={agent.id.toString()}>
                <Checkbox checked={selectedAgentIds.indexOf(agent.id.toString()) > -1} />
                <ListItemText primary={agent.name || agent.email} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="none" disabled={mutation.isPending} sx={{ mb: 2.5, mt: 2 }}>
          <InputLabel
            id="edit-team-manager-select-label"
            sx={{ fontSize: '0.875rem', fontWeight: 500, color: TEXT_COLOR }}
          >
            Team Manager
          </InputLabel>
          <Select
            labelId="edit-team-manager-select-label"
            id="edit-team-manager"
            value={selectedManagerId || ''}
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
            {allAgents.map(agent => (
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
          onClick={handleTriggerUpdateTeam}
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
            'Save Changes'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTeamModalMui;
