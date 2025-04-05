import { IWorkspace } from "./workspace";

export interface ICompany {
	name: string;
	logo_url: string;
	email_domain: string;
	id: number;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export interface ICreateCompany {}

export interface IUpdateCompany {}
