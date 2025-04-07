"use server";

import { userService } from "@/services/user";
import { FormState } from "@/typescript";
import { ICreateUser } from "@/typescript/user";
import { z } from "zod";

export type CreateUserFormState = FormState<ICreateUser>;

/** Create user - Schema */
const CreateUserSchema = z.object({});

/** Create user - Action */
export async function CreateUser(prevState: CreateUserFormState, formData: FormData) {
	const title = formData.get("title") as string;

	const values = { title };

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
