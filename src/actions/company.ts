"use server";

import { companyService } from "@/services/company";
import { z } from "zod";

export type CreateCompanyFormState = {
	success?: boolean;
	errors?: {
		title?: string[];
		_form?: string[];
	};
	message?: string;
	values?: {
		title?: string;
	};
};

const CreateCompanySchema = z.object({});

export async function CreateCompany(prevState: CreateCompanyFormState, formData: FormData) {
	const title = formData.get("title") as string;

	const values = {
		title,
	};

	const validation = CreateCompanySchema.safeParse(values);
	if (!validation.success)
		return {
			success: false,
			errors: validation.error.flatten().fieldErrors,
			values,
		};

	try {
		const response = await companyService.createCompany(values);
		if (!response.success)
			return {
				success: false,
				errors: {
					_form: [response.message || "Failed to create company"],
				},
				values,
			};

		return {
			success: true,
		};
	} catch (error) {
		return {
			success: false,
			errors: {
				_form: ["An unexpected error occurred. Please try again."],
			},
			values,
		};
	}
}
