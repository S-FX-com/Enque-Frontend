import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X as LucideX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { getAgents } from '@/services/agent';
import { Agent } from '@/typescript/agent';
import { Team } from '@/typescript/team';
import { getTeamMembers, updateTeam, addTeamMember, removeTeamMember } from '@/services/team';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  teamToEdit: Team | null;
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  teamToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [initialAgentIds, setInitialAgentIds] = useState<Set<number>>(new Set());
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<number>>(new Set());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isOpen && teamToEdit) {
      setName(teamToEdit.name);
      setDescription(teamToEdit.description || '');
      setError(null);
      setIsSaving(false);
      setIsLoadingData(true);

      const fetchData = async () => {
        try {
          const [agentsResponse, currentMembersResponse] = await Promise.all([
            getAgents(),
            getTeamMembers(teamToEdit.id),
          ]);

          setAvailableAgents(agentsResponse || []);
          const currentMemberIds = new Set(
            (currentMembersResponse || []).map(member => member.agent_id)
          );
          setInitialAgentIds(currentMemberIds);
          setSelectedAgentIds(currentMemberIds);
        } catch (err) {
          console.error('Failed to load initial data for edit modal:', err);
          setError('Failed to load agents or team members.');
          setAvailableAgents([]);
          setInitialAgentIds(new Set());
          setSelectedAgentIds(new Set());
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchData();
    } else if (!isOpen) {
      setName('');
      setDescription('');
      setAvailableAgents([]);
      setInitialAgentIds(new Set());
      setSelectedAgentIds(new Set());
      setError(null);
      setIsLoadingData(false);
      setIsSaving(false);
    }
  }, [isOpen, teamToEdit]);

  const handleAgentSelect = (agentId: number) => {
    setSelectedAgentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(agentId)) {
        newSet.delete(agentId);
      } else {
        newSet.add(agentId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!teamToEdit || !name.trim()) {
      setError('Team name is required.');
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      const detailsChanged =
        name.trim() !== teamToEdit.name ||
        (description.trim() || null) !== (teamToEdit.description || null);
      if (detailsChanged) {
        await updateTeam(teamToEdit.id, {
          name: name.trim(),
          description: description.trim() || null,
        });
      }

      const agentsToAdd = new Set([...selectedAgentIds].filter(id => !initialAgentIds.has(id)));
      const agentsToRemove = new Set([...initialAgentIds].filter(id => !selectedAgentIds.has(id)));

      const memberUpdatePromises: Promise<unknown>[] = [];
      agentsToAdd.forEach(agentId =>
        memberUpdatePromises.push(addTeamMember(teamToEdit.id, agentId))
      );
      agentsToRemove.forEach(agentId =>
        memberUpdatePromises.push(removeTeamMember(teamToEdit.id, agentId))
      );

      const results = await Promise.allSettled(memberUpdatePromises);

      let memberUpdateError = false;
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          memberUpdateError = true;
          const action = index < agentsToAdd.size ? 'add' : 'remove';
          console.error(
            `Failed to ${action} a team member for team ${teamToEdit.id}:`,
            result.reason
          );
          setError(prevError =>
            prevError
              ? `${prevError}\nFailed to update a team member.`
              : `Failed to update a team member.`
          );
        }
      });

      if (memberUpdateError) {
        setIsSaving(false);
        toast.error('Some member updates failed. Please review and try again.');
        return;
      }

      toast.success(`Team "${name.trim()}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ['agentTeams'] });

      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save team updates:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred while saving updates.';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-black">
        <DialogHeader>
          <DialogTitle>Edit Team: {teamToEdit?.name}</DialogTitle>
          <DialogDescription>Update the team details and members below.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && <p className="col-span-4 text-red-600 text-sm px-1">{error}</p>}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-team-name" className="text-right">
              Name*
            </Label>
            <Input
              id="edit-team-name"
              placeholder="Enter team name"
              className="col-span-3"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isSaving || isLoadingData}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="edit-team-description" className="text-right pt-1">
              Description
            </Label>
            <Textarea
              id="edit-team-description"
              placeholder="Enter team description"
              className="col-span-3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isSaving || isLoadingData}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="edit-team-agents" className="text-right self-start pt-1">
              Agents
            </Label>
            <div className="col-span-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1 min-h-[2.5rem] items-center p-2 border rounded-md bg-slate-50 dark:bg-slate-800">
                {isLoadingData && (
                  <span className="text-sm text-muted-foreground px-1">Loading members...</span>
                )}
                {!isLoadingData && selectedAgentIds.size === 0 && (
                  <span className="text-sm text-muted-foreground px-1">No agents selected</span>
                )}
                {!isLoadingData &&
                  Array.from(selectedAgentIds).map(agentId => {
                    const agent = availableAgents.find(a => a.id === agentId);
                    return agent ? (
                      <Badge key={agent.id} variant="secondary" className="flex items-center gap-1">
                        {agent.name}
                        <button
                          type="button"
                          className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                          onClick={() => handleAgentSelect(agent.id)}
                          disabled={isSaving || isLoadingData}
                          aria-label={`Remove ${agent.name}`}
                        >
                          <LucideX className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start font-normal"
                    disabled={isLoadingData || isSaving}
                  >
                    {isLoadingData ? 'Loading Agents...' : '+ Add / Remove Agents'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto"
                  align="start"
                  sideOffset={5}
                >
                  <DropdownMenuLabel>Available Agents</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingData ? (
                    <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                  ) : availableAgents.length === 0 ? (
                    <DropdownMenuItem disabled>No agents found</DropdownMenuItem>
                  ) : (
                    availableAgents.map(agent => (
                      <DropdownMenuCheckboxItem
                        key={agent.id}
                        checked={selectedAgentIds.has(agent.id)}
                        onCheckedChange={() => handleAgentSelect(agent.id)}
                        onSelect={e => e.preventDefault()}
                      >
                        {agent.name} ({agent.email})
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSaving || isLoadingData}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTeamModal;
