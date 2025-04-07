import { IWorkspace } from "./workspace";

export interface ITeam {
	name: string;
	description: string;
	logo_url: string;
	id: number;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateTeam = {};

export type IUpdateTeam = {};

export type IGetTeam = Pick<ITeam, "name" | "description" | "logo_url"> & {
	workspace_id: number;
};
