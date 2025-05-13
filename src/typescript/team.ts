export interface Team {
  id: number;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  icon_name?: string | null;
  workspace_id: number;
  created_at: string;
  updated_at: string;
  ticket_count?: number;
}

export interface TeamCreate {
  name: string;
  description?: string | null;
  logo_url?: string | null;
  icon_name?: string | null;
  workspace_id: number;
  agent_ids?: string[];
}

export interface TeamUpdate {
  name?: string | null;
  description?: string | null;
  logo_url?: string | null;
  icon_name?: string | null;
}

export interface TeamMember {
  id: number;
  team_id: number;
  agent_id: number;
  created_at: string;
}
