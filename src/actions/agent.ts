"use server";

import { PlatformConfigs } from "@/configs";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { agentService } from "@/services/agent";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type CreateAgentFormState = {
	success?: boolean;
	errors?: {
		name?: string[];
		email?: string[];
		password?: string[];
		confirmPassword?: string[];
		_form?: string[];
	};
	message?: string;
};

/** Validation scheme to create a agent */
const CreateAgentSchema = z
	.object({
		name: z.string().min(3, "Name must be at least 3 characters long"),
		email: z.string().email("Email address is invalid"),
		password: z.string().min(8, "Password must be at least 8 characters long"),
		confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters long"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

/** Create agent */
export async function CreateAgent(prevState: CreateAgentFormState, formData: FormData) {
	const name = formData.get("name");
	const email = formData.get("email");
	const password = formData.get("password");
	const confirmPassword = formData.get("confirmPassword");

	const validation = CreateAgentSchema.safeParse({ name, email, password, confirmPassword });
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };

	const response = await agentService.createAgent({ name, email, password });
	if (!response.success)
		return {
			errors: {
				_form: [response.message],
			},
		};

	const headersList = await headers();
	const host = headersList.get("host");

	redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");
}
