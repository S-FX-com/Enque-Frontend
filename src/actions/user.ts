"use server";

import { PlatformConfigs } from "@/configs";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { ticketService } from "@/services/ticket";
import { userService } from "@/services/user";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type CreateUserFormState = {
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

const CreateUserSchema = z.object({});

export async function CreateUser(prevState: CreateUserFormState, formData: FormData) {
	const title = formData.get("title") as string;

	const values = {
		title,
	};

	const validation = CreateUserSchema.safeParse(values);
	if (!validation.success)
		return {
			success: false,
			errors: validation.error.flatten().fieldErrors,
			values,
		};

	try {
		const response = await userService.createUser(values);
		if (!response.success)
			return {
				success: false,
				errors: {
					_form: [response.message || "Failed to create user"],
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
