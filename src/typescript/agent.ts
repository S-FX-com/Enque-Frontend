import { ICompany } from "./company";

export type AgentRole = "Agent";

export interface IAgent {
	id: 0;
	name: string;
	username: string;
	email: string;
	role: AgentRole;
	is_active: true;
	company: ICompany;
	created_at: string;
	updated_at: string;
}

export interface ICreateAgent {}
