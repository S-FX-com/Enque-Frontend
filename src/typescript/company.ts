import { IWorkspace } from "./workspace";

export interface ICompany {
	name: string;
	description: string;
	logo_url: string;
	email_domain: string;
	id: number;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateCompany = Pick<ICompany, "name" | "description" | "logo_url" | "email_domain"> & {
	workspace_id: number;
};

export type IUpdateCompany = Pick<ICompany, "name" | "description" | "logo_url" | "email_domain">;
