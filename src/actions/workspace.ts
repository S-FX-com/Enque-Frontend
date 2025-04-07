"use server";

import { PlatformConfigs } from "@/configs";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { workspaceService } from "@/services/workspace";
import { FormState, ServiceResponse } from "@/typescript";
import { IWorkspace } from "@/typescript/workspace";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type GoToWorkspaceFormState = FormState<{ local_subdomain: string }>;

/** Select workspace - Schema */
const GoToWorkspaceSchema = z.object({
	local_subdomain: z.string().min(1, "Subdomain is required"),
});

/** Select workspace - Action */
export async function GoToWorkspace(prevState: GoToWorkspaceFormState, formData: FormData): Promise<GoToWorkspaceFormState> {
	const local_subdomain = formData.get("local_subdomain") as string;

	const values = { local_subdomain };

	const validation = GoToWorkspaceSchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await workspaceService.getWorkspace(values);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
			values,
		};

	redirect(PlatformConfigs.url(response.data?.local_subdomain));
}

/** Get workspace */
export async function GetWorkspace(): Promise<ServiceResponse<IWorkspace>> {
	const headersList = await headers();
	const host = headersList.get("host");
	if (!host) return redirect(PlatformConfigs.url() + "/workspace");

	const response = await workspaceService.getWorkspace({ local_subdomain: getLocalSubdomainByHost(host as string) });
	if (!response.success) return redirect(PlatformConfigs.url() + "/workspace");

	return response;
}
