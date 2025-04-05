import { IWorkspace } from "./workspace";

export interface ITeam {
	name: string;
	description: string;
	id: number;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export interface ICreateTeam {}

export interface IUpdateTeam {}
