"use server";

import { companyService } from "@/services/company";
import { FormState } from "@/typescript";
import { ICreateCompany, IUpdateCompany } from "@/typescript/company";
import { z } from "zod";

export type CreateCompanyFormState = FormState<ICreateCompany>;

export type UpdateCompanyFormState = FormState<IUpdateCompany>;

export type DeleteCompanyFormState = FormState<IDeleteCompany>;

/** Create company - Schema */
const CreateCompanySchema = z.object({
	name: z.string(),
	logo_url: z.string(),
	email_domain: z.string(),
	workspace_id: z.string(),
});

/** Create company - Action */
export async function CreateCompany(prevState: CreateCompanyFormState, formData: FormData): Promise<CreateCompanyFormState> {
	const name = formData.get("name") as string;
	const logo_url = formData.get("logo_url") as string;
	const email_domain = formData.get("email_domain") as string;
	const workspace_id = formData.get("workspace_id") as unknown as number;

	const values = { name, logo_url, email_domain, workspace_id };

	const validation = CreateCompanySchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await companyService.createCompany(values);
	if (!response.success)
		return {
			success: false,
			errors: {
				_form: [response.message as string],
			},
			values,
		};

	return {
		success: true,
	};
}

/** Update company - Schema */
const UpdateCompanySchema = z.object({});

/** Update company - Action */
export async function UpdateCompany(prevState: UpdateCompanyFormState, formData: FormData): Promise<UpdateCompanyFormState> {
	const id = formData.get("id") as string;

	const values = { id };

	const validation = UpdateCompanySchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await companyService.createCompany(values);
	if (!response.success)
		return {
			success: false,
			errors: {
				_form: [response.message as string],
			},
			values,
		};

	return { success: true };
}

/** Delete company - Schema */
const DeleteCompanySchema = z.object({
	company_id: z.number(),
});

/** Delete company - Action */
export async function DeleteCompany(prevState: DeleteCompanyFormState, formData: FormData): Promise<DeleteCompanyFormState> {
	const company_id = formData.get("company_id") as unknown as number;

	const values = { company_id };

	const validation = DeleteCompanySchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await companyService.deleteCompanyById(values.company_id);
	if (!response.success)
		return {
			success: false,
			errors: {
				_form: [response.message as string],
			},
			values,
		};

	return { success: true };
}
