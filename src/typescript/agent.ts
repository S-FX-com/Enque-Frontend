export interface Agent {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'manager';
  is_active: boolean;
  workspace_id: number;
  job_title?: string | null;
  phone_number?: string | null;
  email_signature?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  teams_notifications_enabled?: boolean;
  microsoft_id?: string | null;
}
export interface AgentCreate {
  name: string;
  email: string;
  password?: string;
  role?: 'admin' | 'agent' | 'manager';
  is_active?: boolean;
  workspace_id: number;
  job_title?: string | null;
  phone_number?: string | null;
  email_signature?: string | null;
  avatar_url?: string | null;
  teams_notifications_enabled?: boolean;
  microsoft_id?: string | null;
}
export interface AgentUpdate {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  role?: 'admin' | 'agent' | 'manager' | null;
  is_active?: boolean | null;
  job_title?: string | null;
  phone_number?: string | null;
  email_signature?: string | null;
  avatar_url?: string | null;
  teams_notifications_enabled?: boolean | null;
  microsoft_id?: string | null;
}
