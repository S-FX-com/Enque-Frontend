import { ICompany } from "./company";
import { IWorkspace } from "./workspace";

export interface IUser {
	name: string;
	email: string;
	phone: string | null;
	id: number;
	company: ICompany | null;
	workspace: IWorkspace;
	created_at: string;
	updated_at: string;
}

export type ICreateUser = Pick<IUser, "name" | "email" | "phone"> & {
	company_id: number;
	workspace_id: number;
};

export type IUpdateUser = Pick<IUser, "name" | "email" | "phone"> & {};

export type IGetUser = Pick<IUser, "name" | "email" | "phone"> & {
	company_id: number | null;
	workspace_id: number;
};
