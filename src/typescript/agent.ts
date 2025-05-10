// frontend/src/typescript/agent.ts
// Based on backend/app/schemas/agent.py AgentInDBBase

export interface Agent {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'manager';
  is_active: boolean;
  workspace_id: number;
  job_title?: string | null; // Add job_title
  phone_number?: string | null;
  email_signature?: string | null; // Add email_signature
  created_at: string;
  updated_at: string;
}

// Interface for creating an agent (if needed later)
export interface AgentCreate {
  name: string;
  email: string;
  password?: string; // Password might be handled differently
  role?: 'admin' | 'agent' | 'manager'; // Add manager role
  is_active?: boolean;
  workspace_id: number;
  job_title?: string | null;
  phone_number?: string | null;
  email_signature?: string | null; // Add email_signature
}

// Interface for updating an agent (if needed later)
export interface AgentUpdate {
  name?: string | null;
  email?: string | null;
  password?: string | null; // Password update might be separate
  role?: 'admin' | 'agent' | 'manager' | null; // Add manager role
  is_active?: boolean | null;
  job_title?: string | null;
  phone_number?: string | null;
  email_signature?: string | null; // Add email_signature
}
