// frontend/src/components/modals/new-team-modal.tsx
import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Import DialogClose for the Cancel button
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge"; // Import Badge
import { X as LucideX } from 'lucide-react'; // Import X icon
// Use DropdownMenu for multi-select simulation with checkboxes
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAgents } from '@/services/agent'; // Import agent service
import { Agent } from '@/typescript/agent'; // Import agent type
import { getCurrentUser } from '@/lib/auth'; // Import function to get user session
// Import team services
import { createTeam, addTeamMember } from '@/services/team';

interface NewTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; // Callback to refresh team list on parent
}

const NewTeamModal: React.FC<NewTeamModalProps> = ({ isOpen, onClose, onSaveSuccess }) => {
  // State variables
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<number>>(new Set());
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available agents when the modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchAgents = async () => {
        setIsLoadingAgents(true);
        setError(null); // Clear previous errors
        try {
          const agents = await getAgents();
          setAvailableAgents(agents);
        } catch (err) {
          console.error("Failed to fetch agents:", err);
          setError("Failed to load agents list."); // Set error specific to agents
        } finally {
          setIsLoadingAgents(false);
        }
      };
      fetchAgents();
      // Reset form fields when opening
      setName('');
      setDescription('');
      setSelectedAgentIds(new Set());
      setIsSaving(false);
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

  // No longer needed for trigger display
  // const getSelectedAgentNames = () => { ... };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Team name is required.");
      return;
    }
    setError(null);
    setIsSaving(true);

    try {
      // Get current user session to obtain workspace_id
      const currentUser = await getCurrentUser();
      if (!currentUser || !currentUser.workspace_id) {
        setError("Could not retrieve user session or workspace ID. Please log in again.");
        setIsSaving(false);
        return;
      }
      const workspaceId = currentUser.workspace_id;

      // 1. Create the team
      const newTeamData = {
          name: name.trim(),
          description: description.trim() || null, // Send null if empty
          workspace_id: workspaceId
      };
      const newTeam = await createTeam(newTeamData);
      console.log("Team created:", newTeam);

      // 2. If team created successfully and agents selected, add members
      if (newTeam && newTeam.id && selectedAgentIds.size > 0) {
        console.log(`Adding ${selectedAgentIds.size} members to team ${newTeam.id}...`);
        const addMemberPromises = Array.from(selectedAgentIds).map(agentId =>
          addTeamMember(newTeam.id, agentId)
        );
        // Use allSettled to attempt adding all members even if some fail
        const results = await Promise.allSettled(addMemberPromises);

        // Log any errors from adding members
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const agentId = Array.from(selectedAgentIds)[index];
            console.error(`Failed to add agent ${agentId} to team ${newTeam.id}:`, result.reason);
            // Optionally, collect these errors to show a partial success message
            setError(prevError => prevError ? `${prevError}\nFailed to add agent ID: ${agentId}` : `Failed to add agent ID: ${agentId}`);
          } else {
             console.log(`Successfully added agent ${Array.from(selectedAgentIds)[index]} to team ${newTeam.id}`);
          }
        });
        // If there were any errors adding members, keep the modal open to show them
        if (results.some(r => r.status === 'rejected')) {
            setIsSaving(false); // Allow user to retry or close manually
            return; // Stop execution here
        }
      }

      // 3. If everything succeeded, notify parent and close
      onSaveSuccess(); // Notify parent to refresh list
      onClose(); // Close modal

    } catch (err) {
      console.error("Failed to save team:", err);
      // Improve error message based on error type if possible
      setError(err instanceof Error ? err.message : "An unknown error occurred while saving the team.");
    } finally {
      // Only set isSaving to false if no partial errors occurred during member addition
       if (!error || !error.includes("Failed to add agent")) {
           setIsSaving(false);
       }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Apply white background to DialogContent */}
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>New Team</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new team. Click save when you&#39;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && <p className="col-span-4 text-red-600 text-sm">{error}</p>}
          {/* Icon Placeholder - Can be added later if needed */}
          {/* <div className="grid grid-cols-4 items-center gap-4"> ... </div> */}
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
              disabled={isSaving}
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
              disabled={isSaving}
            />
          </div>
          {/* Updated Agent Selection Section */}
          <div className="grid grid-cols-4 items-start gap-4"> {/* Changed to items-start */}
            <Label htmlFor="agents" className="text-right self-start pt-1"> {/* Align label top */}
              Agents
            </Label>
            {/* Container for Badges and Dropdown Trigger */}
            <div className="col-span-3 flex flex-col gap-2">
              {/* Display selected agents as badges */}
              <div className="flex flex-wrap gap-1 min-h-[2.5rem] items-center p-2 border rounded-md bg-[#F4F7FE]"> {/* Added styles */}
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
                        disabled={isSaving}
                        aria-label={`Remove ${agent.name}`}
                      >
                        <LucideX className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
              {/* Dropdown to add more agents */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start font-normal" disabled={isLoadingAgents || isSaving}>
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
                        onSelect={(e) => e.preventDefault()} // Prevent closing on select
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
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewTeamModal;
