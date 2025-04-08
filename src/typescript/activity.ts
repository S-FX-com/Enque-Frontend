import { IAgent } from "./agent";
import { ICompany } from "./company";
import { ITeam } from "./team";
import { ITicket } from "./ticket";
import { IUser } from "./user";
import { IWorkspace } from "./workspace";

export type ActivitySourceTypes = "Workspace" | "Ticket" | "Team" | "Company" | "User";
export type ActivitySource = IWorkspace | ITicket | ITeam | ICompany | IUser;

export interface IActivity {
	action: string;
	id: number;
	agent: IAgent;
	source_type: ActivitySourceTypes;
	source: ActivitySource;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateActivity = Pick<IActivity, "action" | "agent" | "source_type"> & {
	source_id: number;
	workspace_id: number;
};

export type IUpdateActivity = Pick<IActivity, "action" | "agent" | "source_type"> & {
	source_id: number;
	workspace_id: number;
};
