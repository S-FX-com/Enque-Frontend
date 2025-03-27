"use server";

import { PlatformConfigs } from "@/configs";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { workspaceService } from "@/services/workspace";
import { ServiceResponse } from "@/typescript";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type GoToWorkspaceFormState = {
	success?: boolean;
	errors?: {
		local_subdomain?: string[];
		_form?: string[];
	};
	message?: string;
};

/**  */
const GoToWorkspaceSchema = z.object({
	local_subdomain: z.string().min(1, "Subdomain is required"),
});

/** Select workspace */
export async function GoToWorkspace(prevState: GoToWorkspaceFormState, formData: FormData) {
	const local_subdomain = formData.get("local_subdomain") as string;

	const validation = GoToWorkspaceSchema.safeParse({ local_subdomain });
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };

	const response = await workspaceService.getWorkspace({ local_subdomain });
	if (!response.success)
		return {
			errors: {
				_form: [response.message],
			},
		};

	redirect(PlatformConfigs.url(response.data?.local_subdomain));
}

/** Get workspace */
export async function GetWorkspace(): Promise<ServiceResponse<any>> {
	const headersList = await headers();
	const host = headersList.get("host");
	if (!host) return redirect(PlatformConfigs.url() + "/workspace");

	const response = await workspaceService.getWorkspace({ local_subdomain: getLocalSubdomainByHost(host as string) });
	if (!response.success) return redirect(PlatformConfigs.url() + "/workspace");

	return response;
}
