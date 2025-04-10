"use server";

import { userService } from "@/services/user";
import { FormState } from "@/typescript";
import { ICreateUser } from "@/typescript/user";
import { z } from "zod";

export type CreateUserFormState = FormState<ICreateUser>;

/** Create user - Schema */
const CreateUserSchema = z.object({
	name: z.string(),
	email: z.string().email(),
	phone: z.string(),
	company_id: z.number(),
	workspace_id: z.number(),
});

/** Create user - Action */
export async function CreateUser(prevState: CreateUserFormState, formData: FormData) {
	const name = formData.get("name") as any;
	const email = formData.get("email") as any;
	const phone = formData.get("phone") as any;
	const company_id = (formData.get("company_id") ? Number(formData.get("company_id")) : undefined) as any;
	const workspace_id = (formData.get("workspace_id") ? Number(formData.get("workspace_id")) : undefined) as any;

	const values = { name, email, phone, company_id, workspace_id };

	const validation = CreateUserSchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await userService.createUser(values);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
			values,
		};

	return { success: true, message: "User successfully created" };
}
