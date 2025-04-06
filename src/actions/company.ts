"use server";

import { companyService } from "@/services/company";
import { FormState } from "@/typescript";
import { ICreateCompany, IUpdateCompany } from "@/typescript/company";
import { z } from "zod";

export type CreateCompanyFormState = FormState<ICreateCompany>;

const CreateCompanySchema = z.object({});

export async function CreateCompany(prevState: CreateCompanyFormState, formData: FormData): Promise<CreateCompanyFormState> {
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

export type UpdateCompanyFormState = FormState<IUpdateCompany>;

const UpdateCompanySchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Company name is required"),
	emailDomain: z.string().optional(),
	description: z.string().max(150, "Description cannot exceed 150 characters").optional(),
	primaryContact: z.string().optional(),
	accountManager: z.string().optional(),
});

export async function UpdateCompany(prevState: UpdateCompanyFormState, formData: FormData): Promise<UpdateCompanyFormState> {
	// Extract data from the form
	const id = formData.get("id") as string;
	const name = formData.get("name") as string;
	const emailDomain = formData.get("emailDomain") as string;
	const description = formData.get("description") as string;
	const primaryContact = formData.get("primaryContact") as string;
	const accountManager = formData.get("accountManager") as string;

	// Validate the data
	const validationResult = UpdateCompanySchema.safeParse({
		id,
		name,
		emailDomain,
		description,
		primaryContact,
		accountManager,
	});

	// If validation fails, return errors
	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		return {
			errors: {
				...errors,
				_form: errors._errors,
			},
			values: {
				id,
				name,
				emailDomain,
				description,
				primaryContact,
				accountManager,
			},
		};
	}

	try {
		// Here you would update the company in your database
		// For example: await db.company.update({ where: { id }, data: { ... } })

		// For now, we'll just simulate a successful update
		console.log("Updating company:", validationResult.data);

		// Return success
		return {
			values: {
				id,
				name,
				emailDomain,
				description,
				primaryContact,
				accountManager,
			},
			success: true,
			message: "Company updated successfully",
		};
	} catch (error) {
		console.error("Error updating company:", error);
		return {
			errors: {
				_form: ["An unexpected error occurred while updating the company."],
			},
			values: {
				id,
				name,
				emailDomain,
				description,
				primaryContact,
				accountManager,
			},
		};
	}
}

export type DeleteCompanyFormState = FormState<IDeleteCompany>;

const DeleteCompanySchema = z.object({
	id: z.string(),
});

export async function DeleteCompany(prevState: DeleteCompanyFormState, formData: FormData): Promise<DeleteCompanyFormState> {
	// Extract company ID from the form
	const id = formData.get("id") as string;

	// Validate the ID
	const validationResult = DeleteCompanySchema.safeParse({ id });

	// If validation fails, return errors
	if (!validationResult.success) {
		const errors = validationResult.error.flatten().fieldErrors;
		return {
			errors: {
				...errors,
				_form: errors._errors,
			},
		};
	}

	try {
		// Here you would delete the company from your database
		// For example: await db.company.delete({ where: { id } })

		// For now, we'll just simulate a successful deletion
		console.log("Deleting company with ID:", id);

		// Return success
		return {
			success: true,
			message: "Company deleted successfully",
		};
	} catch (error) {
		console.error("Error deleting company:", error);
		return {
			errors: {
				_form: ["An unexpected error occurred while deleting the company."],
			},
		};
	}
}
