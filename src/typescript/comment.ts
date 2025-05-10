import { IUser, IAgent } from './user'; // Import IAgent

export interface IComment {
  id: number;
  content: string; // Could be plain text or HTML
  created_at: string;
  updated_at: string; // Add updated_at based on backend schema
  is_private?: boolean; // Make optional as it might not come from backend
  user?: IUser | null; // Sender can be a User (optional)
  agent?: IAgent | null; // Sender can be an Agent (optional)
  ticket_id: number;
  workspace_id: number; // Add workspace_id based on backend schema
}

// Optional: Interface for creating comments if needed later
export interface ICreateComment {
  ticket_id: number;
  content: string;
  is_private?: boolean;
  // user_id will likely be inferred from the authenticated session backend-side
}
