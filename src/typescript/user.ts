// frontend/src/typescript/user.ts

// Define the interface for the User object based on backend schema
export interface IUser {
  id: number;
  name: string;
  email: string;
  company_id?: number | null; // Optional or null based on backend logic
  phone?: string | null; // Optional or null
  created_at: string;
  updated_at: string;
  workspace_id: number;
  avatar_url: string;
}

// Define the interface for the Agent object based on backend schema
export interface IAgent {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'manager'; // Incluir todos los roles disponibles
  is_active: boolean;
  workspace_id: number;
  created_at: string;
  updated_at: string;
  avatar_url: string;
  // Add other fields if necessary based on AgentSchema from backend
}

// Define the interface for the UnassignedUser object based on backend schema
export interface IUnassignedUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  workspace_id: number | null; // Match the schema (Optional[int])
  created_at: string;
}

// Interface for updating a user (matches backend UserUpdate)
export interface UserUpdate {
  name?: string | null;
  email?: string | null;
  company_id?: number | null; // Allow setting/unsetting company
  phone?: string | null;
  // Add other updatable fields if needed
}
