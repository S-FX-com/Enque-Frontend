import { IWorkspace } from "./workspace";

export type AgentRole = "Agent";

export interface IAgent {
	name: string;
	email: string;
	role: AgentRole;
	is_active: boolean;
	id: number;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateAgent = Pick<IAgent, "name" | "email"> & {
	password: string;
	workspace_id: number;
};

export type IUpdateAgent = Pick<IAgent, "name" | "email" | "role" | "is_active"> & {
	password: string;
	workspace_id: number;
};
