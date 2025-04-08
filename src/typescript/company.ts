import { IWorkspace } from "./workspace";

export interface ICompany {
	name: string;
	description: string | null;
	logo_url: string | null;
	email_domain: string;
	id: number;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateCompany = Pick<ICompany, "name" | "description" | "logo_url" | "email_domain"> & {
	workspace_id: number;
};

export type IUpdateCompany = Pick<ICompany, "name" | "description" | "logo_url" | "email_domain"> & {};

export type IDeleteCompany = {
	company_id: number;
};

export type IGetCompany = Pick<ICompany, "name" | "description" | "logo_url" | "email_domain"> & {
	workspace_id: number;
};
