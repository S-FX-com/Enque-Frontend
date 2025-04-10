"use server";

import { companyService } from "@/services/company";
import { FormState } from "@/typescript";
import { ICreateCompany, IDeleteCompany, IUpdateCompany } from "@/typescript/company";
import { z } from "zod";

export type CreateCompanyFormState = FormState<ICreateCompany>;

export type UpdateCompanyFormState = FormState<IUpdateCompany>;

export type DeleteCompanyFormState = FormState<IDeleteCompany>;

/** Create company - Schema */
const CreateCompanySchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	logo_url: z.string().optional(),
	email_domain: z.string(),
	workspace_id: z.string(),
});

/** Create company - Action */
export async function CreateCompany(prevState: CreateCompanyFormState, formData: FormData): Promise<CreateCompanyFormState> {
	const name = formData.get("name") as any;
	const description = formData.get("description") as any;
	const logo_url = (formData.get("logo_url") ? formData.get("logo_url") : undefined) as any;
	const email_domain = formData.get("email_domain") as any;
	const workspace_id = (formData.get("workspace_id") ? Number(formData.get("workspace_id")) : undefined) as any;

	const values = { name, description, logo_url, email_domain, workspace_id };

	const validation = CreateCompanySchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await companyService.createCompany(values);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
			values,
		};

	return { success: true, message: "Company successfully created" };
}

/** Update company - Schema */
const UpdateCompanySchema = z.object({
	name: z.string(),
	description: z.string(),
	logo_url: z.string(),
	email_domain: z.string(),
});

/** Update company - Action */
export async function UpdateCompany(prevState: UpdateCompanyFormState, formData: FormData): Promise<UpdateCompanyFormState> {
	const company_id = (formData.get("company_id") ? Number(formData.get("company_id")) : undefined) as any;
	const name = formData.get("name") as any;
	const description = formData.get("description") as any;
	const logo_url = (formData.get("logo_url") ? formData.get("logo_url") : undefined) as any;
	const email_domain = formData.get("email_domain") as any;

	const values = { name, description, logo_url, email_domain };

	const validation = UpdateCompanySchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await companyService.updateCompanyById(company_id, values);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
			values,
		};

	return { success: true, message: "Company successfully updated" };
}

/** Delete company - Action */
export async function DeleteCompany(prevState: DeleteCompanyFormState, formData: FormData): Promise<DeleteCompanyFormState> {
	const company_id = Number(formData.get("company_id"));

	const response = await companyService.deleteCompanyById(company_id);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
		};

	return { success: true, message: "Company successfully deleted" };
}
