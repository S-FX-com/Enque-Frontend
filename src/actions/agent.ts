"use server";

import { PlatformConfigs } from "@/configs";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { agentService } from "@/services/agent";
import { FormState } from "@/typescript";
import { ICreateAgent } from "@/typescript/agent";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type CreateAgentFormState = FormState<ICreateAgent>;

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
	const name = formData.get("name") as string;
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const workspace_id = formData.get("workspace_id") as string;
	const confirmPassword = formData.get("confirmPassword");

	const validation = CreateAgentSchema.safeParse({ name, email, password, confirmPassword, workspace_id });
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };

	const response = await agentService.createAgent({ name, email, password, workspace_id });
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
