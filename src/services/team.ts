import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { ITeam, ICreateTeam, IUpdateTeam, IGetTeam } from "@/typescript/team";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/teams`;

export const teamService = {
	/** */
	async getTeam(paramsObj: ITeam): Promise<ServiceResponse<ITeam>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<ITeam[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "Team not found" };
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
	async getTeams(paramsObj: Partial<IGetTeam>): Promise<ServiceResponse<ITeam[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<ITeam[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
