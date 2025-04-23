// Based on backend/app/schemas/team.py TeamInDBBase

export interface Team {
  id: number;
  name: string;
  description?: string | null; // Optional in schema
  logo_url?: string | null; // Optional in schema
  workspace_id: number;
  created_at: string; // Representing datetime as string
  updated_at: string; // Representing datetime as string
  // Note: tickets and agents counts are not directly available from GET /v1/teams/
  // We might need separate calls or backend adjustments later.
}

// Interface for creating a team (based on TeamCreate)
export interface TeamCreate {
  name: string;
  description?: string | null;
  logo_url?: string | null;
  workspace_id: number;
}

// Interface for updating a team (based on TeamUpdate)
export interface TeamUpdate {
  name?: string | null;
  description?: string | null;
  logo_url?: string | null;
}

// Interface for Team Member (based on TeamMember) - might be useful later
export interface TeamMember {
    id: number;
    team_id: number;
    agent_id: number;
    created_at: string;
}
