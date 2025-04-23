// Based on backend/app/schemas/task.py TicketInDBBase (aliased as Task)

export enum TaskStatus {
    UNREAD = "Unread",
    OPEN = "Open",
    CLOSED = "Closed",
}

export enum TaskPriority {
    LOW = "Low",
    MEDIUM = "Medium",
    HIGH = "High",
}

export interface Task {
    id: number;
    title: string;
    description?: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    assignee_id?: number | null;
    team_id?: number | null;
    due_date?: string | null; // Representing datetime as string
    sent_from_id?: number | null;
    sent_to_id?: number | null;
    user_id: number;
    company_id?: number | null;
    workspace_id: number;
    created_at: string; // Representing datetime as string
    updated_at: string; // Representing datetime as string
    deleted_at?: string | null; // Representing datetime as string
    // Fields from Ticket might also be present depending on the exact endpoint return
    is_from_email?: boolean;
    email_info?: EmailInfo | null; // Use defined EmailInfo interface
}

// Interface for Email Info (based on backend schema)
export interface EmailInfo {
    id: number;
    email_id: string;
    email_conversation_id?: string | null;
    email_subject?: string | null;
    email_sender?: string | null;
    email_received_at?: string | null; // Representing datetime as string
}

// Interface for creating a task (based on TicketCreate)
export interface TaskCreate {
    title: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee_id?: number | null;
    team_id?: number | null;
    due_date?: string | null;
    sent_from_id?: number | null;
    sent_to_id?: number | null;
    user_id: number;
    company_id?: number | null;
    workspace_id: number;
}

// Interface for updating a task (based on TicketUpdate)
export interface TaskUpdate {
    title?: string | null;
    description?: string | null;
    status?: TaskStatus | null;
    priority?: TaskPriority | null;
    assignee_id?: number | null;
    company_id?: number | null;
    due_date?: string | null;
    team_id?: number | null;
}
