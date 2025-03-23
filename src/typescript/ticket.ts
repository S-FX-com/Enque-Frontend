import { IAgent } from "./agent";
import { ICompany } from "./company";

export type TicketStatus = "Pending" | "In progress" | "Completed";
export type TicketPriority = "High" | "Medium" | "Low";

export interface ITicket {
	id: 0;
	title: string;
	description: string;
	status: TicketStatus;
	priority: TicketPriority;
	due_date: string;
	company: ICompany;
	sent_from: IAgent;
	sent_to: IAgent | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}
