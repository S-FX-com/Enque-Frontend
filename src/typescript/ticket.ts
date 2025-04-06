import { IAgent } from "./agent";
import { ICompany } from "./company";
import { ITeam } from "./team";
import { IUser } from "./user";
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
	team: ITeam;
	company: ICompany;
	user: IUser;
	sent_from: IAgent;
	sent_to: IAgent | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
}

export type IGetTicket = Pick<ITicket, "title" | "description" | "status" | "priority" | "due_date" | "id" | "created_at" | "updated_at" | "deleted_at"> & {
	workspace_id: number;
	team_id: number;
	company_id: number;
	user_id: number;
	sent_from_id: number;
	sent_to_id: number;
};

export interface ICreateTicket {}

export interface IUpdateTicket {}
