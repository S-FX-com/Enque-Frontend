import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { ITeam, ICreateTeam, IUpdateTeam } from "@/typescript/team";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/teams`;

export const teamService = {
	/** */
	async getTeam(paramsObj: ITeam): Promise<ServiceResponse<ITeam>> {
		try {
			const data = await fetchAPI.GET<ITeam>(`${SERVICE_ENDPOINT}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createTeam(dataToCreate: ICreateTeam): Promise<ServiceResponse<ITeam>> {
		try {
			const data = await fetchAPI.POST<ITeam>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateTeamById(team_id: number, dataToUpdate: IUpdateTeam): Promise<ServiceResponse<ITeam>> {
		try {
			const data = await fetchAPI.PUT<ITeam>(`${SERVICE_ENDPOINT}/${team_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteTeamById(team_id: number): Promise<ServiceResponse<ITeam>> {
		try {
			const data = await fetchAPI.DELETE<ITeam>(`${SERVICE_ENDPOINT}/${team_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getTeams(paramsObj: ITeam): Promise<ServiceResponse<ITeam[]>> {
		try {
			const data = await fetchAPI.GET<ITeam[]>(`${SERVICE_ENDPOINT}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
