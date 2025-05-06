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
import { Badge } from "@/components/ui/badge"; 
import { X as LucideX } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from '@tanstack/react-query'; 
import { getAgents } from '@/services/agent'; 
import { Agent } from '@/typescript/agent'; 
import { getCurrentUser } from '@/lib/auth'; 
import { createTeam, addTeamMember } from '@/services/team';
import { Team } from '@/typescript/team'; 
import { toast } from 'sonner'; 

interface NewTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; 
}

interface TeamCreationData {
  name: string;
  description: string | null;
  workspace_id: number;
  agentIds: number[];
}

interface TeamWithCounts extends Team {
  agentCount: number | null;
  ticketCount: number | null;
}


const NewTeamModal: React.FC<NewTeamModalProps> = ({ isOpen, onClose, onSaveSuccess }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<number>>(new Set());
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchAgentsData = async () => {
        setIsLoadingAgents(true);
        setError(null);
        try {
          const agents = await getAgents();
          setAvailableAgents(agents || []);
        } catch (err) {
          console.error("Failed to fetch agents:", err);
          setError("Failed to load agents list.");
        } finally {
          setIsLoadingAgents(false);
        }
      };
      fetchAgentsData();
      setName('');
      setDescription('');
      setSelectedAgentIds(new Set());
    }
  }, [isOpen]);


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

  const createTeamMutation = useMutation<
    Team, 
    Error, 
    TeamCreationData, 
    { previousTeams?: TeamWithCounts[] } 
  >({
    mutationFn: async (data: TeamCreationData) => {
      const newTeam = await createTeam({
        name: data.name,
        description: data.description,
        workspace_id: data.workspace_id,
      });

      if (newTeam && newTeam.id && data.agentIds.length > 0) {
        const addMemberPromises = data.agentIds.map(agentId =>
          addTeamMember(newTeam.id, agentId)
        );
        const results = await Promise.allSettled(addMemberPromises);
        const failedAdditions = results.filter(r => r.status === 'rejected');
        if (failedAdditions.length > 0) {
          console.error("Some members could not be added:", failedAdditions);
        }
      }
      return newTeam; 
    },
    onMutate: async (newTeamData) => {
      await queryClient.cancelQueries({ queryKey: ['teamsWithCounts'] });
      const previousTeams = queryClient.getQueryData<TeamWithCounts[]>(['teamsWithCounts']);
      queryClient.setQueryData<TeamWithCounts[]>(['teamsWithCounts'], (old = []) => {
        const optimisticTeam: TeamWithCounts = {
          id: Date.now(), 
          name: newTeamData.name,
          description: newTeamData.description,
          workspace_id: newTeamData.workspace_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          agentCount: newTeamData.agentIds.length, 
          ticketCount: 0, 
        };
        return [optimisticTeam, ...old];
      });
      return { previousTeams };
    },
    onError: (err, _newTeam, context) => {
      if (context?.previousTeams) {
        queryClient.setQueryData(['teamsWithCounts'], context.previousTeams);
      }
      setError(err.message || "Failed to create team.");
      toast.error(err.message || "Failed to create team.");
    },
    onSuccess: (data) => { // data here is the created team from mutationFn
      toast.success(`Team "${data.name}" created successfully!`);
      onSaveSuccess(); 
      onClose();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['teamsWithCounts'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] }); 
    },
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    setError(null);

    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.workspace_id) {
      setError("Could not retrieve user session or workspace ID. Please log in again.");
      toast.error("Could not retrieve user session or workspace ID.");
      return;
    }

    createTeamMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      workspace_id: currentUser.workspace_id,
      agentIds: Array.from(selectedAgentIds),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-black">
        <DialogHeader>
          <DialogTitle>New Team</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new team. Click save when you&#39;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && <p className="col-span-4 text-red-600 text-sm">{error}</p>}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right pt-1">
              Name*
            </Label>
            <Input
              id="name"
              placeholder="Enter team name"
              className="col-span-3 bg-[#F4F7FE]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createTeamMutation.isPending}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-1">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Enter team description"
              className="col-span-3 bg-[#F4F7FE]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createTeamMutation.isPending}
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4"> 
            <Label htmlFor="agents" className="text-right self-start pt-1"> 
              Agents
            </Label>
            <div className="col-span-3 flex flex-col gap-2">
              <div className="flex flex-wrap gap-1 min-h-[2.5rem] items-center p-2 border rounded-md bg-[#F4F7FE]">
                {selectedAgentIds.size === 0 && (
                  <span className="text-sm text-muted-foreground px-1">No agents selected</span>
                )}
                {Array.from(selectedAgentIds).map(agentId => {
                  const agent = availableAgents.find(a => a.id === agentId);
                  return agent ? (
                    <Badge key={agent.id} variant="secondary" className="flex items-center gap-1">
                      {agent.name}
                      <button
                        type="button"
                        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                        onClick={() => handleAgentSelect(agent.id)}
                        disabled={createTeamMutation.isPending}
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
                  <Button variant="outline" size="sm" className="w-full justify-start font-normal" disabled={isLoadingAgents || createTeamMutation.isPending}>
                    {isLoadingAgents ? 'Loading Agents...' : '+ Add / Remove Agents'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto" align="start" sideOffset={5}>
                  <DropdownMenuLabel>Available Agents</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingAgents ? (
                    <DropdownMenuLabel>Loading...</DropdownMenuLabel>
                  ) : availableAgents.length === 0 ? (
                    <DropdownMenuLabel>No agents found</DropdownMenuLabel>
                  ) : (
                    availableAgents.map((agent) => (
                      <DropdownMenuCheckboxItem
                        key={agent.id}
                        checked={selectedAgentIds.has(agent.id)}
                        onCheckedChange={() => handleAgentSelect(agent.id)}
                        onSelect={(e) => e.preventDefault()} 
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
            <Button type="button" variant="outline" disabled={createTeamMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={createTeamMutation.isPending || isLoadingAgents}>
            {createTeamMutation.isPending ? 'Saving...' : 'Save Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewTeamModal;
