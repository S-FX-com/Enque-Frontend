import { BaseFilters } from './index';
import { IUser } from './user'; // Import IUser
import { ICategory } from './category'; // Import ICategory

// Define and export Ticket Status type (matching backend TaskStatus)
export type TicketStatus = 'Unread' | 'Open' | 'With User' | 'In Progress' | 'Closed' | 'Resolved'; // Added 'Resolved'

// Define and export Ticket Priority type (matching backend TaskPriority)
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical'; // Added Critical

// Define and export Ticket Type
export type TicketType = 'bug' | 'feature' | 'support' | 'other';

// Interfaz para los datos del correo
export interface EmailInfo {
  id: number;
  email_id: string;
  email_conversation_id: string;
  email_subject: string;
  email_sender: string;
  email_received_at: string;
}

// Interfaz para los tickets
export interface ITicket {
  id: number;
  title: string; // Use 'title' instead of 'subject'
  description: string; // Use 'description' instead of 'content'
  status: TicketStatus; // Use the exported type
  priority: TicketPriority; // Use the exported type
  type: TicketType; // Use the exported type
  user_id: number | null; // user_id puede ser null
  user?: IUser | null; // Add the user object (original sender)
  assignee_id?: number; // ID of the assigned agent/user
  team_id?: number; // Consider changing this to ITeam if backend sends object
  // 'sent_from' seems to represent the agent who processed/replied, let's keep it for that purpose
  sent_from?: IUser | null; // Agent/User who last interacted or processed
  // We might need an 'assignee' object if the backend provides it for display purposes
  // assignee?: IUser | null; // Example if backend sends full assignee object
  created_at: string;
  updated_at: string;
  due_date?: string;
  is_from_email?: boolean;
  email_info?: EmailInfo;
  // Add the body field based on backend schema
  body?: {
    email_body?: string | null;
  } | null;
  category_id?: number | null; // Add category_id
  category?: ICategory | null; // Add category object
  workspace_id: number; // Añadido workspace_id
}

// Interfaz para crear tickets
// Note: Create/Update interfaces might still use IDs
export interface ICreateTicket {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  user_id: number;
  assignee_id?: number; // ID of user/agent to assign
  team_id?: number;
  category_id?: number | null; // Add category_id
  sent_from_id?: number; // Keep ID for creation if backend expects ID
  due_date?: string;
}

// Interfaz para actualizar tickets
export interface IUpdateTicket {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  user_id?: number;
  assignee_id?: number; // ID of user/agent to assign
  team_id?: number;
  category_id?: number | null; // Add category_id
  due_date?: string;
}

// Interfaz para filtrar tickets
export interface IGetTicket extends BaseFilters {
  id?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  user_id?: number;
  assignee_id?: number; // Filter by assigned user/agent ID
  team_id?: number;
  category_id?: number | null; // Add category_id filter
}
