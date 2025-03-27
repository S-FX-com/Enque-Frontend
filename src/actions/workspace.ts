"use server";

import { PlatformConfigs } from "@/configs";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { workspaceService } from "@/services/workspace";
import { ServiceResponse } from "@/typescript";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/** Get workspace */
export async function GetWorkspace(): Promise<ServiceResponse<any>> {
	const headersList = await headers();
	const host = headersList.get("host");
	if (!host) return redirect(PlatformConfigs.url() + "/workspace");

	const response = await workspaceService.getWorkspace({ local_subdomain: getLocalSubdomainByHost(host as string) });
	if (!response.success) return redirect(PlatformConfigs.url() + "/workspace");

	return response;
}
