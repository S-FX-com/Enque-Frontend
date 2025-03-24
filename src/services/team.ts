import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { ITeam } from "@/typescript/team";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/teams`;

export const teamService = {
	/** */
	async getTeams(paramsObj: any): Promise<ServiceResponse<ITeam[]>> {
		try {
			const data = await fetchAPI.GET<ITeam[]>(`${SERVICE_ENDPOINT}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
