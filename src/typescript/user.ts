import { ICompany } from "./company";
import { IWorkspace } from "./workspace";

export interface IUser {
	name: string;
	email: string;
	phone: string;
	id: number;
	company: ICompany | null;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export interface ICreateUser {}

export interface IUpdateUser {}

export type IGetUser = Pick<IUser, "name" | "email" | "phone"> & {
	company_id: number | null;
	workspace_id: number;
};
