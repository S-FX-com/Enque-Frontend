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
	due_date: Date;
	company: ICompany;
	sent_from: IAgent;
	sent_to: IAgent | null;
	created_at: Date;
	updated_at: Date;
	deleted_at: Date | null;
}
