import { IAgent } from "./agent";
import { ICompany } from "./company";
import { ITeam } from "./team";
import { IUser } from "./user";
import { IWorkspace } from "./workspace";

export type TicketStatus = "Unread" | "Read" | "Closed";
export type TicketPriority = "High" | "Medium" | "Low";

export interface ITicket {
	title: string;
	description: string;
	status: TicketStatus;
	priority: TicketPriority;
	due_date: string | null;
	id: 0;
	workspace: IWorkspace;
	team: ITeam | null;
	company: ICompany | null;
	user: IUser;
	sent_from: IAgent | null;
	sent_to: IAgent | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export type ICreateTicket = Pick<ITicket, "title" | "description" | "status" | "priority" | "due_date"> & {
	workspace_id: number;
	team_id: number | null;
	company_id: number | null;
	user_id: number;
	sent_from_id: number;
	sent_to_id: number;
};

export type IUpdateTicket = Pick<ITicket, "title" | "description" | "status" | "priority" | "due_date"> & {
	team_id: number | null;
	company_id: number | null;
	user_id: number;
	sent_from_id: number;
	sent_to_id: number;
};

export type IGetTicket = Pick<ITicket, "title" | "description" | "status" | "priority" | "due_date"> & {
	workspace_id: number;
	team_id: number;
	company_id: number | null;
	user_id: number;
	sent_from_id: number;
	sent_to_id: number;
};
