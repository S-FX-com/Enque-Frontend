import { BaseFilters } from './index';
import { IUser } from './user';
import { ICategory } from './category';
export type TicketStatus = 'Unread' | 'Open' | 'With User' | 'In Progress' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TicketType = 'bug' | 'feature' | 'support' | 'other';

export interface EmailInfo {
  id: number;
  email_id: string;
  email_conversation_id: string;
  email_subject: string;
  email_sender: string;
  email_received_at: string;
}
export interface ITicket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  to_recipients: string;
  cc_recipients: string;
  bcc_recipients: string;
  user_id: number | null;
  user?: IUser | null;
  assignee_id?: number;
  team_id?: number;
  sent_from?: IUser | null;
  last_update: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  is_from_email?: boolean;
  email_info?: EmailInfo;
  body?: {
    email_body?: string | null;
  } | null;
  category_id?: number | null;
  category?: ICategory | null;
  workspace_id: number;
}
export interface ICreateTicket {
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  user_id: number;
  assignee_id?: number;
  team_id?: number;
  category_id?: number | null;
  sent_from_id?: number;
  due_date?: string;
}
export interface IUpdateTicket {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  user_id?: number;
  assignee_id?: number;
  team_id?: number;
  category_id?: number | null;
  due_date?: string;
}
export interface IGetTicket extends BaseFilters {
  id?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  user_id?: number;
  assignee_id?: number;
  team_id?: number;
  category_id?: number | null;
  company_id?: number;
  subject?: string;
  // Multi-value filters (comma-separated strings)
  statuses?: string;
  priorities?: string;
  assignee_ids?: string;
  user_ids?: string;
  team_ids?: string;
  category_ids?: string;
  company_ids?: string;
  // Sorting
  sort_by?: 'status' | 'priority' | 'created_at' | 'updated_at' | 'last_update';
  order?: 'asc' | 'desc';
}
