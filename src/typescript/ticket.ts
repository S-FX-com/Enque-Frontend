import { IAgent } from "./agent";
import { IWorkspace } from "./workspace";

export type TicketStatus = "Pending" | "In progress" | "Completed";
export type TicketPriority = "High" | "Medium" | "Low";

export interface ITicket {
	title: string;
	description: string;
	status: TicketStatus;
	priority: TicketPriority;
	due_date: string;
	id: 0;
	workspace: IWorkspace;
	sent_from: IAgent;
	sent_to: IAgent | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export interface ICreateTicket {}

export interface IUpdateTicket {}
