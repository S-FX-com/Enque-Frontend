// Based on backend/app/schemas/activity.py ActivityWithDetails

import { Agent } from "./agent"; // Assuming agent details are needed

// Define possible source types based on backend schema
export type ActivitySourceType = "Workspace" | "Ticket" | "Team" | "Company" | "User";

export interface Activity {
    id: number;
    action: string; // e.g., "created ticket", "updated status"
    agent_id?: number | null; // ID of the agent performing the action
    source_type: ActivitySourceType; // Type of the related entity
    source_id: number; // ID of the related entity (e.g., ticket ID)
    workspace_id: number;
    created_at: string; // ISO date string
    updated_at: string; // ISO date string

    // Details included from ActivityWithDetails
    agent?: Agent | null; // Full agent object (if loaded)
    // workspace?: Workspace | null; // Add Workspace type if needed
    creator_user_name?: string | null; // Name of the original user (e.g., ticket creator)
    creator_user_email?: string | null; // Email of the original user
    creator_user_id?: number | null; // ID of the original user
}

// Interface for creating (if needed later)
export interface ActivityCreate {
    action: string;
    agent_id?: number | null;
    source_type: ActivitySourceType;
    source_id: number;
    workspace_id: number;
}
