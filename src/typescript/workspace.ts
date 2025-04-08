export interface IWorkspace {
	name: string;
	local_subdomain: string;
	email_domain: string;
	logo_url: string | null;
	id: number;
	created_at: string;
	updated_at: string;
}

export type ICreateWorkspace = Pick<IWorkspace, "name" | "local_subdomain" | "email_domain" | "logo_url"> & {};

export type IUpdateWorkspace = Pick<IWorkspace, "name" | "local_subdomain" | "email_domain" | "logo_url"> & {};
