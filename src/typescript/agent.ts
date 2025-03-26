import { IWorkspace } from "./workspace";

export type AgentRole = "Agent";

export interface IAgent {
	name: string;
	username: string;
	email: string;
	role: AgentRole;
	is_active: boolean;
	id: 0;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export interface ICreateAgent {}

export interface IUpdateAgent {}
