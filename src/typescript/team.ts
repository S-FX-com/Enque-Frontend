import { IWorkspace } from "./workspace";

export interface ITeam {
	name: string;
	description: string | null;
	logo_url: string | null;
	id: number;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateTeam = Pick<ITeam, "name" | "description" | "logo_url"> & {
	workspace_id: number;
};

export type IUpdateTeam = Pick<ITeam, "name" | "description" | "logo_url"> & {};

export type IGetTeam = Pick<ITeam, "name" | "description" | "logo_url"> & {
	workspace_id: number;
};
