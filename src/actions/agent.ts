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

/** Create agent - Schema */
const CreateAgentSchema = z.object({
	name: z.string().min(3, "Name must be at least 3 characters long"),
	email: z.string().email("Email address is invalid"),
	password: z.string().min(8, "Password must be at least 8 characters long"),
});

/** Create agent - Action */
export async function CreateAgent(prevState: CreateAgentFormState, formData: FormData): Promise<CreateAgentFormState> {
	const name = formData.get("name") as string;
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const workspace_id = formData.get("workspace_id") as unknown as number;

	const values = { name, email, password, workspace_id };

	const validation = CreateAgentSchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await agentService.createAgent(values);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
			values,
		};

	const headersList = await headers();
	const host = headersList.get("host");

	redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");
}
